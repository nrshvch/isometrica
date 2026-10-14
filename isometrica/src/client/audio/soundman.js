/**
 * What the game sounds like - every sound of it made, not recorded
 * (shared/gen/sounds, shared/gen/music; made in workers, client/audio/maker):
 *
 * - the music (client/audio/music): a piece for the kind of place on screen -
 *   the city, a small town, the country - by day or by night, going with the
 *   weather;
 * - the place itself, by what there is of it on screen: birds in the woods,
 *   the hum of the city, the sea, gulls over the shore - day ones and night
 *   ones, louder the closer the camera is;
 * - thunder with the lightning (client/weather), coming a moment before the
 *   flash;
 * - horns: a car stood in a jam a while honks, now and then, and every so
 *   often two cars give each other a toot going by - to the left or the
 *   right of where they are on screen, quieter further off.
 *
 * - a police car's siren, from the car - to the left or the right of where
 *   it is on screen, quieter further off - the nearest two of them.
 *
 * For now only the music and the sirens are heard (QUIET): the places, the
 * thunder and the horns are kept quiet.
 *
 * Nothing plays until the page is first touched, clicked or typed at - a
 * browser plays nothing before - and nothing plays with the sound off: M,
 * the speaker in the top bar (Soundman#toggle), or ?sound=off; kept in the
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
var QUIET = { places: true, thunder: true, horns: true };

//the sirens: how many are heard at once, the nearest, and how loud one is
//in the middle of the screen
var SIRENS_MOST = 2,
  SIREN_LOUD = 0.3;

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

//the loops of the places: which sound, and by what share of the screen it
//plays (Soundman#survey)
var PLACES = [
  { name: "forest/0", by: "forest", when: "day" },
  { name: "forest/1", by: "forest", when: "night" },
  { name: "city/0", by: "city", when: "day" },
  { name: "city/1", by: "city", when: "night" },
  { name: "sea/0", by: "sea", when: "calm" },
  { name: "sea/1", by: "sea", when: "rough" },
  { name: "gulls/0", by: "shore", when: "day" },
];

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

var STORE = "isometrica.sound",
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

function stored() {
  try {
    return localStorage.getItem(STORE);
  } catch (e) {
    return null;
  }
}

function store(v) {
  try {
    localStorage.setItem(STORE, v);
  } catch (e) {
    //not kept: as it is now, then
  }
}

export default function Soundman(root) {
  this.root = root;
  this.on =
    !/[?&]sound=off/.test(location.search) &&
    (stored() !== "off" || /[?&]sound=on/.test(location.search));
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
  this.land = { sea: 0, shore: 0, forest: 0, city: 0 };
  //the sirens heard, by the driver of the police car
  this.sirens = new Map();
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
    if (e.key === "m" || e.key === "M") self.toggle();
  });

  document.addEventListener("visibilitychange", function () {
    if (self.context === null) return;

    if (document.hidden) self.context.suspend();
    else if (self.on) self.context.resume();
  });
};

/**
 * Turns the sound on or off, and keeps it so for next time. Call it from a
 * tap or a click, so that a phone lets it play.
 */
Soundman.prototype.toggle = function (on) {
  this.on = on === undefined ? !this.on : on;
  store(this.on ? "on" : "off");

  if (this.on) this.start();
  else if (this.context !== null) {
    var now = this.context.currentTime;

    this.out.gain.setTargetAtTime(0, now, 0.05);
  }

  this.listeners.forEach(function (fn) {
    fn();
  });
};

//told whenever the sound is turned on or off
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
      this.buses[k].gain.value = LOUD[k];
      this.buses[k].connect(this.out);
    }

    this.maker = new Maker(ctx);
    this.music = new MusicPlayer(ctx, this.maker, this.buses.music);
  }

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
    weather = lighting && lighting.weather;

  if (!weather || !this.root.camera) return;

  if (wall - this.surveyed >= SURVEY_EVERY) {
    this.surveyed = wall;
    this.survey();
    if (!QUIET.places) this.places(weather);
    this.music.update(this.place(), this.time(), weather);
  }

  if (!QUIET.thunder) this.thunder(wall, weather);

  if (wall - this.heard >= HORNS_EVERY) {
    var dt = wall - this.heard;

    this.heard = wall;
    if (dt < 1000 && !QUIET.horns) this.horns(wall, dt);
    this.siren();
  }
};

/* ------------------------------------------------------------------------
 * Sirens
 * --------------------------------------------------------------------- */

/**
 * The police cars on screen, the nearest SIRENS_MOST of them, each with its
 * siren going, from where it is - louder the nearer the middle of the
 * screen and the closer in the camera is; the others' fading away.
 */
Soundman.prototype.siren = function () {
  var carman = this.root.carman;

  if (!carman || !carman.cars) return;

  var toViewport = this.root.camera.camera.getWorldToViewport(),
    ctx = this.context,
    v = this.view(),
    near = 0.5 + 0.5 * clamp((v.zoom - 0.5) / 1.5),
    found = [],
    self = this;

  carman.cars.forEach(function (go) {
    var car = go.car,
      d = car && car.driver;

    if (!d || car.type.name !== "police" || !d.alive || d.parked) return;

    var p = self.where(d, toViewport);

    if (p !== null)
      found.push({ d: d, p: p, off: Math.sqrt(p.x * p.x + p.y * p.y) });
  });

  found.sort(function (a, b) {
    return a.off - b.off;
  });
  found.length = Math.min(found.length, SIRENS_MOST);

  //the ones no longer heard fade away, and stop
  this.sirens.forEach(function (l, d) {
    if (
      found.some(function (f) {
        return f.d === d;
      })
    )
      return;

    l.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    l.source.stop(ctx.currentTime + 1.5);
    self.sirens.delete(d);
  });

  found.forEach(function (f, i) {
    var l = self.sirens.get(f.d);

    if (l === undefined) {
      var name = "siren/" + (i % 3),
        buf = self.maker.ready("sound", name);

      if (buf === null) {
        self.maker.get("sound", name);
        return;
      }

      l = {
        source: ctx.createBufferSource(),
        gain: ctx.createGain(),
        pan: ctx.createStereoPanner ? ctx.createStereoPanner() : null,
      };
      l.source.buffer = buf;
      l.source.loop = true;
      l.gain.gain.value = 0;
      l.source.connect(l.gain);
      if (l.pan) {
        l.gain.connect(l.pan);
        l.pan.connect(self.buses.events);
      } else l.gain.connect(self.buses.events);
      l.source.start(0, Math.random() * buf.duration);
      self.sirens.set(f.d, l);
    }

    l.gain.gain.setTargetAtTime(
      SIREN_LOUD * near * (1 - 0.6 * clamp(f.off)),
      ctx.currentTime,
      0.2,
    );
    if (l.pan)
      l.pan.pan.setTargetAtTime(
        Math.max(-1, Math.min(1, f.p.x * 0.8)),
        ctx.currentTime,
        0.1,
      );
  });
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
    count = { sea: 0, shore: 0, forest: 0, city: 0 },
    n = 0;

  for (var j = 0; j < SURVEY_GRID; j++)
    for (var i = 0; i < SURVEY_GRID; i++) {
      var x = Math.round(v.x + r * ((2 * i) / (SURVEY_GRID - 1) - 1)),
        y = Math.round(v.y + r * ((2 * j) / (SURVEY_GRID - 1) - 1)),
        tile = Terrain.convertToIndex(x, y),
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

      var b = buildings.get(tile),
        cls = b && b.data ? b.data.classCode : -1;

      if (
        cls === BuildingClassCode.house ||
        cls === BuildingClassCode.commerce ||
        cls === BuildingClassCode.industry ||
        cls === BuildingClassCode.municipal ||
        (cls === BuildingClassCode.road && roads && roads.paved(tile))
      )
        count.city++;
      else if (b === null && env.hasTree(tile)) count.forest++;
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
    forest: count.forest / n,
    city: count.city / n,
  };
};

//how much of daylight there is: 1 the day, 0 the night, between at dawn and
//dusk
Soundman.prototype.daylight = function () {
  var h = this.root.lighting.hour();

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
    self = this;

  PLACES.forEach(function (p) {
    var share = Math.sqrt(land[p.by]),
      when =
        p.when === "day"
          ? day
          : p.when === "night"
            ? 1 - day
            : p.when === "calm"
              ? 1 - rough
              : rough,
      gain = share * when * near;

    if (p.name.indexOf("forest") === 0 || p.name.indexOf("gulls") === 0)
      gain *= wet;
    if (p.name.indexOf("gulls") === 0) gain *= 1 - rough * 0.7;

    self.loop(p.name, gain);
  });
};

Soundman.prototype.loop = function (name, gain) {
  var l = this.loops[name],
    ctx = this.context,
    self = this;

  if (l === undefined) {
    if (gain < 0.02) return;

    l = this.loops[name] = { gain: ctx.createGain(), source: null };
    l.gain.gain.value = 0;
    l.gain.connect(this.buses.places);

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
