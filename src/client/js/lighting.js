/**
 * The city drawn in WebGL, and the light it is drawn in, worked out pixel by
 * pixel: the sun going over by the hour of the game's clock, the shade bluer
 * and darker towards night, and at night the windows, the street lights and
 * the headlights.
 *
 * The engine hands every layer to it (engine Canvas2dRenderer renderGL),
 * every picture of it to be drawn in one batch (collect, client/glview). A
 * picture painted out of boxes - and the ground, the trees and the vehicles
 * - is drawn from its colours with no light on them and which way every
 * pixel of it looks; at night, too, from what of it shines, how high every
 * pixel of it stands, and the light it throws round its foot (shared/gen/
 * looks, client/cachedsprite glQuad) - into as many pictures of the screen,
 * in the order the engine sorts them, so whatever is in front hides what is
 * behind it in all of them alike. Once the lit layers are in, they are lit
 * (light): the sun on every pixel by the way it looks, every lamp on every
 * pixel it reaches by how far it is and how squarely it faces it - stepped
 * and dithered, as pixel art is - what shines added in over the dark. The
 * layers over the city go on top as they are painted.
 *
 * Nothing fades: a light is on or off (shines). Every building turns its
 * lights on in the same hour of an evening, each at its own time; a home
 * turns them off late at night, a shop keeps them on all night, an office a
 * few of them; a building still going up has none (windowsOn); the street
 * lights all go on at once, and off at once in the morning (cityOn); every
 * car puts its lamps on and off a while after them, each in its own time
 * (lampsOn).
 *
 * With ?light=0 everything is drawn as it is painted, lit by the one sun of
 * old.
 */
import engine from "engine";
import Config from "core/config";
import VTime from "core/vtime";
import RenderLayer from "./renderlayer";
import View from "./view";
import GLView from "./glview";

//the hour now, worked out once a frame (see begin)
var hourNow = 12;

//when the sun comes up, and when it goes down: a long day and a short night
var SUNRISE = 5,
  SUNSET = 21.5;

//when the street lights go on of an evening, half an hour before the sun is
//down, and off the next morning, half an hour after it is up (29.5, half
//past five) - all at once (cityOn)
var CITY_ON = SUNSET - 0.5,
  CITY_OFF = 24 + SUNRISE + 0.5;

//how long after them a car is, at the most, in putting its lamps on and off
//(lampsOn)
var CAR_LAG = 0.75;

//from when to when anything shines at all: the first windows to come on
//(windowsOn), the last car to put its lamps out
var SHINE_FROM = 20.5,
  SHINE_TO = CITY_OFF + CAR_LAG;

//a street light: how high its lamp hangs over the road, a pixel a unit
//(shared/gen/roads streetLight), how far its light reaches, how bright it is
//on the road under it, and in what light
var LAMP_HIGH = 20.5,
  LAMP_REACH = 28,
  LAMP_PEAK = 0.9,
  LAMP_LIGHT = [1, 0.745, 0.43];

//a headlight: how high it is, how far ahead its light reaches, how bright,
//in what light, and how wide (the cosine of half the cone); how far either
//is from the middle of the car, across it
var HEAD_HIGH = 3,
  HEAD_REACH = 22,
  HEAD_PEAK = 1,
  HEAD_LIGHT = [1, 0.96, 0.82],
  HEAD_CONE = 0.82,
  HEAD_APART = 2.5;

//how high anything a lamp lights can stand, for the square it is drawn in
//to take it in
var TALL = 60;

/**
 * @param root {Vkaria}
 * @param cache {CanvasCache} whose pages the pictures are drawn from
 */
function Lighting(root, cache) {
  this.root = root;
  this.view = new GLView(cache.pageSize, cache.maxPages);
  //what is painted goes straight into its slot on its page, on the GPU
  cache.upload = this.view.upload.bind(this.view);
  cache.alphaAt = this.view.alphaAt.bind(this.view);
  //?light=0: the city as it is painted, lit by the one sun of old
  this.plain = /[?&]light=0/.test(location.search);
  this.lamps = [];
  this.M = null;
  this.lit = false;
  this.flat = false;

  //the clock as it last moved on, and when, to move the sun on smoothly in
  //between (see hour)
  this.clockAt = -1;
  this.clockSince = 0;
}

/**
 * Wires it into the engine: everything is drawn through it, in WebGL; the
 * layers from the ground up to the buildings are lit, and of them the
 * ground, what is drawn on it and the roads are flat (see engine
 * Canvas2dRenderer renderGL).
 */
Lighting.prototype.install = function () {
  var lit = 0;

  for (var l = RenderLayer.groundLayer; l <= RenderLayer.buildingsLayer; l++)
    lit |= 1 << l;

  engine.Config.litLayersMask = this.plain ? 0 : lit;
  engine.Config.flatLayersMask =
    (1 << RenderLayer.groundLayer) |
    (1 << RenderLayer.groundDrawLayer) |
    (1 << RenderLayer.roadLayer);
  engine.Config.gl = this;
};

/**
 * The hour of the game's day, with the minutes and how far the clock has
 * got towards its next tick - so the sun goes over smoothly rather than a
 * tick at a time.
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

/**
 * Starts a frame (engine Canvas2dRenderer renderGL).
 *
 * @param M {number[]} where on the screen the world is, for where the lamps
 *        are
 */
Lighting.prototype.begin = function (viewport, M) {
  hourNow = this.hour();
  this.sky = sun(hourNow);
  this.night = !this.plain && within(hourNow, SHINE_FROM, SHINE_TO);
  this.M = M;
  this.view.begin(viewport.width, viewport.height, this.night);
};

//the layer drawn next: lit, flat ground
Lighting.prototype.layer = function (lit, flat) {
  this.lit = lit;
  this.flat = flat;
};

/**
 * A picture drawn by renderer at x0, y0 (engine SpriteRenderer picture):
 * into the batch of the layer, as it knows to be drawn (client/cachedsprite
 * glQuad) - and nothing that does not.
 */
Lighting.prototype.collect = function (renderer, sprite, x0, y0) {
  if (sprite.glQuad === undefined) return;

  var view = this.view,
    d = view.add(x0, y0, sprite.width, sprite.height, renderer.opacity);

  if (
    sprite.glQuad(
      renderer,
      this.flat,
      this.lit,
      this.lit && this.night,
      d,
      view.offset,
    )
  )
    view.keep();
};

//the layer's batch drawn, and over it what it drew on the canvas
Lighting.prototype.flush = function (canvas) {
  this.view.flush(this.lit, canvas);
};

//the lit layers in: lit, by the sun and at night by the lamps
Lighting.prototype.light = function () {
  var M = this.M,
    w = this.view.width,
    h = this.view.height;

  this.lamps.length = 0;
  if (this.night) {
    streetLights(this.lamps, M, w, h);
    headlights(this.lamps, M, w, h, this.root.carman);
  }

  this.view.light(this.lamps, this.sky, [Math.round(M[12]), Math.round(M[13])]);
};

//the frame, onto the screen
Lighting.prototype.end = function (context, viewport) {
  context.clearRect(0, 0, viewport.width, viewport.height);
  context.drawImage(this.view.canvas, 0, 0);
};

/* --- Lamps ------------------------------------------------------------- */

//the street lights, by the tile they stand on - each the road they stand
//by, and where the spot under the lamp is from it (client/roadview)
var streets = {},
  at = new Float32Array(3);

/**
 * Keeps a street light by road on tile, x, z from the middle of its tile in
 * the world, to light the city round it at night - in place of whatever
 * stood on that tile before.
 */
Lighting.addLamp = function (road, tile, x, z) {
  streets[tile] = { road: road, x: x, z: z };
};

//where on the screen a point of the world is
function screen(M, x, y, z, out) {
  out[0] = M[0] * x + M[4] * y + M[8] * z + M[12];
  out[1] = M[1] * x + M[5] * y + M[9] * z + M[13];

  return out;
}

var spot = [0, 0];

//whether a lamp at x, y on the screen can light anything there is on it
function seen(x, y, reach, w, h) {
  var r = reach * 1.5;

  return x > -r && x < w + r && y > -r && y < h + r + TALL;
}

/**
 * Every street light on the screen while they are on: its lamp over the
 * spot under it, shining all round.
 */
function streetLights(out, M, w, h) {
  if (!cityOn()) return;

  for (var key in streets) {
    var lamp = streets[key];

    //its road not in the world - not yet, or no more
    if (lamp.road.world === null) continue;

    lamp.road.transform.getPosition(at);
    screen(M, at[0] + lamp.x, at[1], at[2] + lamp.z, spot);
    if (!seen(spot[0], spot[1], LAMP_REACH, w, h)) continue;

    out.push({
      x: spot[0],
      y: spot[1],
      z: LAMP_HIGH,
      reach: LAMP_REACH,
      color: LAMP_LIGHT,
      peak: LAMP_PEAK,
      aim: null,
      cone: -1,
      tall: TALL,
    });
  }
}

//which way a car is going as it is seen ("x+", "y-" - see client/view
//heading), along the ground
var AIM = {
  "x+": [1, 0],
  "x-": [-1, 0],
  "y+": [0, 1],
  "y-": [0, -1],
};

/**
 * Every headlight on the screen of a car with its lamps on: two of them,
 * either side of the front of it, shining ahead.
 */
function headlights(out, M, w, h, carman) {
  var cars = carman ? carman.cars || [] : [];

  for (var i = 0; i < cars.length; i++) {
    var go = cars[i],
      car = go.car,
      renderer = go.spriteRenderer;

    if (!car || car.heading === null || !renderer || go.world === null)
      continue;
    if (renderer.lamps === undefined || !lampsOn(renderer.lamps)) continue;

    var aim = AIM[car.heading],
      sprite = renderer._sprite;

    if (aim === undefined || !sprite) continue;

    go.transform.getPosition(at);
    screen(M, at[0], at[1], at[2], spot);
    if (!seen(spot[0], spot[1], HEAD_REACH * 2, w, h)) continue;

    //how far ahead of its middle the front is: across the screen its
    //picture is as long as it is and as wide, about 6 (shared/gen/vehicles)
    var ahead = Math.max(4, (sprite.width - 6) / 2);

    for (var side = -1; side <= 1; side += 2) {
      //along the ground as it is seen, then onto the screen (x - y across,
      //-(x + y) / 2 up)
      var gx = aim[0] * ahead - aim[1] * side * HEAD_APART,
        gy = aim[1] * ahead + aim[0] * side * HEAD_APART;

      out.push({
        x: spot[0] + gx - gy,
        y: spot[1] - (gx + gy) / 2,
        z: HEAD_HIGH,
        reach: HEAD_REACH,
        color: HEAD_LIGHT,
        peak: HEAD_PEAK,
        aim: aim,
        cone: HEAD_CONE,
        tall: 20,
      });
    }
  }
}

/**
 * How much of what renderer draws shines at this hour (client/cachedsprite
 * lightPass, lamps): 0 for nothing, 1 for the first of its lights, 2
 * for more of them - a building's windows by its own hours (windows, see
 * windowsOn); a car's lamps by its own (lamps, see lampsOn), and a street
 * light's with every other one's (city, see cityOn), all or nothing;
 * anything else never.
 */
Lighting.shines = function (renderer) {
  if (renderer.lamps !== undefined) return lampsOn(renderer.lamps) ? 2 : 0;
  if (renderer.windows !== undefined)
    return windowsOn(renderer.windows, renderer.lights);

  return renderer.city === true && cityOn() ? 2 : 0;
};

/**
 * How many of a building's windows are lit at this hour, 0, 1 for the first
 * few or 2 for more. Every building puts its first few on at a time of its
 * own in the hour from half past eight, all over the city, and more of them
 * a while later - each at its own pace, and every tile of it lit its own way
 * (client/cachedsprite nightSection), so no two are alike. A home puts the
 * more out again a while before it goes to bed, at an hour of its own
 * between eleven and three in the morning, and the rest then; a shop keeps
 * them all on through the night; an office keeps only the few on, through
 * the night - all till a while after the sun is up.
 *
 * @param seed {number} the building's own, 0..1 (see BuildingView)
 * @param lights {string} "home", "shop" or "office" (BuildingView lightsOf)
 */
function windowsOn(seed, lights) {
  var first = SHINE_FROM + seed,
    more = first + 0.25 + ((seed * 4.13) % 1),
    morning = 24 + SUNRISE + ((seed * 5.93) % 1) * 0.5,
    bed = 23 + ((seed * 7.31) % 1) * 4,
    fewer = bed - 0.5 - ((seed * 2.71) % 1);

  if (lights === "shop") return within(hourNow, first, morning) ? 2 : 0;
  if (lights === "office") return within(hourNow, first, morning) ? 1 : 0;

  return within(hourNow, more, fewer) ? 2 : within(hourNow, first, bed) ? 1 : 0;
}

//whether the street lights are on: from nine in the evening to half past
//five in the morning, all of them
function cityOn() {
  return within(hourNow, CITY_ON, CITY_OFF);
}

/**
 * Whether a car's lamps are on: it puts them on a while after the street
 * lights come on, and out a while after they go out, each car in its own
 * time.
 *
 * @param seed {number} the car's own, 0..1 (see client/carman Car)
 */
function lampsOn(seed) {
  return within(
    hourNow,
    CITY_ON + seed * CAR_LAG,
    CITY_OFF + ((seed * 5.17) % 1) * CAR_LAG,
  );
}

//whether hour h of the day is from hour from until hour to - to past 24
//for the next morning; never if to is no later than from
function within(h, from, to) {
  return (h >= from && h < to) || (h + 24 >= from && h + 24 < to);
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
 * The light of the sky and of the sun at hour h: the sun comes up behind
 * what looks towards -x and +y, goes over the corner between the two faces
 * seen at noon and down behind what looks towards +x and -y - in the world;
 * as it is seen, wherever the camera is turned to - lower and redder towards
 * either end of the day; the shade is sky blue by day and dark blue at
 * night.
 *
 * @returns {{ambient: number[], sun: number[], dir: number[]}} the sky's
 *          light, the sun's, and which way the sun is, as it is seen - a
 *          surface looking along n lit ambient + max(0, n.dir) * sun
 */
function sun(h) {
  //how far through the day, up at SUNRISE, down at SUNSET
  var day = (h - SUNRISE) / (SUNSET - SUNRISE),
    el = Math.sin(Math.PI * day),
    phi = Math.PI * (0.75 + day),
    up = Math.max(0, el) * 0.9,
    flat = Math.sqrt(1 - up * up),
    seen = View.vector(Math.cos(phi) * flat, Math.sin(phi) * flat),
    color = mix([1, 0.62, 0.38], [1, 0.97, 0.9], el * 2),
    amb = mix([0.12, 0.14, 0.26], [0.36, 0.39, 0.46], el * 2.5 + 0.55),
    strength = 0.75 * Math.max(0, Math.min(1, el * 4));

  return {
    ambient: amb,
    sun: [color[0] * strength, color[1] * strength, color[2] * strength],
    dir: [seen[0], seen[1], up],
  };
}

export default Lighting;
