/**
 * What the game sounds like - every sound of it made, not recorded
 * (shared/gen/sounds, shared/gen/music; made in workers, client/audio/maker):
 *
 * - the music (client/audio/music): a piece for the kind of place on screen -
 *   the city, a small town, the country - by day or by night, going with the
 *   weather;
 * - the place itself, by what there is of it on screen, one into the next
 *   as the camera goes from the town out over the country and the sea - as
 *   real as the hum of the town (shared/gen/country): the woods and the
 *   fields - a breath of air in the trees and the birds of a wood singing
 *   by day, crickets and an owl at night; the beach - small waves breaking
 *   along it, big ones in a gale, and gulls over it by day; the open sea,
 *   far out - mostly the wind, and the crests breaking white. Louder the
 *   closer the camera is;
 * - the hum of the town heard from above (shared/gen/skyline): full over
 *   the busy middle of a town - its shops, offices and works, and the cars
 *   going about it - and faint and dull, far off, over the outskirts and
 *   the quieter streets of houses, or with the town just off the screen;
 *   gone in the woods. By day, at rush hour and by night;
 * - thunder with the lightning (client/weather), coming a moment before the
 *   flash;
 * - horns: a car stood in a jam a while honks, now and then, and every so
 *   often two cars give each other a toot going by - to the left or the
 *   right of where they are on screen, quieter further off.
 *
 * For now only the hum of the town and the places are heard (QUIET): the
 * music, the thunder and the horns are kept quiet - the music with no way
 * to turn it on.
 *
 * Nothing plays until the page is first touched, clicked or typed at - a
 * browser plays nothing before. The sounds (the places, the hum of the
 * town, thunder, horns) are turned on and off with S, their button in the
 * top bar (Soundman#toggle), or ?sounds=off (?sound=off too); kept in the
 * browser for next time. It all stops while the page is out of sight.
 */
import engine from "engine";
import * as glMatrix from "gl-matrix";
import Config from "../config";
import Weather from "../weather";
import BuildingClassCode from "../../data/classcode";
import TerrainType from "../../core/terraintype";
import Terrain from "../../core/terrain";
import Maker from "./maker";
import MusicPlayer from "./music";
import { wake } from "./wake";

//what is kept quiet for now
var QUIET = {
  music: true,
  places: false,
  skyline: false,
  thunder: true,
  horns: true,
};

//how loud each of them is, under everything
var LOUD = { music: 0.42, places: 0.6, events: 0.75 };

//how often what is on screen is looked over, ms, and over how many points a
//side
var SURVEY_EVERY = 500,
  SURVEY_GRID = 11;

//how long before the flash the thunder starts, and how far ahead flashes are
//looked for, ms
var THUNDER_LEAD = 280,
  THUNDER_AHEAD = 1500;

//horns: how long a car stands in a jam before it may honk, ms, and the
//chance it does, each time it may; how long it waits before it may again;
//the chance two cars going by each other toot; how far apart two horns are,
//at least, ms; and how often the cars are looked over for them
var JAM_AFTER = 3500,
  JAM_ODDS = 0.3,
  HONK_AGAIN = 9000,
  PASS_ODDS = 0.06,
  HORN_GAP = 1200,
  HORNS_EVERY = 250;

//the loops of the places: which sound, by what share of the screen it
//plays (Soundman#survey) and when - the town has its own, the skyline -
//and whether the rain drowns it out a bit (the birds, the gulls)
var PLACES = [
  { name: "woods/0", by: "wild", when: "day", wet: true },
  { name: "woods/1", by: "wild", when: "night", wet: true },
  { name: "beach/0", by: "shore", when: "calm day", wet: true },
  { name: "beach/1", by: "shore", when: "calm night" },
  { name: "beach/2", by: "shore", when: "rough" },
  { name: "offshore/0", by: "open", when: "calm" },
  { name: "offshore/1", by: "open", when: "rough" },
];

//how much of the woods' sound the open fields have - the air and the birds,
//only fewer of them; and how much of it the town on screen hushes
var FIELDS = 0.6,
  TOWN_HUSH = 0.6;

//the hum of the town: by day, at rush hour and by night
var SKYLINE = { day: "skyline/0", rush: "skyline/1", night: "skyline/2" };

//the hum of the town: how far round the screen the town is looked for, to
//be heard far off - so many times as far as the screen reaches; how much
//of the screen being shops, offices and works, and how many cars going on
//it a tile, is as busy as it gets; how loud it is far off, next to over
//the busy middle; and how much of the top of it is left far off, and over
//the busy middle, Hz
var AROUND = 2.5,
  BUSY_BUILT = 0.2,
  BUSY_CARS = 0.02,
  FAR_OFF = 0.28,
  FAR_DULL = 700,
  NEAR_DULL = 18000;

//the horn each kind of car has: shared/gen/sounds horn ways
var HORNS = {
  sedan: 0,
  hatchback: 0,
  taxi: 1,
  police: 1,
  pickup: 2,
  van: 2,
  truck: 3,
  lorry: 3,
  bus: 3,
};

//where each is kept on or off in the browser - and where both were, before
//they were turned on and off on their own
var STORE = { music: "isometrica.music", sounds: "isometrica.sounds" },
  STORE_BOTH = "isometrica.sound",
  vec3 = glMatrix.vec3,
  at = new Float32Array(3),
  onScreen = new Float32Array(3);

function clamp(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function smooth(k) {
  k = clamp(k);

  return k * k * (3 - 2 * k);
}

function stored(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function store(key, v) {
  try {
    localStorage.setItem(key, v);
  } catch (e) {
    //not kept: as it is now, then
  }
}

//whether the music or the sounds are wanted: as asked in the address, or
//as kept, or as both were kept, or on
function wanted(which) {
  var q = location.search,
    asked = new RegExp("[?&]" + which + "=(on|off)").exec(q),
    both = /[?&]sound=(on|off)/.exec(q),
    kept = stored(STORE[which]);

  if (asked) return asked[1] === "on";
  if (both) return both[1] === "on";
  if (kept !== null) return kept !== "off";

  return stored(STORE_BOTH) !== "off";
}

export default function Soundman(root) {
  this.root = root;
  //the music and the sounds, each on or off - and on, if either is
  //(the music never, while it is kept quiet)
  this.wants = {
    music: !QUIET.music && wanted("music"),
    sounds: wanted("sounds"),
  };
  this.on = this.wants.music || this.wants.sounds;
  this.context = null;
  this.out = null;
  this.buses = null;
  this.maker = null;
  this.music = null;
  this.loops = {};
  this.surveyed = -Infinity;
  this.heard = -Infinity;
  this.thunders = {};
  this.lastHorn = -Infinity;
  this.honked = new WeakMap();
  this.stood = new WeakMap();
  this.pitch = new WeakMap();
  this.kinds = new WeakMap();
  this.kindsAt = -Infinity;
  this.land = {
    sea: 0,
    shore: 0,
    open: 0,
    forest: 0,
    wild: 0,
    city: 0,
    busy: 0,
    cars: 0,
    around: 0,
  };
  this.dull = null;
  this.listeners = [];
}

Soundman.events = { change: "change" };

/**
 * Starts listening for the first touch, click or key, and ticking along with
 * the game.
 */
Soundman.prototype.init = function () {
  var self = this,
    go = new engine.GameObject("soundman");

  go.addComponent(new SoundScript(this));
  this.root.game.logic.world.addGameObject(go);

  //the first touch wakes it - and every one after, in case the phone put it
  //to sleep (a call, the lock)
  ["pointerdown", "touchend", "keydown"].forEach(function (type) {
    window.addEventListener(
      type,
      function () {
        if (self.on) self.start();
      },
      true,
    );
  });

  window.addEventListener("keydown", function (e) {
    var target = e.target && e.target.tagName;

    if (target === "INPUT" || target === "TEXTAREA" || e.repeat) return;
    if (e.key === "s" || e.key === "S") self.toggle("sounds");
  });

  document.addEventListener("visibilitychange", function () {
    if (self.context === null) return;

    if (document.hidden) self.context.suspend();
    else if (self.on) self.context.resume();
  });
};

/**
 * Turns the music or the sounds on or off, and keeps it so for next time.
 * Call it from a tap or a click, so that a phone lets it play.
 *
 * @param which {"music"|"sounds"}
 * @param [on] {boolean} on or off; the other way round from now, unless
 *        given
 */
Soundman.prototype.toggle = function (which, on) {
  this.wants[which] = on === undefined ? !this.wants[which] : on;
  this.on = this.wants.music || this.wants.sounds;
  store(STORE[which], this.wants[which] ? "on" : "off");

  if (this.on) this.start();
  else if (this.context !== null)
    this.out.gain.setTargetAtTime(0, this.context.currentTime, 0.05);

  this.listeners.forEach(function (fn) {
    fn();
  });
};

//the music and the sounds turned up or down to what is wanted of each
Soundman.prototype.level = function () {
  var now = this.context.currentTime;

  for (var k in LOUD)
    this.buses[k].gain.setTargetAtTime(
      LOUD[k] * (this.wants[k === "music" ? "music" : "sounds"] ? 1 : 0),
      now,
      0.05,
    );
};

//told whenever the music or the sounds are turned on or off
Soundman.prototype.onChange = function (fn) {
  this.listeners.push(fn);
};

//from a touch: the context made and running, and turned up
Soundman.prototype.start = function () {
  var ctx = wake();

  if (this.context === null) {
    this.context = ctx;

    var limit = ctx.createDynamicsCompressor();

    limit.threshold.value = -10;
    limit.ratio.value = 6;
    limit.connect(ctx.destination);

    this.out = ctx.createGain();
    this.out.gain.value = 0;
    this.out.connect(limit);

    this.buses = {};
    for (var k in LOUD) {
      this.buses[k] = ctx.createGain();
      this.buses[k].gain.value = 0;
      this.buses[k].connect(this.out);
    }

    this.maker = new Maker(ctx);
    this.music = new MusicPlayer(ctx, this.maker, this.buses.music);
  }

  this.level();
  this.out.gain.setTargetAtTime(1, ctx.currentTime, 0.3);
};

//whether anything is to be heard now
Soundman.prototype.live = function () {
  return (
    this.on &&
    this.context !== null &&
    this.context.state === "running" &&
    !document.hidden
  );
};

/**
 * Once a frame.
 */
Soundman.prototype.frame = function () {
  if (!this.live()) return;

  var wall = performance.now(),
    lighting = this.root.lighting,
    weather = lighting && lighting.weather,
    sounds = this.wants.sounds;

  if (!weather || !this.root.camera) return;

  if (wall - this.surveyed >= SURVEY_EVERY) {
    this.surveyed = wall;
    this.survey();
    if (sounds && !QUIET.places) this.places(weather);
    if (sounds && !QUIET.skyline) this.skyline();
    //(nothing new made for what is turned off)
    if (this.wants.music) this.music.update(this.place(), this.time(), weather);
  }

  if (sounds && !QUIET.thunder) this.thunder(wall, weather);

  if (wall - this.heard >= HORNS_EVERY) {
    var dt = wall - this.heard;

    this.heard = wall;
    if (sounds && dt < 1000 && !QUIET.horns) this.horns(wall, dt);
  }
};

/* ------------------------------------------------------------------------
 * What is on screen
 * --------------------------------------------------------------------- */

//the tile at the middle of the screen, and how many tiles it is from there
//to a corner of it
Soundman.prototype.view = function () {
  var camera = this.root.camera,
    p = camera.transform.getPosition(at),
    corner = camera.camera.frustumSize[1],
    width = Config.tileSize * Math.SQRT2;

  return {
    x: p[0] / Config.tileSize,
    y: p[2] / Config.tileSize,
    reach: corner[0] / width + corner[1] / (width / 2),
    zoom: camera.camera.zoom || 1,
  };
};

/**
 * How much of what is on screen is sea, shore, woods and town: the share of
 * a grid of points over it each is.
 */
Soundman.prototype.survey = function () {
  var core = this.root.core,
    terrain = core.terrain,
    buildings = core.buildingService,
    env = core.envService,
    roads = this.root.roadman,
    v = this.view(),
    r = v.reach * 0.55,
    count = {
      sea: 0,
      shore: 0,
      forest: 0,
      fields: 0,
      city: 0,
      busy: 0,
      around: 0,
    },
    n = 0,
    x,
    y,
    b;

  for (var j = 0; j < SURVEY_GRID; j++)
    for (var i = 0; i < SURVEY_GRID; i++) {
      x = Math.round(v.x + r * ((2 * i) / (SURVEY_GRID - 1) - 1));
      y = Math.round(v.y + r * ((2 * j) / (SURVEY_GRID - 1) - 1));

      var tile = Terrain.convertToIndex(x, y),
        type = terrain.getTerrainType(tile);

      n++;

      if (type === TerrainType.water) {
        count.sea++;
        continue;
      }
      if (type === TerrainType.shore) {
        count.shore++;
        continue;
      }

      b = buildings.get(tile);

      var cls = b && b.data ? b.data.classCode : -1;

      if (town(cls, tile, roads)) {
        count.city++;
        //the busy middle of a town: its shops, offices and works
        if (
          cls === BuildingClassCode.commerce ||
          cls === BuildingClassCode.industry ||
          cls === BuildingClassCode.municipal
        )
          count.busy++;
      } else if (b === null && env.hasTree(tile)) count.forest++;
      else count.fields++;
    }

  //the town round about, off the screen too - heard from afar
  var far = r * AROUND,
    m = 0;

  for (j = 0; j < SURVEY_GRID; j++)
    for (i = 0; i < SURVEY_GRID; i++) {
      x = Math.round(v.x + far * ((2 * i) / (SURVEY_GRID - 1) - 1));
      y = Math.round(v.y + far * ((2 * j) / (SURVEY_GRID - 1) - 1));
      m++;

      var t = Terrain.convertToIndex(x, y);

      b = buildings.get(t);
      if (town(b && b.data ? b.data.classCode : -1, t, roads)) count.around++;
    }

  //the cars going about on screen, a tile
  var traffic = this.root.carman && this.root.carman.traffic,
    cars = 0;

  if (traffic)
    for (i = 0; i < traffic.drivers.length; i++) {
      var d = traffic.drivers[i];

      if (
        d.alive &&
        !d.parked &&
        Math.abs(d.x - v.x) <= r &&
        Math.abs(d.y - v.y) <= r
      )
        cars++;
    }

  //the shore is a thin line: where there is sea and land both, it is there
  var shore = Math.min(
    1,
    (count.shore / n) * 4 +
      Math.min(count.sea, n - count.sea - count.shore) / n,
  );

  this.land = {
    sea: count.sea / n,
    shore: shore,
    //the sea with no beach to it: out from the shore
    open: (count.sea / n) * (1 - shore),
    forest: count.forest / n,
    //the woods, and the fields round them
    wild: Math.min(1, (count.forest + count.fields * FIELDS) / n),
    city: count.city / n,
    busy: count.busy / n,
    cars: cars / (4 * r * r),
    around: count.around / m,
  };
};

//whether a tile is the town's: a building of it, or a paved road
function town(cls, tile, roads) {
  return (
    cls === BuildingClassCode.house ||
    cls === BuildingClassCode.commerce ||
    cls === BuildingClassCode.industry ||
    cls === BuildingClassCode.municipal ||
    (cls === BuildingClassCode.road && !!roads && roads.paved(tile))
  );
}

//how much of daylight there is: 1 the day, 0 the night, between at dawn and
//dusk - by the hour the city is drawn at, so all day while the day and the
//night do not go by
Soundman.prototype.daylight = function () {
  var h = this.root.lighting.shownHour();

  return smooth((h - 5) / 1.5) * smooth((21 - h) / 1.5);
};

Soundman.prototype.time = function () {
  return this.daylight() > 0.5 ? "day" : "night";
};

//the music's place: the city, a small town, or out of town
Soundman.prototype.place = function () {
  var city = this.land.city;

  return city > 0.3 ? "city" : city > 0.06 ? "town" : "outside";
};

/**
 * The loops of the places turned up and down to what is on screen, the time
 * and the weather - each made the first time it is wanted.
 */
Soundman.prototype.places = function (weather) {
  var land = this.land,
    day = this.daylight(),
    rough = smooth((weather.wind - 0.9) / 1.2),
    v = this.view(),
    //closer in, louder
    near = 0.55 + 0.45 * clamp((v.zoom - 0.5) / 1.5),
    //rain and storm drown the birds and the gulls out a bit
    wet = 1 - 0.6 * clamp(weather.rain),
    //the town on screen has the country quieter under its hum
    hush = 1 - TOWN_HUSH * smooth(land.city / 0.3),
    when = {
      day: day,
      night: 1 - day,
      calm: 1 - rough,
      rough: rough,
      "calm day": (1 - rough) * day,
      "calm night": (1 - rough) * (1 - day),
    },
    self = this;

  PLACES.forEach(function (p) {
    //one into the next by power, so it does not dip in between
    var share = Math.sqrt(land[p.by]),
      gain = share * Math.sqrt(clamp(when[p.when])) * near;

    if (p.by === "wild") gain *= hush;
    if (p.wet) gain *= wet;

    self.loop(p.name, gain);
  });
};

/**
 * The hum of the town, from above: full over the busy middle of one - the
 * shops, offices and works on screen, and the cars going about it - and far
 * off, faint and dull, wherever there is any of the town on screen or round
 * about it; hushed in the woods. The day's, the rush hour's and the night's
 * by the clock, one into the next.
 */
Soundman.prototype.skyline = function () {
  var land = this.land,
    ctx = this.context,
    v = this.view(),
    built = smooth(land.busy / BUSY_BUILT),
    going = smooth(land.cars / BUSY_CARS),
    //as busy as it gets: the middle of a town, with its traffic
    busy = smooth(0.55 * built + 0.45 * going) * smooth(land.city / 0.3),
    //any of the town about, near or a little way off
    about = smooth(Math.max(land.city, land.around) / 0.12),
    //the woods hush what is far off, not the town itself on screen
    woods = smooth((land.forest - 0.25) / 0.35) * (1 - busy),
    //closer in, a little louder
    near = 0.8 + 0.2 * clamp((v.zoom - 0.5) / 1.5),
    gain = Math.max(FAR_OFF * about, busy) * (1 - woods) * near,
    day = this.daylight(),
    rush = day * this.rush(),
    self = this;

  if (this.dull === null) {
    this.dull = ctx.createBiquadFilter();
    this.dull.type = "lowpass";
    this.dull.Q.value = 0.5;
    this.dull.frequency.value = FAR_DULL;
    this.dull.connect(this.buses.places);
  }

  //far off, only the low of it comes through
  this.dull.frequency.setTargetAtTime(
    FAR_DULL * Math.pow(NEAR_DULL / FAR_DULL, busy),
    ctx.currentTime,
    0.8,
  );

  //one into the next by power, so the hum does not dip in between
  [
    [SKYLINE.day, day - rush],
    [SKYLINE.rush, rush],
    [SKYLINE.night, 1 - day],
  ].forEach(function (w) {
    self.loop(w[0], gain * Math.sqrt(clamp(w[1])), self.dull);
  });
};

//how much of the rush hour it is: 0..1, most from 7:30 to 9 in the morning
//and from 16:30 to 18:30 of an evening
Soundman.prototype.rush = function () {
  var h = this.root.lighting.shownHour(),
    morning = smooth((h - 6.75) / 0.75) * smooth((9.75 - h) / 0.75),
    evening = smooth((h - 15.75) / 0.75) * smooth((19.25 - h) / 0.75);

  return Math.max(morning, evening);
};

Soundman.prototype.loop = function (name, gain, into) {
  var l = this.loops[name],
    ctx = this.context,
    self = this;

  if (l === undefined) {
    if (gain < 0.02) return;

    l = this.loops[name] = { gain: ctx.createGain(), source: null };
    l.gain.gain.value = 0;
    l.gain.connect(into || this.buses.places);

    this.maker.get("sound", name).then(function (buf) {
      var s = self.context.createBufferSource();

      s.buffer = buf;
      s.loop = true;
      s.connect(l.gain);
      //somewhere into it, so two of the same do not start together
      s.start(0, Math.random() * buf.duration);
      l.source = s;
    });
  }

  l.gain.gain.setTargetAtTime(gain, ctx.currentTime, 0.8);
};

/* ------------------------------------------------------------------------
 * Thunder
 * --------------------------------------------------------------------- */

/**
 * Every flash of lightning to come in a little while has its thunder
 * started a moment before it - the rumble coming up and the crack of it as
 * the sky lights up.
 */
Soundman.prototype.thunder = function (wall, weather) {
  var flashes = Weather.flashesAhead(wall, weather.storm, THUNDER_AHEAD),
    ctx = this.context,
    self = this;

  flashes.forEach(function (f) {
    if (self.thunders[f.slot]) return;

    var name = "thunder/" + (f.slot % 4),
      buf = self.maker.ready("sound", name);

    //made in time for the next one, if not this one
    if (buf === null) {
      self.maker.get("sound", name, true);
      return;
    }

    self.thunders[f.slot] = true;

    var when = ctx.currentTime + (f.at - THUNDER_LEAD - wall) / 1000;

    self.play(buf, {
      when: Math.max(ctx.currentTime, when),
      gain: 0.7 + 0.3 * weather.storm,
      pan: ((f.slot * 0.618) % 1) * 1.2 - 0.6,
    });
  });

  //forget the old ones
  for (var slot in this.thunders)
    if (+slot < Math.floor(wall / 1700) - 4) delete this.thunders[slot];

  //before the storm breaks, make the thunder ready
  if (weather.storm > 0.15 && this.maker.ready("sound", "thunder/0") === null)
    for (var i = 0; i < 4; i++) this.maker.get("sound", "thunder/" + i);
};

/* ------------------------------------------------------------------------
 * Horns
 * --------------------------------------------------------------------- */

//where a driver is on screen: x, y -1..1 across it, or null if well off it
Soundman.prototype.where = function (d, toViewport) {
  at[0] = d.x * Config.tileSize;
  at[1] = 0;
  at[2] = d.y * Config.tileSize;
  vec3.transformMat4(onScreen, at, toViewport);

  if (Math.abs(onScreen[0]) > 1.2 || Math.abs(onScreen[1]) > 1.2) return null;

  return { x: onScreen[0], y: onScreen[1] };
};

//the kind of car a driver drives, if it is one of the town's cars
Soundman.prototype.kind = function (d, wall) {
  var carman = this.root.carman;

  if (wall - this.kindsAt > 2000) {
    this.kindsAt = wall;
    for (var i = 0; i < carman.cars.length; i++) {
      var car = carman.cars[i].car;

      if (car && car.driver) this.kinds.set(car.driver, car.type.name);
    }
  }

  return this.kinds.get(d);
};

/**
 * The cars on screen looked over: one stood in a jam a while may honk, and
 * two going by each other may give a toot.
 */
Soundman.prototype.horns = function (wall, dt) {
  var carman = this.root.carman,
    traffic = carman && carman.traffic;

  if (!traffic) return;

  var toViewport = this.root.camera.camera.getWorldToViewport(),
    drivers = traffic.drivers,
    moving = [],
    i,
    d,
    p;

  for (i = 0; i < drivers.length; i++) {
    d = drivers[i];
    if (!d.alive || d.parked) continue;

    p = this.where(d, toViewport);
    if (p === null) continue;

    //stood in a queue or at a junction, not at a stop or by the kerb
    var jammed =
        d.v < 0.05 &&
        (d.held === "queue" || d.held === "junction" || d.held === "merge"),
      stood = jammed ? (this.stood.get(d) || 0) + dt : 0;

    this.stood.set(d, stood);

    if (
      stood > JAM_AFTER &&
      wall - (this.honked.get(d) || -Infinity) > HONK_AGAIN
    ) {
      this.honked.set(d, wall);
      if (Math.random() < JAM_ODDS) this.honk(d, p, wall, false);
    }

    if (d.v > 0.5) moving.push({ d: d, p: p });
  }

  //going by each other: close, and heading opposite ways
  for (i = 0; i < moving.length; i++)
    for (var j = i + 1; j < moving.length; j++) {
      var a = moving[i].d,
        b = moving[j].d,
        dx = a.x - b.x,
        dy = a.y - b.y;

      if (dx * dx + dy * dy > 1.2 || a.hx * b.hx + a.hy * b.hy > -0.7) continue;

      var who = Math.random() < 0.5 ? moving[i] : moving[j];

      if (wall - (this.honked.get(who.d) || -Infinity) < HONK_AGAIN * 2)
        continue;

      this.honked.set(a, wall);
      this.honked.set(b, wall);
      if (Math.random() < PASS_ODDS) this.honk(who.d, who.p, wall, true);
    }
};

Soundman.prototype.honk = function (d, p, wall, friendly) {
  if (wall - this.lastHorn < HORN_GAP) return;

  var kind = this.kind(d, wall),
    way = HORNS[kind] === undefined ? 0 : HORNS[kind];

  //a toot going by: the short ones
  if (friendly && way === 3) way = 0;

  var name = "horn/" + way,
    buf = this.maker.ready("sound", name);

  if (buf === null) {
    this.maker.get("sound", name, true);
    return;
  }

  this.lastHorn = wall;

  var off = Math.sqrt(p.x * p.x + p.y * p.y),
    v = this.view(),
    near = 0.5 + 0.5 * clamp((v.zoom - 0.5) / 1.5);

  //each car its own pitch, a little
  if (!this.pitch.has(d)) this.pitch.set(d, 0.9 + Math.random() * 0.25);

  this.play(buf, {
    gain: (friendly ? 0.35 : 0.5) * near * (1 - 0.45 * clamp(off)),
    pan: p.x * 0.8,
    rate: this.pitch.get(d),
  });
};

/* ------------------------------------------------------------------------ */

//plays a buffer once: {when, gain, pan, rate}
Soundman.prototype.play = function (buf, o) {
  var ctx = this.context,
    s = ctx.createBufferSource(),
    g = ctx.createGain(),
    last = g;

  s.buffer = buf;
  if (o.rate) s.playbackRate.value = o.rate;
  g.gain.value = o.gain === undefined ? 1 : o.gain;
  s.connect(g);

  if (o.pan && ctx.createStereoPanner) {
    var pan = ctx.createStereoPanner();

    pan.pan.value = Math.max(-1, Math.min(1, o.pan));
    g.connect(pan);
    last = pan;
  }

  last.connect(this.buses.events);
  s.onended = function () {
    last.disconnect();
  };
  s.start(o.when || 0);
};

function SoundScript(man) {
  engine.Component.call(this);
  this.man = man;
}

SoundScript.prototype = Object.create(engine.Component.prototype);

SoundScript.prototype.tick = function () {
  this.man.frame();
};
