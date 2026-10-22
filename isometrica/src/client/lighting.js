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
 * The day and the night go by only if asked for (setDayNight: N, its button
 * in the top bar, ?daynight=on; kept in the browser for next time) - else
 * the city is drawn in the middle of the day whatever the clock says, the
 * clock and all that goes by it going on as ever.
 *
 * With ?light=0 everything is drawn as it is painted, lit by the one sun of
 * old.
 */
import engine from "engine";
import Config from "../core/config";
import VTime from "../core/vtime";
import RenderLayer from "./renderlayer";
import View from "./view";
import GLView from "./glview";
import Weather from "./weather";
import Wind from "./wind";

//the hour the city is drawn at now, worked out once a frame (see begin)
var hourNow = 12;

//how gloomy the day is for the weather, 0..1: dark enough under a heavy
//sky, or in a fog, for the street lights and the cars' lamps to go on by
//day too (see begin, cityOn, lampsOn)
var gloom = 0;

//when the sun comes up, and when it goes down: a long day and a short night
var SUNRISE = 5,
  SUNSET = 21.5;

//the hour the city is drawn at with no day and night going by: the middle
//of the day, the sun at its highest
var MIDDAY = (SUNRISE + SUNSET) / 2;

//where the day and the night going by is kept on or off in the browser
var DAY_NIGHT_STORE = "isometrica.daynight";

//whether the day and the night go by: as asked in the address, or as kept,
//or not
function dayNightWanted() {
  var asked = /[?&]daynight=(on|off)/.exec(location.search),
    kept = null;

  if (asked) return asked[1] === "on";

  try {
    kept = localStorage.getItem(DAY_NIGHT_STORE);
  } catch (e) {
    //not kept: not wanted, then
  }

  return kept === "on";
}

//when the street lights go on of an evening, half an hour before the sun is
//down, and off the next morning, half an hour after it is up (29.5, half
//past five) - a block at a time, each a while either side of it (cityOn)
var CITY_ON = SUNSET - 0.5,
  CITY_OFF = 24 + SUNRISE + 0.5;

//how long after them a car is, at the most, in putting its lamps on and off
//(lampsOn)
var CAR_LAG = 0.75;

//from when to when anything shines at all: the first windows to come on
//(windowsOn), the last car to put its lamps out
var SHINE_FROM = 20.5,
  SHINE_TO = CITY_OFF + Math.max(CAR_LAG, 0.33);

//a street light: how high its lamp hangs over the road, a pixel a unit
//(shared/gen/roads streetLight), how far its light reaches, how bright it is
//on the road under it, and in what light; how wide the cone it shines down
//in is (the cosine of half of it: a pool on the ground about as wide as the
//lamp is high), and how much of its light goes out to the sides of that, to
//light what is round it a little
var LAMP_HIGH = 20.5,
  LAMP_REACH = 34,
  LAMP_PEAK = 0.9,
  LAMP_LIGHT = [1, 0.745, 0.43],
  LAMP_DOWN = 0.7,
  LAMP_SPILL = 0.22;

//a headlight: how high it is, how far ahead its light reaches, how bright,
//in what light, and how wide (the cosine of half the cone); how far either
//is from the middle of the car, across it
var HEAD_HIGH = 3,
  HEAD_REACH = 22,
  HEAD_PEAK = 1,
  HEAD_LIGHT = [1, 0.96, 0.82],
  HEAD_CONE = 0.82,
  HEAD_APART = 2.5;

//a tail light: how far it reaches behind the car, how bright, its colour,
//and how wide it spreads (as HEAD_CONE)
var TAIL_REACH = 10,
  TAIL_PEAK = 0.35,
  //and on the brakes, brighter and further
  BRAKE_REACH = 13,
  BRAKE_PEAK = 0.8,
  TAIL_LIGHT = [1, 0.12, 0.06],
  TAIL_CONE = 0.1;

//an indicator: how long it is on, and then off, ms; its light, and at
//night how far its light reaches and how bright it is
var BLINK_MS = 380,
  BLINK_LIGHT = [1, 0.62, 0.1],
  BLINK_REACH = 7,
  BLINK_PEAK = 0.7;

//what shines of a building - a lit window, a sign, a billboard - as the
//light it throws round it: how far it reaches, and how bright it is close
//by, the most of it lit (client/cachedsprite nightLights)
var WINDOW_REACH = 18,
  WINDOW_PEAK = 0.5,
  //and a lamp of its own - a park's, a court's floodlight
  OWN_LAMP_REACH = 26,
  OWN_LAMP_PEAK = 0.75;

//whether a light of something's is a lamp's: the sodium orange a lamp is
//painted to glow with (shared/gen/isobox LAMP_LIGHT), not a window's
function isLamp(c) {
  return (
    c[0] > 0.98 &&
    Math.abs(c[1] - 0.769) < 0.03 &&
    Math.abs(c[2] - 0.439) < 0.03
  );
}

//a police car's flash: how high it is, how far it reaches, how bright
var FLASH_HIGH = 9,
  FLASH_REACH = 34,
  FLASH_PEAK = 0.85,
  //how wide each of its beams is (the cosine of half of it), and how long
  //they take to sweep round once, ms
  FLASH_CONE = 0.82,
  FLASH_TURN = 900;

//how high anything a lamp lights can stand, for the square it is drawn in
//to take it in
var TALL = 60;

//the shadows the sun casts: how far along the ground on the screen a pixel
//looks towards the sun for what stands in its way at each step (client/
//glview LIT_FS shadowed, 32 of them) - and so how far off the screen what
//casts them can stand, and is still drawn for it
var SHADOW_STEP = 2,
  SHADOW_MARGIN = 64;

/**
 * @param root {Vkaria}
 * @param cache {CanvasCache} whose pages the pictures are drawn from
 */
function Lighting(root, cache) {
  this.root = root;
  this.view = new GLView(cache.pageSize, cache.maxPages);
  //what the frame is drawn on, put on the page in the place of the world
  //screen's own canvas (engine Viewport)
  this.canvas = this.view.canvas;
  //what the layers draw lines, shapes and words with, in place of a canvas's
  //(engine Canvas2dRenderer renderGL, client/glcanvas)
  this.context = this.view.overlay;
  //what is painted goes straight into its slot on its page, on the GPU
  cache.upload = this.view.upload.bind(this.view);
  cache.alphaAt = this.view.alphaAt.bind(this.view);
  //?light=0: the city as it is painted, lit by the one sun of old
  this.plain = /[?&]light=0/.test(location.search);
  this.lamps = [];
  //the tops of the tall buildings in the layer being drawn, for their
  //warning lights (beacons): by the building
  this.tops = new Map();
  this.M = null;
  this.lit = false;
  this.flat = false;

  //what is kept in sight (seeThrough): its renderer, and the squares it was
  //drawn as in the layer being drawn, with the colour it shows through in
  this.sight = null;
  this.inSight = {
    floats: new Float32Array(GLView.FLOATS * 4),
    count: 0,
    tint: [1, 1, 1],
  };

  //the clock as it last moved on, and when, to move the sun on smoothly in
  //between (see hour)
  this.clockAt = -1;
  this.clockSince = 0;

  //whether the day and the night go by, or it is the middle of the day all
  //the while (setDayNight) - and who is told when it changes
  this.dayNight = dayNightWanted();
  this.dayNightListeners = [];
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
  Weather.install();
  //what is just off the screen casts its shadow on it too
  engine.Config.cullMargin = this.plain ? 0 : SHADOW_MARGIN;
};

/**
 * Has the day and the night go by with the clock, or the city drawn in the
 * middle of the day all the while - the clock going on either way - and
 * keeps it so for next time.
 *
 * @param [on] {boolean} the other way round from now, unless given
 */
Lighting.prototype.setDayNight = function (on) {
  this.dayNight = on === undefined ? !this.dayNight : on === true;

  try {
    localStorage.setItem(DAY_NIGHT_STORE, this.dayNight ? "on" : "off");
  } catch (e) {
    //not kept: as it is now, then
  }

  this.dayNightListeners.forEach(function (fn) {
    fn();
  });
};

//told whenever the day and the night are set going by or stopped
Lighting.prototype.onDayNight = function (fn) {
  this.dayNightListeners.push(fn);
};

/**
 * The hour of the game's day, with the minutes and how far the clock has
 * got towards its next tick - so the sun goes over smoothly rather than a
 * tick at a time.
 */
Lighting.prototype.hour = function () {
  return (this.clock() % 86400000) / 3600000;
};

/**
 * The hour the city is drawn at: the clock's while the day and the night go
 * by, else the middle of the day all the while - the hour the sounds go by
 * too, so they are the day's when the city is.
 */
Lighting.prototype.shownHour = function () {
  return this.dayNight ? this.hour() : MIDDAY;
};

/**
 * The game's time, ms, going on smoothly between the clock's ticks - for
 * the sun and the weather to change little by little, not a tick at a time.
 */
Lighting.prototype.clock = function () {
  var time = this.root.core.time,
    wall = performance.now();

  if (time.now !== this.clockAt) {
    this.clockAt = time.now;
    this.clockSince = wall;
  }

  var on = Math.min(1, (wall - this.clockSince) / Config.tickDelay);

  return time.now + on * VTime.millisecondsPerTick;
};

/**
 * Starts a frame (engine Canvas2dRenderer renderGL).
 *
 * @param M {number[]} where on the screen the world is, for where the lamps
 *        are
 */
Lighting.prototype.begin = function (viewport, M) {
  //from the side, or from straight above (client/view top)
  this.top = View.top();
  this.view.projection = GLView.PROJECTIONS[this.top ? "top" : "side"];
  //the hour the city is drawn at - the clock's, or the middle of the day
  hourNow = this.shownHour();
  this.weather = Weather.at(this.clock());
  Wind.factor = this.weather.wind;
  this.sky = sun(hourNow);
  if (!this.plain) weatherSky(this, this.sky, this.weather, viewport);
  this.night = !this.plain && within(hourNow, SHINE_FROM, SHINE_TO);
  this.M = M;
  this.lamps.length = 0;
  this.view.bare = this.calm;
  //for the dither of what is drawn see-through to stay put with the lamps'
  this.view.origin = [Math.round(M[12]), Math.round(M[13])];
  this.view.begin(
    viewport.width,
    viewport.height,
    this.night,
    !this.plain && this.sky.step !== null,
    SHADOW_MARGIN,
  );
};

//the layer drawn next: lit, flat ground
Lighting.prototype.layer = function (lit, flat) {
  this.lit = lit;
  this.flat = flat;
  this.inSight.count = 0;
};

/**
 * Keeps what renderer draws in sight (the courier's car): wherever anything
 * stands in front of it, it shows through, every other pixel of it in tint
 * - a CSS colour - glowing (client/glview xray). null for nothing.
 */
Lighting.prototype.seeThrough = function (renderer, tint) {
  this.sight = renderer;
  if (tint) this.inSight.tint = rgb(tint);
};

//a CSS colour - #rgb, #rrggbb or rgb(r, g, b) - as red, green and blue 0..1
function rgb(css) {
  if (/^rgb/.test(css))
    return css
      .replace(/[^0-9.,]/g, "")
      .split(",")
      .slice(0, 3)
      .map(function (n) {
        return +n / 255;
      });

  var h = css.replace("#", "");

  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];

  return [0, 2, 4].map(function (i) {
    return parseInt(h.substr(i, 2), 16) / 255;
  });
}

//how high the ground under what renderer draws is, on the screen - a pixel
//a unit, as how high its pixels stand over it is
var where = new Float32Array(3);

function elevation(M, renderer) {
  var go = renderer.gameObject;

  if (!go) return 0;

  return upOf(M) * go.transform.getPosition(where)[1];
}

//how many units high - pixels up the screen, from the side - a unit up the
//world is: from straight above, as many as from the side, though none of
//them up the screen
var UP = Math.cos(Math.PI / 6);

function upOf(M) {
  return View.top() ? UP : -M[5];
}

/**
 * A picture drawn by renderer at x0, y0 (engine SpriteRenderer picture):
 * into the batch of the layer, as it knows to be drawn (client/cachedsprite
 * glQuad) - and nothing that does not.
 */
Lighting.prototype.collect = function (renderer, sprite, x0, y0) {
  if (sprite.glQuad === undefined) return;

  var view = this.view,
    d = view.add(
      x0,
      y0,
      sprite.width,
      sprite.height,
      renderer.opacity,
      this.lit ? elevation(this.M, renderer) : 0,
      renderer.dither === true,
      //something up in the air with no heights of its own - a puff of
      //smoke - lit where it is, not as the ground it is drawn over
      this.lit && renderer.over !== undefined
        ? upOf(this.M) * renderer.over
        : 0,
    ),
    from = view.offset - 8;

  if (
    !sprite.glQuad(
      renderer,
      this.flat,
      this.lit,
      this.lit && this.night,
      d,
      view.offset,
    )
  )
    return;

  view.keep();

  //the top of anything tall, for its warning light: a mast up off a roof -
  //an office tower's - or the top of something tall that is no house, shop
  //nor office - a water tower
  var top = sprite.top;

  if (
    this.lit &&
    top &&
    top.h >= BEACON_MIN &&
    (top.spike >= BEACON_SPIKE || renderer.lights === undefined) &&
    renderer.lamps === undefined &&
    renderer.opacity > 0.99
  )
    keepTop(this, renderer, top, x0, y0);

  //what is kept in sight, to be drawn again where it is hidden
  if (this.lit && renderer === this.sight) keepInSight(this.inSight, d, from);

  //what shines of a building at night lights what is round it
  if (this.lit && this.night && renderer.windows !== undefined)
    windowLights(this.lamps, renderer, sprite, x0, y0);
};

//a square of what is kept in sight, its floats from d at from, among the
//rest of it
function keepInSight(sight, d, from) {
  var n = GLView.FLOATS;

  if ((sight.count + 1) * n > sight.floats.length) {
    var more = new Float32Array(sight.floats.length * 2);

    more.set(sight.floats);
    sight.floats = more;
  }

  sight.floats.set(d.subarray(from, from + n), sight.count * n);
  sight.count++;
}

//the layer's batch drawn, what is kept in sight where it is hidden, and
//over them what it drew as lines, shapes and words (context)
Lighting.prototype.flush = function () {
  if (this.tops.size > 0) {
    beacons(this, this.context, this.tops);
    this.tops.clear();
  }

  this.view.flush(this.lit, this.flat, this.inSight);
};

/* --- Warning lights ---------------------------------------------------- */

//how high something has to stand to have red warning lights on top, a
//pixel a unit (a storey is 12); their colour; how long they are lit and
//then out, all together, ms; and the light each throws at night
var BEACON_MIN = 56,
  //and how much higher than the rest of the roof a mast stands
  BEACON_SPIKE = 12,
  BEACON = "#ff2418",
  BEACON_LIGHT = [1, 0.12, 0.08],
  BEACON_ON = 900,
  BEACON_OFF = 700,
  BEACON_REACH = 4,
  BEACON_PEAK = 0.15;

//every building's warning lights blink in their own time, not all of the
//city's together: how far into their round each building's start, ms
var beaconPhase = new WeakMap();

function phaseOf(key) {
  var phase = beaconPhase.get(key);

  if (phase === undefined) {
    phase = Math.random() * (BEACON_ON + BEACON_OFF);
    beaconPhase.set(key, phase);
  }

  return phase;
}

/**
 * Keeps the top of what renderer draws - a tile of a building - if it is
 * to have a warning light on it (client/cachedsprite topOf): the highest of
 * the building's, on the screen.
 */
function keepTop(self, renderer, top, x0, y0) {
  var go = renderer.gameObject,
    parent = go.transform.parent,
    key = parent ? parent : go,
    kept = self.tops.get(key),
    high = [x0 + top.x, y0 + top.y, top.h, elevation(self.M, renderer)];

  if (kept === undefined)
    self.tops.set(key, { high: high, phase: phaseOf(key) });
  else if (top.h > kept.high[2]) kept.high = high;
}

/**
 * The warning lights on top of what stands tall: red, lit and out again,
 * each in its own time - one on the highest point of each, an office
 * tower's mast or a water tower's roof, two pixels by two glowing whatever
 * the light, hidden behind whatever stands in front of it, and at night
 * lighting what is right round it, a very little.
 */
function beacons(self, ctx, tops) {
  var now = Date.now();

  ctx.save();
  ctx.glow = true;
  ctx.fillStyle = BEACON;

  tops.forEach(function (t) {
    //each in its own time
    if ((now + t.phase) % (BEACON_ON + BEACON_OFF) >= BEACON_ON) return;

    var p = t.high;

    //a lamp of two pixels by two over the top of it
    ctx.standsAt = p[3] + p[2] + 3;
    ctx.fillRect(Math.floor(p[0]), Math.floor(p[1]) - 2, 2, 2);

    if (self.night)
      self.lamps.push({
        x: p[0],
        y: p[1] + p[2],
        z: p[2] + 1,
        reach: BEACON_REACH,
        color: BEACON_LIGHT,
        peak: BEACON_PEAK,
        aim: null,
        cone: -1,
        tall: TALL,
        wrap: 0.6,
      });
  });

  ctx.restore();
}

/**
 * How high the ground under what is drawn for gameObject is on the screen,
 * a pixel a unit - for what is drawn over it to be hidden behind what
 * stands nearer (client/glcanvas standsAt).
 */
Lighting.prototype.elevation = function (gameObject) {
  return this.M === null ? 0 : elevation(this.M, { gameObject: gameObject });
};

//the lit layers in: lit, by the sun and at night by the lamps
Lighting.prototype.light = function () {
  var M = this.M,
    w = this.view.width,
    h = this.view.height;

  //at any hour: the street lights and the cars' headlights are only on
  //after dark, but a police car's lights, indicators, brake lights and
  //beacons shine by day too (client/glview, lost in the sun mostly)
  if (!this.plain) {
    streetLights(this.lamps, M, w, h);
    //(and no cars drawn bare, client/carman VehicleRenderer)
    if (!this.calm) headlights(this.lamps, M, w, h, this.root.carman);
  }

  this.view.light(this.lamps, this.sky, [Math.round(M[12]), Math.round(M[13])]);
};

//the frame is on the screen already: the canvas it is drawn on is the one
//shown (engine Viewport) - and whoever waits on it told (onFrame)
Lighting.prototype.end = function () {
  if (this.onFrame !== null) this.onFrame();

  //and in what time is left, the world got ready to be seen from the other
  //sides (client/preloader)
  var preloader = this.root.sprites && this.root.sprites.preloader;

  if (preloader) preloader.step(this.root);
};

//called once a frame has been drawn, while it is still there to be copied
//(client/turner) - or null
Lighting.prototype.onFrame = null;

//whether the city is drawn bare - no cars, no rain falling, no lightning,
//nothing drawn over it, the grid, the names, the signs (GLView
//bare) - for a picture of it to be taken (client/turner)
Lighting.prototype.calm = false;

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
 * spot under it, shining down in a cone and a little round it below.
 */
function streetLights(out, M, w, h) {
  for (var key in streets) {
    var lamp = streets[key];

    //on and off with the rest of its block
    if (!cityOn(+key)) continue;

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
      down: LAMP_DOWN,
      spill: LAMP_SPILL,
    });
  }
}

/**
 * The lights of what shines of a building's piece, drawn at x0, y0 - its lit
 * windows, its signs - as it is lit just now (client/cachedsprite
 * nightLights): each where it shines from, as bright as how much of it is
 * lit.
 */
function windowLights(out, renderer, sprite, x0, y0) {
  var on = Lighting.shines(renderer),
    lights = on > 0 && sprite.nightLights ? sprite.nightLights() : null;

  if (lights === null) return;

  var way = (renderer.variant === 1 ? 2 : 0) + on - 1;

  for (var i = 0; i < lights.length; i++) {
    var l = lights[i],
      k = l.ways[way];

    if (k <= 0) continue;

    //a lamp of its own - a park's, a court's floodlight - lights the ground
    //round it the way a street light does, not as a window does
    if (isLamp(l.color)) {
      out.push({
        x: x0 + l.x,
        y: y0 + l.y + (View.top() ? 0 : l.z),
        z: l.z,
        reach: OWN_LAMP_REACH,
        color: l.color,
        peak: OWN_LAMP_PEAK,
        aim: null,
        cone: -1,
        tall: TALL,
      });
      continue;
    }

    out.push({
      x: x0 + l.x,
      //the spot under it, on the ground
      y: y0 + l.y + (View.top() ? 0 : l.z),
      z: l.z,
      reach: WINDOW_REACH,
      color: l.color,
      peak: WINDOW_PEAK * k,
      aim: null,
      cone: -1,
      tall: TALL,
      //not round onto the wall it is in, and as bright as it is close by
      wrap: 0,
      foot: false,
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
  "x+y+": [Math.SQRT1_2, Math.SQRT1_2],
  "x-y+": [-Math.SQRT1_2, Math.SQRT1_2],
  "x-y-": [-Math.SQRT1_2, -Math.SQRT1_2],
  "x+y-": [Math.SQRT1_2, -Math.SQRT1_2],
};

//and the way behind it
var BEHIND = {};

Object.keys(AIM).forEach(function (heading) {
  BEHIND[heading] = [-AIM[heading][0], -AIM[heading][1]];
});

/**
 * Every headlight on the screen of a car with its lamps on: two of them,
 * either side of the front of it, shining ahead, and two tail lights behind
 * it - and the flash of a police car, all round.
 */
function headlights(out, M, w, h, carman) {
  //the traffic, and whatever else drives with it - the courier's car
  var cars = carman ? (carman.cars || []).concat(carman.extras || []) : [];

  for (var i = 0; i < cars.length; i++) {
    var go = cars[i],
      car = go.car,
      renderer = go.spriteRenderer;

    if (!car || car.heading === null || !renderer || go.world === null)
      continue;

    var aim = AIM[car.heading],
      sprite = renderer._sprite;

    if (aim === undefined || !sprite) continue;

    go.transform.getPosition(at);
    screen(M, at[0], at[1], at[2], spot);
    if (!seen(spot[0], spot[1], FLASH_REACH * 2, w, h)) continue;

    //a police car's lightbar: a beam of each of its colours, sweeping
    //round and round across the road and the walls about it, the one
    //opposite the other - each car at its own point of the turn
    var glows = car.type ? car.type.glows : null;

    if (glows) {
      var turn =
        ((Date.now() + (renderer.lamps || 0) * FLASH_TURN) / FLASH_TURN) *
        Math.PI *
        2;

      for (var f = 0; f < glows.length; f++) {
        var g = glows[f],
          a = turn + (f * Math.PI * 2) / glows.length;

        out.push({
          x: spot[0],
          y: spot[1],
          z: FLASH_HIGH,
          reach: FLASH_REACH,
          color: [g[0] / 255, g[1] / 255, g[2] / 255],
          peak: FLASH_PEAK,
          aim: [Math.cos(a), Math.sin(a)],
          cone: FLASH_CONE,
          tall: TALL,
          //round onto the car itself, and about
          wrap: 0.6,
        });
      }
    }

    //its indicators, blinking amber on the road round them
    var blink = Lighting.blinkers(go, spot[0], spot[1]);

    if (blink !== null)
      for (var b = 0; b < blink.length; b += 2)
        out.push({
          x: blink[b],
          y: blink[b + 1],
          z: HEAD_HIGH,
          reach: BLINK_REACH,
          color: BLINK_LIGHT,
          peak: BLINK_PEAK,
          aim: null,
          cone: -1,
          tall: 20,
          wrap: 0.6,
        });

    var lamps = renderer.lamps !== undefined && lampsOn(renderer.lamps);

    if (!lamps && !car.braking) continue;

    //how far ahead of its middle the front is: across the screen its
    //picture is as long as it is and as wide, about 6 (shared/gen/vehicles)
    var ahead = aheadOf(car, sprite);

    for (var side = -1; side <= 1; side += 2) {
      //along the ground as it is seen, then onto the screen (x - y across,
      //-(x + y) / 2 up)
      var gx = aim[0] * ahead - aim[1] * side * HEAD_APART,
        gy = aim[1] * ahead + aim[0] * side * HEAD_APART;

      if (lamps)
        out.push({
          x: spot[0] + (View.top() ? 2 * gx : gx - gy),
          y: spot[1] - (View.top() ? 2 * gy : (gx + gy) / 2),
          z: HEAD_HIGH,
          reach: HEAD_REACH,
          color: HEAD_LIGHT,
          peak: HEAD_PEAK,
          aim: aim,
          cone: HEAD_CONE,
          tall: 20,
        });

      //and a tail light at the back, red and dim, behind it - brighter on
      //the brakes
      gx = -aim[0] * ahead - aim[1] * side * HEAD_APART;
      gy = -aim[1] * ahead + aim[0] * side * HEAD_APART;

      out.push({
        x: spot[0] + (View.top() ? 2 * gx : gx - gy),
        y: spot[1] - (View.top() ? 2 * gy : (gx + gy) / 2),
        z: HEAD_HIGH,
        reach: car.braking ? BRAKE_REACH : TAIL_REACH,
        color: TAIL_LIGHT,
        peak: car.braking ? BRAKE_PEAK : TAIL_PEAK,
        aim: BEHIND[car.heading],
        cone: TAIL_CONE,
        tall: 20,
      });
    }
  }
}

//how high a car's lamps are, a pixel a unit
Lighting.CAR_LAMP_HIGH = HEAD_HIGH;

//which way each heading goes along the ground as it is seen, a unit long
Lighting.AIM = AIM;

/**
 * A light of something at work - a road works lamp, a machine's beacon or
 * its work lamp, a building site's floodlight (client/worklights) - at x, y
 * on the screen, the spot on the ground under it, z over that: lighting
 * what is round it, while it is night.
 *
 * @param color {number[]} red, green and blue 0..1
 * @param [aim] {number[]} for a lamp shining one way, that way along the
 *        ground as it is seen (AIM), cone the cosine of half of how wide
 */
Lighting.prototype.workLight = function (
  x,
  y,
  z,
  reach,
  color,
  peak,
  aim,
  cone,
) {
  if (this.plain || !seen(x, y, reach, this.view.width, this.view.height))
    return;

  this.lamps.push({
    x: x,
    y: y,
    z: z,
    reach: reach,
    color: color,
    peak: peak,
    aim: aim || null,
    cone: aim ? cone : -1,
    tall: TALL,
    wrap: 0.6,
  });
};

//a car's signal (car.signal) with all four of its indicators going, as one
//broken down at the kerb or stood waiting at the side of the road has
Lighting.HAZARD = 2;

/**
 * Where a car's indicators are on the screen while they are lit - the one
 * at the front and the one at the back on the side it is turning to, the
 * car's middle at x, y on the screen: [x, y, x, y] - the ground under them,
 * or up as high as they are - or null while they are off, blinking, or it
 * is not turning (car.signal, -1 left, 1 right - see client/traffic Driver
 * signal).
 */
Lighting.blinkers = function (go, x, y, up) {
  var car = go.car,
    renderer = go.spriteRenderer;

  if (!car || !car.signal || car.heading === null || !renderer) return null;

  var aim = AIM[car.heading],
    sprite = renderer._sprite;

  if (aim === undefined || !sprite) return null;

  //each car blinking in its own time
  var phase = (renderer.lamps || 0) * 997;

  if (Math.floor((Date.now() + phase) / BLINK_MS) % 2 === 1) return null;

  //as far ahead as its headlights, and out to its side - on the right
  //of the way it goes as it is seen, the side as it turns; both sides for
  //its hazard lights
  var ahead = aheadOf(car, sprite),
    sides = car.signal === Lighting.HAZARD ? [-1, 1] : [car.signal],
    out = [];

  for (var k = 0; k < sides.length; k++) {
    var side = sides[k] * (HEAD_APART + 0.5);

    for (var end = 1; end >= -1; end -= 2) {
      var gx = aim[0] * ahead * end + aim[1] * side,
        gy = aim[1] * ahead * end - aim[0] * side;

      lampOnScreen(out, x, y, gx, gy, up);
    }
  }

  return out;
};

/**
 * How far ahead of a car's middle its lamps are, along the ground: from the
 * side, by how wide its picture is; from straight above, where every
 * picture of it is the same square, by how long it is.
 */
function aheadOf(car, sprite) {
  if (!View.top()) return Math.max(4, (sprite.width - 6) / 2);

  var type = car.type;

  return type && type.length ? Math.max(4, type.length * 16 - 1) : 6;
}

//a lamp gx, gy off a car's middle at x, y on the screen, along the ground -
//up as high as its lamps are, if up - onto the screen: from the side, or
//from straight above, two pixels a unit and nothing up
function lampOnScreen(out, x, y, gx, gy, up) {
  if (View.top()) out.push(x + 2 * gx, y - 2 * gy);
  else out.push(x + gx - gy, y - (gx + gy) / 2 - (up ? HEAD_HIGH : 0));
}

/**
 * Where a car's brake lights are on the screen while it is on the brakes
 * (car.braking - client/traffic Driver braking): at the back of it, either
 * side, as its tail lights are - the car's middle at x, y on the screen,
 * the ground under them or up as high as they are. Null while it is not.
 */
Lighting.brakeLights = function (go, x, y, up) {
  var car = go.car,
    renderer = go.spriteRenderer;

  if (!car || !car.braking || car.heading === null || !renderer) return null;

  var aim = AIM[car.heading],
    sprite = renderer._sprite;

  if (aim === undefined || !sprite) return null;

  var ahead = aheadOf(car, sprite),
    out = [];

  for (var side = -1; side <= 1; side += 2) {
    var gx = -aim[0] * ahead - aim[1] * side * (HEAD_APART - 0.5),
      gy = -aim[1] * ahead + aim[0] * side * (HEAD_APART - 0.5);

    lampOnScreen(out, x, y, gx, gy, up);
  }

  return out;
};

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

  return renderer.city === true && cityOn(renderer.cityTile) ? 2 : 0;
};

/**
 * How many of a building's windows are lit at this hour, 0, 1 for the first
 * few or 2 for more. Every building puts its first few on at a time of its
 * own in the hour from half past eight, all over the city, and more of them
 * a while later - each at its own pace, and every tile of it lit its own way
 * (client/cachedsprite nightSection), so no two are alike. A home and a shop
 * keep them all on through the night - a city at night, never a ghost town;
 * an office keeps only the few on - all till a while after the sun is up.
 *
 * @param seed {number} the building's own, 0..1 (see BuildingView)
 * @param lights {string} "home", "shop", "office" or "park" (BuildingView
 *        lightsOf)
 */
function windowsOn(seed, lights) {
  var first = SHINE_FROM + seed,
    more = first + 0.25 + ((seed * 4.13) % 1),
    morning = 24 + SUNRISE + ((seed * 5.93) % 1) * 0.5;

  //a park's lamps and its courts' floodlights: on with the street lights
  if (lights === "park") return cityOn(undefined, seed) ? 2 : 0;
  if (lights === "shop") return within(hourNow, first, morning) ? 2 : 0;
  if (lights === "office") return within(hourNow, first, morning) ? 1 : 0;

  return within(hourNow, more, morning)
    ? 2
    : within(hourNow, first, morning)
      ? 1
      : 0;
}

/**
 * Whether the street lights on tile are on: from about nine in the evening
 * to about half past five in the morning - a block of the city at a time,
 * each block going on and off at its own time within a while either side
 * of that (BLOCK, BLOCK_SPREAD), not all of them at once. With no tile,
 * by a seed of its own, 0..1 - a park's.
 */
function cityOn(tile, seed) {
  var on, off;

  if (tile === undefined) {
    on = ((seed || 0.5) - 0.5) * 2;
    off = (((seed || 0.5) * 7.13) % 1) * 2 - 1;
  } else {
    var bx = Math.floor((tile & 0xffff) / BLOCK),
      by = Math.floor((tile >>> 16) / BLOCK);

    on = hash(bx, by, 1) * 2 - 1;
    off = hash(bx, by, 2) * 2 - 1;
  }

  return (
    within(
      hourNow,
      CITY_ON + on * BLOCK_SPREAD,
      CITY_OFF + off * BLOCK_SPREAD,
    ) ||
    //and by day too, when it is gloomy enough - a block at a time
    gloom > GLOOM_ON + (on + 1) * 0.08
  );
}

//how gloomy a day has to be for the first lamps to go on
var GLOOM_ON = 0.45;

//how many tiles across a block of street lights going on together is, and
//how long either side of the hour a block goes on and off, hours
var BLOCK = 6,
  BLOCK_SPREAD = 0.33;

//a number 0..1 for x, y and a seed, always the same for them
function hash(x, y, s) {
  var h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

/**
 * Whether a car's lamps are on: it puts them on a while after the street
 * lights come on, and out a while after they go out, each car in its own
 * time.
 *
 * @param seed {number} the car's own, 0..1 (see client/carman Car)
 */
function lampsOn(seed) {
  return (
    within(
      hourNow,
      CITY_ON + seed * CAR_LAG,
      CITY_OFF + ((seed * 5.17) % 1) * CAR_LAG,
    ) || gloom > GLOOM_ON - 0.1 + seed * 0.2
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
    //out in the dark, darker than it was: the city's own lights make up for
    //it in the city (client/glview LIT_FS glowSky)
    amb = mix([0.085, 0.1, 0.19], [0.36, 0.39, 0.46], el * 2.5 + 0.55),
    strength = 0.75 * Math.max(0, Math.min(1, el * 4));

  return {
    ambient: amb,
    sun: [color[0] * strength, color[1] * strength, color[2] * strength],
    dir: [seen[0], seen[1], up],
    step: strength > 0.01 ? stepTo([seen[0], seen[1], up], View.top()) : null,
  };
}

/* --- Weather ----------------------------------------------------------- */

function lum(c) {
  return (c[0] + c[1] + c[2]) / 3;
}

function smooth(k) {
  k = Math.max(0, Math.min(1, k));

  return k * k * (3 - 2 * k);
}

//the clouds, in two layers not far apart, each its own way up in the sky -
//its shadow on the ground as far from under it, towards the sun, as that
//and how high the sun is make it, so that it goes round with the sun as the
//shadow of anything does - and drifting with the wind, the higher a little
//slower: how high, pixels up the screen, and how fast
var CLOUDS = [
  { high: 450, speed: 1 },
  { high: 520, speed: 0.85 },
];

//how much further from under a cloud than it is high its shadow is at the
//most - the sun low, it would be ever further, and fly along: it comes up
//to that softly, never in a rush, the sun going down
var CLOUD_SLANT = 2.2;

//how long the clouds take to come round to the wind as it changes, s: they
//go with how it blows over a while, not with every gust down in the streets
var CLOUD_STEADY = 20;

//how far the clouds' shadows have drifted with the wind, on the screen, and
//how fast they are going
var cloudAt = [0, 0],
  cloudGoing = [0, 0],
  lastWall = -1,
  blowing = [0, 0];

/**
 * The sky as the weather has it (client/weather): the clouds' shadows drift
 * over the city with the wind - a few big ones on a clear day, more and
 * bigger as the sky clouds over, closing up little by little till the
 * whole of it is under them; the light spread over all the sky, grey, more
 * so the more of it is cloud. And what more there is of it for the lighting to draw
 * (client/glview LIT_FS): the fog, and its colour - pale by day, all but
 * black at night; how much the lamps glow in the air in a fog or the rain;
 * how much the city's lights light the sky at night, more under cloud; how
 * wet the ground is and how hard it rains, slanting in the wind; and the
 * lightning.
 */
function weatherSky(self, sky, w, viewport) {
  //(the way to the sun, whether or not there is any of it left to light
  //anything - the clouds' shadows go by it, and do not jump back under them
  //as the sun goes, nor out again as it comes up - as it would be seen
  //unturned: the clouds go by the world, not by the screen, over the same
  //ground whichever way round the camera looks, see unturned)
  var toSun = View.unvector(sky.dir[0], sky.dir[1]),
    sunStep = stepTo([toSun[0], toSun[1], sky.dir[2]]);

  var wall = performance.now(),
    dt = lastWall < 0 ? 0 : Math.min(0.1, (wall - lastWall) / 1000),
    //how light the day is, 0 at night
    day = smooth((lum(sky.ambient) - 0.12) / 0.24),
    //how much of the sky is cloud - all of it well before it is as cloudy
    //as it gets - and how much of the sun the fog takes
    cover = Math.min(1, Math.max(0, (w.cloud - 0.02) / 0.78)),
    dim = w.fog * 0.08,
    //how heavy the sky is, for the lamps to go on by day
    heavy = smooth((w.cloud - 0.45) / 0.5) * 0.9,
    grey = lum(sky.ambient) + lum(sky.sun) * 0.5,
    over = smooth((w.cloud - 0.1) / 0.8) * 0.9,
    dark = 1 - 0.3 * w.storm - 0.1 * w.rain,
    k;

  lastWall = wall;

  for (k = 0; k < 3; k++) {
    sky.ambient[k] =
      (sky.ambient[k] + (grey * [0.97, 1, 1.04][k] - sky.ambient[k]) * over) *
      dark;
    sky.sun[k] *= 1 - dim;
  }

  if (lum(sky.sun) < 0.1) sky.step = null;

  gloom = day * Math.max(heavy * 0.75 + w.storm * 0.3, w.fog * 0.85);

  //the wind, on the screen: across it and down it - as it is seen, for the
  //rain to slant by, and as it would be seen unturned, for the clouds
  var now =
      viewport.camera && viewport.camera.world
        ? viewport.camera.world.logic.time.time
        : wall,
    blown = Wind(now, blowing),
    seen = View.vector(blown[0], blown[1]),
    across = seen[0] - seen[1],
    acrossWorld = blown[0] - blown[1],
    downWorld = -(blown[0] + blown[1]) / 2;

  var steady = 1 - Math.exp(-dt / CLOUD_STEADY);

  cloudGoing[0] += (acrossWorld * 2.5 - cloudGoing[0]) * steady;
  cloudGoing[1] += (downWorld * 2.5 - cloudGoing[1]) * steady;
  cloudAt[0] -= cloudGoing[0] * dt;
  cloudAt[1] -= cloudGoing[1] * dt;

  //and where each layer's shadow is, as the wind took it and the sun puts
  //it (CLOUDS)
  var clouds = [],
    step = sunStep;

  CLOUDS.forEach(function (layer) {
    var x = cloudAt[0] * layer.speed,
      y = cloudAt[1] * layer.speed;

    if (step) {
      var along = Math.sqrt(step[0] * step[0] + step[1] * step[1]),
        //how much further from under it than it is high: as the sun has
        //it, but coming up to CLOUD_SLANT softly
        far =
          along > 0
            ? CLOUD_SLANT *
              Math.tanh(along / Math.max(step[2], 1e-6) / CLOUD_SLANT)
            : 0,
        k = along > 0 ? (layer.high * far) / along : 0;

      x += step[0] * k;
      y += step[1] * k;
    }

    clouds.push(x, y);
  });

  var flash = Weather.flash(wall, w.storm),
    fog = [0.05, 0.055, 0.07].map(function (c, i) {
      return (c + ([0.7, 0.72, 0.75][i] - c) * day) * (1 - 0.35 * w.storm);
    });

  sky.weather = {
    cloud: cover,
    cloudAt: cloudAt,
    clouds: clouds,
    unturn: unturned(),
    grey: 0.4 * smooth((w.cloud - 0.3) / 0.7) + 0.12 * w.fog,
    fog: Math.min(1, w.fog * 0.95 + w.rain * 0.35),
    fogColor: fog,
    haze: Math.max(w.fog, w.rain * 0.7) * (1 - 0.8 * day) + 0.08 * (1 - day),
    glowSky: (1 - day) * (0.3 + 0.5 * w.cloud + 0.4 * w.fog),
    wet: w.wet,
    rain: self.calm ? 0 : w.rain,
    slant: Math.max(-0.7, Math.min(0.7, across * 0.06)),
    flash: flash === null || self.calm ? 0 : flash.bright,
    bolt:
      flash !== null && flash.bolt >= 0 && !self.calm
        ? Weather.bolt(flash.bolt, viewport.width, viewport.height, GLView.BOLT)
        : null,
    time: wall / 1000,
  };
}

/**
 * The ground on the screen - pixels across it and down it, from the world's
 * origin - as it would be on the screen with the camera unturned: column by
 * column, for a mat2 (client/glview LIT_FS unturn). What goes by the ground
 * rather than the screen - the clouds' shadows, the fog's banks, puddles -
 * stays on the same ground whichever way round the camera looks.
 */
function unturned() {
  function f(sx, sy) {
    //as seen along the ground, then in the world
    var w = View.unvector(sx / 2 - sy, -sx / 2 - sy);

    return [w[0] - w[1], -(w[0] + w[1]) / 2];
  }

  return f(1, 0).concat(f(0, 1));
}

/**
 * The way to the sun along dir, a step at a time: SHADOW_STEP pixels along
 * the ground on the screen - x - y across it, -(x + y) / 2 down it, a pixel
 * a unit - and as much higher as that takes it (client/glview LIT_FS
 * shadowed).
 */
function stepTo(dir, top) {
  //from straight above, two pixels a unit across and up
  var across = top ? 2 * dir[0] : dir[0] - dir[1],
    down = top ? -2 * dir[1] : -(dir[0] + dir[1]) / 2,
    along = Math.sqrt(across * across + down * down);

  //straight overhead, nothing casts a shadow but under itself
  if (along < 0.001) return [0, 0, 1000];

  var k = SHADOW_STEP / along;

  return [across * k, down * k, dir[2] * k];
}

export default Lighting;
