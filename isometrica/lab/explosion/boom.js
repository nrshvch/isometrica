/**
 * The explosion bench's sound: the blast (src/shared/gen/blast.js), one of
 * its ways picked, heard as each building on the bench goes up - started
 * so that its boom comes just as the pieces are torn off it and fly
 * (client/explosion blast), however fast the bench's clock goes. The sound
 * itself is not slowed: at ¼× the boom still comes as they fly, but it is
 * over long before they land.
 *
 * Made in the page, through Web Audio, as the sound lab makes its sounds.
 */
import * as Sounds from "../../src/shared/gen/sounds.js";
import { BLAST_SOUND } from "../../src/shared/gen/blast.js";
import Explosion from "../../src/client/explosion";
import { wake, audio } from "../../src/client/audio/wake.js";

var FUSE_MS = Explosion.Explosion.FUSE_MS;

//every way of it, for the page to pick from
export var WAYS = BLAST_SOUND.ways.map(function (label, way) {
  return { value: way, label: label };
});

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
  //the way picked, or null for none
  this.way = 0;
  //the explosions heard already
  this.heard = new WeakSet();
  this.frame = 0;
  this.watch();
}

/**
 * Wakes the sound - to be called from a click, before anything plays - and
 * makes the way picked, so it is ready when the building goes.
 */
Boom.prototype.wake = function () {
  wake();
  if (this.way !== null) bufferOf(this.way);
};

Boom.prototype.pick = function (way) {
  this.way = way;
  this.wake();
};

//the way picked, on its own, now
Boom.prototype.hear = function (way) {
  this.wake();
  play(way, 0);
};

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

  if (this.way === null) return;

  var world = this.world,
    speed = world.speed,
    at = BLAST_SOUND.at[this.way];

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

    if (till > at) return;

    self.heard.add(e);
    play(self.way, at - till);
  });
};

Boom.prototype.stop = function () {
  cancelAnimationFrame(this.frame);
};
