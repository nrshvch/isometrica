/**
 * Makes the sounds and the music the game plays, in workers
 * (client/audio/audio.worker), as Web Audio buffers - each the first time
 * it is asked for, and kept. What is asked for first is made first; a
 * worker makes one at a time, so a piece of music being made does not keep
 * a horn waiting for long with two of them.
 *
 * The pictures come first: nothing is started - not even the workers -
 * while `clear` says the ones on screen are still being painted. What is
 * asked for meanwhile waits, and goes once they are in (pump, every frame).
 * One already being made goes on: a worker cannot be stopped halfway.
 */
var WORKERS = 2;

/**
 * @param context {AudioContext} what the buffers are for
 * @param [clear] {function(): boolean} whether sounds may be made now
 */
export default function Maker(context, clear) {
  this.context = context;
  this.clear =
    clear ||
    function () {
      return true;
    };
  this.started = false;
  this.made = {};
  this.queue = [];
  this.workers = [];
  this.next = 1;
  this.waiting = {};
}

Maker.prototype.start = function () {
  var self = this;

  this.started = true;

  for (var i = 0; i < WORKERS; i++) {
    var w;

    try {
      w = new Worker(new URL("./audio.worker.js", import.meta.url), {
        type: "module",
      });
    } catch (e) {
      break;
    }

    w.busy = false;
    w.onmessage = function (e) {
      this.busy = false;
      self.got(e.data);
      self.pump();
    };
    w.onerror = function (e) {
      e.preventDefault();
      this.busy = false;
      self.pump();
    };
    this.workers.push(w);
  }
};

/**
 * The buffer for a sound ("horn/2") or a piece of music ("city/night/rain"),
 * once it is made.
 *
 * @param kind {"sound"|"music"}
 * @param name {string}
 * @param [first] {boolean} made before what was asked for already
 * @returns {Promise<AudioBuffer>}
 */
Maker.prototype.get = function (kind, name, first) {
  var key = kind + ":" + name,
    self = this;

  if (this.made[key]) return this.made[key];

  this.made[key] = new Promise(function (resolve, reject) {
    var id = self.next++;

    self.waiting[id] = { resolve: resolve, reject: reject, key: key };

    var job = { id: id, kind: kind, name: name, rate: self.context.sampleRate };

    if (first) self.queue.unshift(job);
    else self.queue.push(job);

    self.pump();
  });

  return this.made[key];
};

//the buffer, if it is made already, or null
Maker.prototype.ready = function (kind, name) {
  var p = this.made[kind + ":" + name];

  return p && p.buffer ? p.buffer : null;
};

//hands what waits to the workers with nothing to do - if the pictures on
//screen are in
Maker.prototype.pump = function () {
  if (this.queue.length === 0 || !this.clear()) return;
  if (!this.started) this.start();

  for (var i = 0; i < this.workers.length && this.queue.length > 0; i++)
    if (!this.workers[i].busy) {
      this.workers[i].busy = true;
      this.workers[i].postMessage(this.queue.shift());
    }
};

Maker.prototype.got = function (m) {
  var w = this.waiting[m.id];

  delete this.waiting[m.id];
  if (!w) return;

  if (m.error) {
    delete this.made[w.key];
    w.reject(new Error(m.error));
    return;
  }

  var buf = this.context.createBuffer(
    m.channels.length,
    m.channels[0].length,
    m.rate,
  );

  m.channels.forEach(function (c, i) {
    buf.copyToChannel(c, i);
  });

  this.made[w.key].buffer = buf;
  w.resolve(buf);
};
