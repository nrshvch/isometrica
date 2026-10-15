//Gets the generated pictures - the ground, the cars, the stones - as they
//are wanted, and not before: whatever is about to draw one of them asks for
//it every frame it would be drawn (SpriteCache#want, which asks this).
//
//They are painted by a few generator workers (generator.worker,
//generatorcore), all alike - any of them paints anything - so painting never
//holds up a frame; until a picture comes back whatever draws it draws
//nothing - its size is known all along, from the build (see
//shared/gen/catalog). Nothing is kept between visits: painting a picture
//again takes a few milliseconds, off the main thread.
//
//What is asked for waits here, not in the workers: a worker is handed only
//so many at a time (IN_FLIGHT), the one wanted most lately first - what is on
//screen now, which asks every frame, before what was on screen a moment ago.
//So once the camera turns or moves on, what was asked for and is no longer
//drawn goes behind what is, and is let go of altogether once it has not been
//asked for for a while (STALE) - never painted for nothing.
//
//The pictures come back as pixels (client/pixels), never on the GPU, for
//them to be put together on the CPU and handed over to the pages of the
//canvas cache without a wait. They are kept here, but only so much of them:
//past LIMIT the ones used longest ago are let go of, and asked for again if
//they are wanted again - never one wanted just now, which may be waiting for
//the other parts of what it is a part of to come in.
//
//Where there is no worker - or none is left - the same core paints on the
//main thread instead.

//how many pictures a worker is handed at a time: one to paint, the next
//ready for it
var IN_FLIGHT = 2;
//how many frames a picture asked for may go without being asked again before
//it is let go of, unpainted; and how many frames one wanted is kept for
var STALE = 30,
  PIN = 2;
//pictures kept in memory at most, bytes - more while they are wanted
var LIMIT = 16e6;
//pictures painted ahead of being wanted - the other sides of the world than
//the one the camera is on (client/preloader) - kept apart from the rest, so
//as not to push out what is wanted now: so many pixels of them at most (4
//bytes each)
var STASH = 24e6;
//how long after a picture failed it may be asked for again, how long one
//waited for (load) is kept once it is in, in ms
var RETRY = 3000,
  HOLD = 5000;

/**
 * @param inputs {Object} every hand-drawn picture, by sprite name: {url, x, y,
 *        w, h} - for the generators that paint from them
 * @param [workers] {number} how many workers paint, by default one fewer than
 *        the cores there are, from one to four
 */
function Generator(inputs, workers) {
  this.inputs = inputs;
  this.limit = LIMIT;
  this.size = workers || defaultSize();
  //the workers, started the first time one is wanted: {post, busy, jobs}
  this.workers = null;
  //sheets asked for, by sprite name, in the order asked for first
  this.queue = new Map();
  //the latest frame anything was asked for in
  this.frame = 0;
  //sheets with a worker painting them, by name: {sheet, ahead, worker}
  this.painting = {};
  this.wantedPainting = 0;
  //sheets with their picture in memory, by sprite name, used longest ago
  //first, and how many bytes of it
  this.memory = new Map();
  this.bytes = 0;
  //how many pictures have come back
  this.painted = 0;
  //painted ahead (ahead): how many are being painted, and the sheets come
  //back, kept till wanted, used longest ago first, and how many pixels
  this.comingCount = 0;
  this.stash = new Map();
  this.stashed = 0;
}

function defaultSize() {
  var cores =
    (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 2;

  return Math.max(1, Math.min(4, cores - 1));
}

/**
 * Whether a generated sheet's picture is in - asking for it if it is not,
 * and keeping it if it is: a sheet wanted this frame is let go of last.
 *
 * @param sheet {Object} a SpriteCache sheet with generated: {name, gen, key}
 * @param frame {number} the frame it is wanted in
 */
Generator.prototype.want = function (sheet, frame) {
  if (frame > this.frame) this.frame = frame;
  sheet.wanted = frame;

  if (sheet.image !== null) {
    //painted ahead: wanted now
    if (sheet.stashed) {
      unstash(this, sheet);
      keep(this, sheet);
    }
    return true;
  }

  var name = sheet.generated.name,
    job = this.painting[name];

  //being painted ahead: wanted when it comes
  if (job !== undefined) {
    if (job.ahead) {
      job.ahead = false;
      this.comingCount--;
      this.wantedPainting++;
    }
    return false;
  }

  if (!this.queue.has(name) && !(sheet.retryAt > now())) {
    this.queue.set(name, sheet);
    pump(this);
  }

  return false;
};

/**
 * Asks for a generated sheet's picture, to be waited for - and kept a while
 * once it is in, for whatever waits for several to have them all.
 *
 * @returns {Promise} its picture
 */
Generator.prototype.load = function (sheet) {
  if (sheet.image !== null) {
    sheet.heldUntil = now() + HOLD;
    this.want(sheet, this.frame);
    return Promise.resolve(sheet.image);
  }

  var waited = new Promise(function (resolve, reject) {
    (sheet.waiters || (sheet.waiters = [])).push({
      resolve: resolve,
      reject: reject,
    });
  });

  //asked for now, however long ago it failed
  sheet.retryAt = 0;
  this.want(sheet, this.frame);

  return waited;
};

/**
 * Paints a sheet's picture ahead of its being wanted - kept apart, till it
 * is (want) - unless it is there or on its way already, or there is no room
 * left for it (STASH) or no worker free. Whether it asked.
 */
Generator.prototype.ahead = function (sheet) {
  var name = sheet.generated.name;

  if (
    !this.roomy() ||
    sheet.image !== null ||
    this.painting[name] !== undefined ||
    this.queue.has(name) ||
    sheet.retryAt > now()
  )
    return false;

  var worker = freeWorker(this);

  if (worker === null) return false;

  this.comingCount++;
  send(this, worker, sheet, true);

  return true;
};

//how many may be painted ahead at a time: one a worker
Generator.prototype.aheadLimit = function () {
  return this.size;
};

//whether nothing wanted is being waited for
Generator.prototype.idle = function () {
  return this.queue.size === 0 && this.wantedPainting === 0;
};

//how many pictures wanted are being waited for
Generator.prototype.waiting = function () {
  return this.queue.size + this.wantedPainting;
};

//whether there is room for more to be painted ahead
Generator.prototype.roomy = function () {
  return this.stashed < STASH;
};

/**
 * Lets go of what was painted ahead and is no longer to be - not among the
 * names `wanted` has - to make room for what is.
 */
Generator.prototype.keep = function (wanted) {
  var self = this;

  Array.from(this.stash.values()).forEach(function (sheet) {
    if (!wanted[sheet.generated.name]) {
      unstash(self, sheet);
      sheet.image = null;
    }
  });
};

function unstash(self, sheet) {
  self.stash.delete(sheet.generated.name);
  self.stashed -= sheet.image.width * sheet.image.height;
  sheet.stashed = false;
}

/**
 * Marks a sheet's picture as used just now, to be let go of last.
 */
Generator.prototype.use = function (sheet) {
  var name = sheet.generated.name;

  if (this.memory.delete(name)) this.memory.set(name, sheet);
};

//into memory, its bytes counted, and past the limit the oldest let go of
function keep(self, sheet) {
  self.memory.set(sheet.generated.name, sheet);
  self.bytes += sheet.image.data.length;
  trim(self);
}

//past limit, the pictures used longest ago let go of - but none wanted in
//the last few frames, nor waited for a while ago
function trim(self) {
  if (self.bytes <= self.limit) return;

  var pinned = self.frame - PIN,
    t = now();

  for (var entry of self.memory) {
    var sheet = entry[1];

    if (self.bytes <= self.limit) break;
    if (sheet.wanted >= pinned || sheet.heldUntil > t) continue;

    self.memory.delete(entry[0]);
    self.bytes -= sheet.image.data.length;
    sheet.image = null;
  }
}

/* --- The workers ------------------------------------------------------- */

//as many asked for handed to the workers as they have room for, the one
//wanted most lately first - and those not wanted for a while let go of
function pump(self) {
  while (self.queue.size > 0) {
    var worker = freeWorker(self);

    if (worker === null) return;

    var sheet = next(self);

    if (sheet === null) return;

    self.wantedPainting++;
    send(self, worker, sheet, false);
  }
}

//the sheet asked for to be painted next: one waited for, or the one wanted
//most lately - of those wanted in the same frame, the first asked for, so
//that the parts of one picture come in together
function next(self) {
  var best = null,
    bestAt = -Infinity,
    stale = self.frame - STALE;

  for (var entry of self.queue) {
    var sheet = entry[1],
      waited = sheet.waiters !== undefined && sheet.waiters.length > 0,
      at = waited ? Infinity : sheet.wanted;

    if (!waited && sheet.wanted < stale) {
      self.queue.delete(entry[0]);
      continue;
    }

    if (at > bestAt) {
      best = sheet;
      bestAt = at;
    }
  }

  if (best !== null) self.queue.delete(best.generated.name);

  return best;
}

function freeWorker(self) {
  var workers = start(self),
    best = null;

  for (var i = 0; i < workers.length; i++)
    if (
      workers[i].busy < IN_FLIGHT &&
      (best === null || workers[i].busy < best.busy)
    )
      best = workers[i];

  return best;
}

function send(self, worker, sheet, ahead) {
  var g = sheet.generated;

  worker.busy++;
  worker.jobs[g.name] = true;
  self.painting[g.name] = { sheet: sheet, ahead: ahead, worker: worker };
  worker.post({
    type: "paint",
    name: g.name,
    gen: g.gen,
    key: g.key,
    look: g.look,
  });
}

function receive(self, worker, message) {
  var name = message.name,
    job = self.painting[name];

  worker.busy--;
  delete worker.jobs[name];

  if (job === undefined || job.worker !== worker) return;

  delete self.painting[name];

  var sheet = job.sheet,
    waiters = sheet.waiters || [];

  if (job.ahead) self.comingCount--;
  else self.wantedPainting--;
  sheet.waiters = undefined;

  if (message.type !== "picture") {
    if (!job.ahead) console.warn("Not painted: " + name + ": " + message.error);
    //asked for again, a while later, the next time it is wanted
    sheet.retryAt = now() + RETRY;
    waiters.forEach(function (w) {
      w.reject(new Error(message.error));
    });
    pump(self);
    return;
  }

  sheet.image = {
    width: message.width,
    height: message.height,
    data: message.data,
  };
  sheet.sides = message.sides || 0;
  //and at night, the lights of what shines of it (generatorcore lightsOf)
  sheet.lights = message.lights || null;

  if (waiters.length > 0) sheet.heldUntil = now() + HOLD;

  //painted ahead, and not wanted yet: kept apart till it is
  if (job.ahead) {
    sheet.stashed = true;
    self.stash.set(name, sheet);
    self.stashed += sheet.image.width * sheet.image.height;
  } else {
    self.painted++;
    keep(self, sheet);
  }

  waiters.forEach(function (w) {
    w.resolve(sheet.image);
  });
  pump(self);
}

/**
 * The workers, started the first time one is wanted - or the main thread,
 * where none would start.
 */
function start(self) {
  if (self.workers !== null) return self.workers;

  self.workers = [];

  for (var i = 0; i < self.size; i++) {
    try {
      self.workers.push(startWorker(self));
    } catch (e) {
      console.warn("No generator worker (" + e.message + ")");
      break;
    }
  }

  if (self.workers.length === 0) self.workers.push(mainThread(self));

  return self.workers;
}

function startWorker(self) {
  var worker = new Worker(new URL("./generator.worker.js", import.meta.url), {
      type: "module",
    }),
    port = { post: null, busy: 0, jobs: {} };

  port.post = function (message) {
    worker.postMessage(message);
  };
  worker.onmessage = function (e) {
    receive(self, port, e.data);
  };
  worker.onerror = function (e) {
    e.preventDefault();
    worker.terminate();
    lost(self, port, e.message);
  };
  port.post({ type: "init", inputs: self.inputs });

  return port;
}

/**
 * A worker gone: what it was painting asked for again of the others - or of
 * the main thread, if it was the last.
 */
function lost(self, port, why) {
  var i = self.workers.indexOf(port);

  if (i < 0) return;

  self.workers.splice(i, 1);
  if (self.workers.length === 0) {
    console.warn("No generator worker (" + why + "), painting on the page");
    self.workers.push(mainThread(self));
  }

  Object.keys(port.jobs).forEach(function (name) {
    var job = self.painting[name];

    if (job === undefined || job.worker !== port) return;

    delete self.painting[name];
    if (job.ahead) self.comingCount--;
    else {
      self.wantedPainting--;
      self.queue.set(name, job.sheet);
    }
  });

  pump(self);
}

/**
 * The same core as the workers', painting on the main thread.
 */
function mainThread(self) {
  var port = { post: null, busy: 0, jobs: {} },
    queue = [],
    core = null;

  port.post = function (message) {
    if (core !== null) deliver(message);
    else queue.push(message);
  };

  function deliver(message) {
    if (message.type === "init") core.init(message);
    else core.paint(message);
  }

  import("./generatorcore").then(function (module) {
    core = new module.default(function (message) {
      receive(self, port, message);
    });
    queue.forEach(deliver);
    queue = [];
  });

  port.post({ type: "init", inputs: self.inputs });

  return port;
}

function now() {
  return performance.now();
}

export default Generator;
