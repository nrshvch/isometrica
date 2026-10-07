/**
 * The light the city is drawn in, worked out as it is drawn: the sun going
 * over by the hour of the game's clock, the shade bluer and darker towards
 * night, and at night the windows lit.
 *
 * Every picture painted out of boxes is painted as its faces side by side -
 * what of it looks one way, the other, and up, as it is seen, black where a
 * pixel looks another way, the three adding up to its colours with no light
 * on them (shared/gen/isobox setMode, client/cachedsprite lightPass). The
 * lit layers are drawn into one canvas for each face (engine
 * Canvas2dRenderer, Config.lighting), each multiplied by the light that falls
 * that way, and the three added up into the frame - drawImage, multiply and
 * lighter, nothing off the fast path (3d-with-canvas2d §5.6, §6.13). Whatever
 * is drawn half see-through comes out right, every step being linear.
 *
 * At night there is a fourth canvas, of what shines - the lit panes of every
 * window, black wherever anything else stands, so that a building in front
 * hides the windows behind it - added in last, over the dark. Nothing fades:
 * a light is on or off (shines). Every building turns its lights on of an
 * evening and off late at night at times of its own (windowsOn); the street
 * lights all go on at once, and off at once in the morning (cityOn); every
 * car puts its lamps on and off a while after them, each in its own time
 * (lampsOn).
 *
 * Every flat colour is a 1x1 swatch stretched over a canvas: nothing is
 * filled.
 *
 * ?light=0 draws everything as it is painted, lit by the one sun of old.
 */
import engine from "engine";
import Config from "core/config";
import VTime from "core/vtime";
import RenderLayer from "./renderlayer";
import View from "./view";

//the faces, and what shines, in the order they are drawn in (engine
//SpriteRenderer.pass)
var LEFT = 0,
  RIGHT = 1,
  UP = 2,
  SHINE = 3;

//the hour now, worked out once a frame (see begin)
var hourNow = 12;

//when the street lights go on of an evening and off of a morning, all at
//once (cityOn)
var CITY_ON = 19.5,
  CITY_OFF = 6.5;

//how long after them a car is, at the most, in putting its lamps on and off
//(lampsOn)
var CAR_LAG = 0.75;

//from when to when anything shines at all: the first windows to come on
//(windowsOn), the last car to put its lamps out
var SHINE_FROM = 18.5,
  SHINE_TO = CITY_OFF + CAR_LAG;

function Lighting(root) {
  this.root = root;
  this.enabled = !/[?&]light=0/.test(location.search);
  this.passes = 3;
  this.canvases = [];
  this.contexts = [];

  for (var k = 0; k < 4; k++) {
    var c = document.createElement("canvas"),
      ctx = c.getContext("2d");

    ctx.imageSmoothingEnabled = false;
    this.canvases.push(c);
    this.contexts.push(ctx);
  }

  this.swatches = [swatch(), swatch(), swatch()];
  this.black = swatch().set(0, 0, 0);

  //the clock as it last moved on, and when, to move the sun on smoothly in
  //between (see hour)
  this.clockAt = -1;
  this.clockSince = 0;
}

/**
 * Wires it into the engine: the layers from the ground up to the buildings
 * are lit, and of them the ground, what is drawn on it and the roads are
 * flat (see engine Canvas2dRenderer).
 */
Lighting.prototype.install = function () {
  var lit = 0;

  for (var l = RenderLayer.groundLayer; l <= RenderLayer.buildingsLayer; l++)
    lit |= 1 << l;

  engine.Config.litLayersMask = lit;
  engine.Config.flatLayersMask =
    (1 << RenderLayer.groundLayer) |
    (1 << RenderLayer.groundDrawLayer) |
    (1 << RenderLayer.roadLayer);
  engine.Config.lighting = this;
};

/**
 * The hour of the game's day, with the minutes and how far the clock has
 * got towards its next tick - so the sun goes over smoothly rather than a
 * quarter of an hour at a time.
 */
Lighting.prototype.hour = function () {
  var time = this.root.core.time,
    wall = performance.now();

  if (time.now !== this.clockAt) {
    this.clockAt = time.now;
    this.clockSince = wall;
  }

  var on = Math.min(1, (wall - this.clockSince) / Config.tickDelay),
    ms = time.now + on * VTime.millisecondsPerTick;

  return (ms % 86400000) / 3600000;
};

Lighting.prototype.begin = function (viewport) {
  var w = viewport.width,
    h = viewport.height,
    k;

  if (this.canvases[0].width !== w || this.canvases[0].height !== h)
    for (k = 0; k < 4; k++) {
      this.canvases[k].width = w;
      this.canvases[k].height = h;
      this.contexts[k].imageSmoothingEnabled = false;
    }

  hourNow = this.hour();
  this.light = sun(hourNow);
  this.passes = between(hourNow, SHINE_FROM, SHINE_TO) ? 4 : 3;

  //black, so that where nothing is drawn nothing is added
  for (k = 0; k < this.passes; k++) {
    over(this.contexts[k], this.black, "copy", w, h);
    this.contexts[k].globalCompositeOperation = "source-over";
  }
};

Lighting.prototype.end = function (context, viewport) {
  var w = viewport.width,
    h = viewport.height,
    L = this.light,
    c = this.contexts,
    s = this.swatches;

  over(c[LEFT], s[LEFT].color(L.left), "multiply", w, h);
  over(c[RIGHT], s[RIGHT].color(L.right), "multiply", w, h);
  over(c[UP], s[UP].color(L.up), "multiply", w, h);
  over(c[LEFT], this.canvases[RIGHT], "lighter", w, h);
  over(c[LEFT], this.canvases[UP], "lighter", w, h);

  //what shines, as bright as it is painted
  if (this.passes > SHINE) over(c[LEFT], this.canvases[SHINE], "lighter", w, h);

  c[LEFT].globalCompositeOperation = "source-over";
  context.drawImage(this.canvases[LEFT], 0, 0);
};

/**
 * Whether what renderer draws shines at this hour (client/cachedsprite
 * lightPass, client/glow): a building's windows by its own hours (windows,
 * see windowsOn), a car's lamps by its own (lamps, see lampsOn), a street
 * light's with every other one's (city, see cityOn); anything else never.
 */
Lighting.shines = function (renderer) {
  if (renderer.lamps !== undefined) return lampsOn(renderer.lamps);
  if (renderer.windows !== undefined) return windowsOn(renderer.windows);

  return renderer.city === true && cityOn();
};

/**
 * Whether a building's windows are lit at this hour: every one comes on at
 * an hour of its own between half past six and nine in the evening, and
 * goes off at one of its own between half past ten and three in the
 * morning; some come on again at five for a while before the day.
 *
 * @param seed {number} the building's own, 0..1 (see BuildingView)
 */
function windowsOn(seed) {
  var on = SHINE_FROM + seed * 2.5,
    off = 22.5 + ((seed * 7.31) % 1) * 4.5,
    early = (seed * 3.77) % 1 < 0.35;

  return (
    between(hourNow, on, off) ||
    (early && between(hourNow, 5, 5.5 + seed * 1.5))
  );
}

//whether the street lights are on: from half past seven in the evening to
//half past six in the morning, all of them
function cityOn() {
  return between(hourNow, CITY_ON, CITY_OFF);
}

/**
 * Whether a car's lamps are on: it puts them on a while after the street
 * lights come on, and out a while after they go out, each car in its own
 * time.
 *
 * @param seed {number} the car's own, 0..1 (see client/carman Car)
 */
function lampsOn(seed) {
  return between(
    hourNow,
    CITY_ON + seed * CAR_LAG,
    CITY_OFF + ((seed * 5.17) % 1) * CAR_LAG,
  );
}

//whether hour h is from on until off, the night over midnight
function between(h, on, off) {
  off %= 24;

  return on < off ? h >= on && h < off : h >= on || h < off;
}

/* --- Sun --------------------------------------------------------------- */

function mix(a, b, k) {
  k = Math.max(0, Math.min(1, k));

  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/**
 * The light on what looks each way at hour h: the sun comes up behind what looks towards -x and +y, goes over the
 * corner between the two faces seen at noon and down behind what looks
 * towards +x and -y - in the world; as it is seen, wherever the camera is
 * turned to - lower and redder towards either end of the day; the shade is
 * sky blue by day and dark blue at night.
 */
function sun(h) {
  //up at six, down at eight in the evening
  var day = (h - 6) / 14,
    el = Math.sin(Math.PI * day),
    phi = Math.PI * (0.75 + day),
    up = Math.max(0, el) * 0.9,
    flat = Math.sqrt(1 - up * up),
    seen = View.vector(Math.cos(phi) * flat, Math.sin(phi) * flat),
    color = mix([1, 0.62, 0.38], [1, 0.97, 0.9], el * 2),
    amb = mix([0.12, 0.14, 0.26], [0.36, 0.39, 0.46], el * 2.5 + 0.55),
    strength = 0.75 * Math.max(0, Math.min(1, el * 4));

  function on(k) {
    return [0, 1, 2].map(function (c) {
      return Math.min(1, amb[c] + Math.max(0, k) * color[c] * strength);
    });
  }

  return {
    left: on(-seen[0]),
    right: on(-seen[1]),
    up: on(up),
  };
}

/* --- Drawing ----------------------------------------------------------- */

//a 1x1 canvas of one colour, stretched over a canvas in place of a fill
function swatch() {
  var c = document.createElement("canvas"),
    ctx = c.getContext("2d"),
    key = "";

  c.width = c.height = 1;
  c.set = function (r, g, b) {
    var k = r + "," + g + "," + b;

    if (k !== key) {
      key = k;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
      ctx.fillRect(0, 0, 1, 1);
    }

    return c;
  };
  //one of the light's colours, 0..1 a channel
  c.color = function (rgb) {
    return c.set(
      Math.round(rgb[0] * 255),
      Math.round(rgb[1] * 255),
      Math.round(rgb[2] * 255),
    );
  };

  return c;
}

function over(ctx, src, op, w, h) {
  ctx.globalCompositeOperation = op;
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, w, h);
}

Lighting.UP = UP;
Lighting.SHINE = SHINE;

export default Lighting;
