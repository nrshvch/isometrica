import engine from "engine";
import Server from "../core/server";
import Mirror from "../core/mirror";

/**
 * Where the world runs, for the client: one interface, two hosts. Both take
 * what the player does as commands (core/commands) and hand back the world
 * moved on through frames (shared/replica) played by a copy the client
 * reads (core/mirror) - in the page (InThread: the server's world is the
 * copy, so nothing is played twice), or on a worker (OnWorker: the world
 * there, the page's a copy following its frames). See
 * isometrica/.claude/skills/buildings/server.md.
 *
 *   host.frame(ms)                  every frame, real ms since the last
 *   host.command(c, done)           done(result): at once in the page, a
 *                                   frame later from a worker
 */

//the main thread's ms a frame on the world: moving it on in the page, or
//playing the worker's frames (engine Stats)
var WORLD = engine.Stats.section("world");

function counts() {
  return {
    //ms on the main thread, frames played, bytes of them
    ms: 0,
    frames: 0,
    bytes: 0,
    //commands answered, and ms from sent to answered, summed and the last
    commands: 0,
    latency: 0,
    last: 0,
  };
}

/**
 * The world in the page: a server on it (core/server), and the copy the
 * client reads the very same world.
 *
 * @param world {Logic} opened, or to be
 */
export function InThread(world) {
  this.world = world;
  this.inThread = true;
  this.server = new Server(world);
  this.mirror = new Mirror(world, true);
  this.ids = 0;
  this.stats = counts();
}

InThread.prototype.open = function () {
  flush(this);
};

function flush(self) {
  var bytes = self.server.flush();

  if (bytes === null) return;
  self.stats.frames++;
  self.stats.bytes += bytes.length;
  self.mirror.apply(bytes);
}

InThread.prototype.frame = function (ms) {
  var t = performance.now();

  engine.Stats.begin(WORLD);
  this.server.run(ms);
  flush(this);
  engine.Stats.end(WORLD);
  this.stats.ms += performance.now() - t;
};

InThread.prototype.command = function (command, done) {
  var id = ++this.ids,
    result = this.server.receive(JSON.stringify(command), id);

  flush(this);
  this.stats.commands++;
  if (done) done(result);

  return result;
};

InThread.prototype.pause = function () {
  this.server.pause();
  flush(this);
};

InThread.prototype.resume = function () {
  this.server.resume();
  flush(this);
};

//whether the copy is the server's world: here, always
InThread.prototype.check = function () {
  return Promise.resolve({ same: true, version: this.server.version });
};

/**
 * The world on a worker (core/serve): the page's world a copy that plays
 * its frames as they come; its saves written here, where the storage is.
 *
 * @param world {Logic} the page's, opened (CityPersistence#open) before
 *        #open
 * @param options {Object} what the world was made with (Logic options):
 *        the worker's is made the same
 */
export function OnWorker(world, options) {
  var self = this;

  this.world = world;
  this.inThread = false;
  this.options = options;
  this.mirror = new Mirror(world, false);
  this.ids = 0;
  this.checks = new Map();
  this.stats = counts();

  this.worker = new Worker(new URL("./server.worker.js", import.meta.url), {
    type: "module",
  });
  this.worker.onmessage = function (e) {
    receive(self, e.data);
  };
  this.worker.onerror = function (e) {
    console.error("The world's worker:", e.message || e);
  };

  //how the player looks at the city goes into its saves, made there
  var persistence = world.persistence,
    setView = persistence.setView;

  persistence.setView = function (view) {
    setView.call(persistence, view);
    self.worker.postMessage({ type: "view", view: view });
  };
}

function receive(self, m) {
  switch (m.type) {
    case "frame":
      var t = performance.now();

      engine.Stats.begin(WORLD);
      self.mirror.apply(m.bytes);
      engine.Stats.end(WORLD);
      self.stats.ms += performance.now() - t;
      self.stats.frames++;
      self.stats.bytes += m.bytes.byteLength;
      break;
    case "save":
      self.world.persistence.writeBatch(m.batch);
      break;
    case "check":
      var done = self.checks.get(m.id);

      self.checks.delete(m.id);
      if (done) done(m);
      break;
  }
}

OnWorker.prototype.open = function () {
  var persistence = this.world.persistence,
    options = Object.assign({}, this.options);

  //what only the page has: its storage, its server
  delete options.storage;
  delete options.api;
  delete options.now;
  delete options.initialCity;
  this.worker.postMessage({
    type: "open",
    options: options,
    opened: persistence.opened,
    view: persistence.view(),
  });
};

//the worker keeps its own time
OnWorker.prototype.frame = function () {};

OnWorker.prototype.command = function (command, done) {
  var self = this,
    id = ++this.ids,
    sent = performance.now();

  this.mirror.waiting.set(id, function (result) {
    var took = performance.now() - sent;

    self.stats.commands++;
    self.stats.latency += took;
    self.stats.last = took;
    if (done) done(result);
  });
  this.worker.postMessage({
    type: "command",
    id: id,
    text: JSON.stringify(command),
  });
};

OnWorker.prototype.pause = function () {
  this.worker.postMessage({ type: "pause" });
};

OnWorker.prototype.resume = function () {
  this.worker.postMessage({ type: "resume" });
};

/**
 * Whether the page's copy is the worker's world: both saved, the worker's
 * once every frame before has been played here.
 *
 * @returns {Promise<{same: boolean, version: number, ours: string,
 *          theirs: string}>}
 */
OnWorker.prototype.check = function () {
  var self = this,
    id = ++this.ids;

  return new Promise(function (resolve) {
    self.checks.set(id, function (m) {
      var data = self.world.persistence.snapshot();

      if (data !== null) delete data.savedAt;

      var ours = JSON.stringify(data);

      resolve({
        same: ours === m.save,
        version: m.version,
        played: self.mirror.replica.version,
        ours: ours,
        theirs: m.save,
      });
    });
    self.worker.postMessage({ type: "check", id: id });
  });
};

/**
 * No world to move on - a stage with only ground on it (lab bench/stage).
 */
export function Still() {
  this.inThread = true;
  this.stats = counts();
}

Still.prototype.open =
  Still.prototype.frame =
  Still.prototype.pause =
  Still.prototype.resume =
  Still.prototype.command =
    function () {};

export default { InThread: InThread, OnWorker: OnWorker, Still: Still };
