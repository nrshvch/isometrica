/**
 * The explosion bench's sound: the blast (src/shared/gen/blast.js), one of
 * its ways at random, as the game has it, heard as each building on the
 * bench goes up - started
 * so that its boom comes just as the pieces are torn off it and fly
 * (client/explosion blast), however fast the bench's clock goes. The sound
 * itself is not slowed: at ¼× the boom still comes as they fly, but it is
 * over long before they land.
 *
 * Made in the page, through Web Audio, as the sound lab makes its sounds -
 * the bench's world has the game's sound off; the game times it the same
 * way (client/audio/soundman blasts).
 */
import * as Sounds from "../../src/shared/gen/sounds.js";
import { BLAST_SOUND } from "../../src/shared/gen/blast.js";
import Explosion from "../../src/client/explosion";
import { wake, audio } from "../../src/client/audio/wake.js";

var FUSE_MS = Explosion.Explosion.FUSE_MS;

var made = {};

//the way's buffer, made the first time it is asked for
function bufferOf(way) {
  if (made[way]) return made[way];

  var ctx = audio(),
    sound = Sounds.generate("blast/" + way, ctx.sampleRate),
    buf = ctx.createBuffer(2, sound.channels[0].length, sound.rate);

  sound.channels.forEach(function (ch, i) {
    buf.copyToChannel(ch, i);
  });

  return (made[way] = buf);
}

function play(way, offset) {
  var ctx = audio(),
    src = ctx.createBufferSource(),
    buf = bufferOf(way);

  if (offset >= buf.duration) return;

  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(ctx.currentTime, Math.max(0, offset));
}

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Boom(world) {
  this.world = world;
  //whether it is heard
  this.on = true;
  //the explosions heard already
  this.heard = new WeakSet();
  //the way each is heard
  this.ways = new WeakMap();
  this.frame = 0;
  this.watch();
}

/**
 * Wakes the sound - to be called from a click, before anything plays - and
 * makes it, so it is ready when the building goes.
 */
Boom.prototype.wake = function () {
  wake();
  if (this.on) for (var w = 0; w < BLAST_SOUND.ways.length; w++) bufferOf(w);
};

Boom.prototype.turn = function (on) {
  this.on = on;
  this.wake();
};

//one of them at random, on its own, now
Boom.prototype.hear = function () {
  this.wake();
  play(pick(), 0);
};

function pick() {
  return Math.floor(Math.random() * BLAST_SOUND.ways.length);
}

/**
 * Every frame: each explosion on the bench, its fuse burning, heard once
 * there is no longer till it goes up than its sound has before its boom -
 * the sound started part of the way into it, if it is later than that.
 */
Boom.prototype.watch = function () {
  var self = this;

  this.frame = requestAnimationFrame(function () {
    self.watch();
  });

  if (!this.on) return;

  var world = this.world,
    speed = world.speed,
    ways = this.ways;

  world.client.game.logic.world.gameObjects.forEach(function (go) {
    var e = go && go.explosion;

    if (!e || go.world === null || self.heard.has(e)) return;

    //real seconds till it goes up - or since it did
    var till;

    if (e.state === "fuse") {
      if (speed <= 0) return;
      till = (FUSE_MS - e.t) / 1000 / speed;
    } else if (e.state === "blown") {
      till = -e.t / 1000 / Math.max(speed, 0.01);
    } else return;

    //its way, picked once it is first seen
    if (!ways.has(e)) ways.set(e, pick());

    var way = ways.get(e),
      at = BLAST_SOUND.at[way];

    if (till > at) return;

    self.heard.add(e);
    play(way, at - till);
  });
};

Boom.prototype.stop = function () {
  cancelAnimationFrame(this.frame);
};
