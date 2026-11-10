import engine from "engine";
import Events from "events";
import Core from "../core/main";
import CoreConfig from "../core/config";
import VTime from "../core/vtime";
import BuildingState from "../core/buildingstate";
import CoreBuilding from "../core/building";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import Demolition from "./demolition";
import Carman from "./carman";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import { changed } from "./looks";

/**
 * Buildings on fire (core/building ignite), as they burn down over a day of
 * the game's time.
 *
 * It catches in a window of a floor low down, and spreads from there,
 * window by window - up faster than down, along a floor slower than up -
 * till every window of it is ablaze (Blaze). Flames lick up out of every
 * window that is (FireRenderer), from a white-hot root to orange and red
 * tongues, flickering, bright whatever the light and lighting what is round
 * them after dark; the wall over each is blackened with soot as it burns;
 * sparks fly up out of it. Smoke pours out of the windows, and black smoke
 * rolls up off the top of it, a column of it as big as the building is
 * (SmokeScript plume), on up high and off the way the wind blows, over the
 * city - thicker as more of it burns.
 *
 * Its lights out, its people gone, it comes down in the end
 * (core/building BURNS) the way a building comes down (client/demolition),
 * no fence round it, no bulldozer: floor onto floor in a cloud of dust and
 * smoke - and what is left of it (client/ruin) burns on, flames among the
 * charred walls, the smoke thinning (REMAINS), then smoulders a while, a
 * wisp of smoke here and there, embers glowing (SMOULDERS) - and then it
 * is a cold ruin, there till it is cleared away.
 *
 * All of it goes by the game's time from when it was set on fire, so it is
 * as far along after a reload as it would have been: only what is drawn of
 * it is the client's.
 */

var Terrain = Core.Terrain,
  HOUR = 3600000,
  BURNS = CoreBuilding.BURNS / HOUR,
  REMAINS = CoreBuilding.REMAINS / HOUR,
  SMOULDERS = CoreBuilding.SMOULDERS / HOUR;

//how far up the world a pixel up the screen is, and a tile across
var PER_PIXEL = Config.tileZStep / 8,
  TILE = Config.tileSize;

//how high a floor is, pixels; how long a window takes from catching to
//ablaze, hours; how long the fire takes to go up a floor, down one, and
//along one past a window's width (STRIDE pixels), hours - and how late, at
//the most, the last window catches
var STOREY = 13,
  FLARE = 0.9,
  UP = 0.5,
  DOWN = 1.1,
  STRIDE = 14,
  ALONG = 0.4,
  LATEST = 5.4;

//how often the buildings on fire are looked for afresh, ms
var LOOK_EVERY = 1000;

//how charred it is (client/burnt char, 0..100) from so many hours on: a
//little round the first of it, black all over by the end
var CHARS = [
  [1.2, 25],
  [2.5, 45],
  [3.8, 65],
  [5, 80],
  [6.2, 92],
];

//its roof catching once the floor under it has, hours on; and every how
//many pixels along it a flame goes up off it
var ROOF_AFTER = 0.5,
  ROOF_EVERY = 6;

//coming down: how far apart its tiles give, ms, at the most; when what is
//left of it starts to show through the dust, and takes to; and how long it
//takes at the most, whatever is still falling then
var KNOCK_APART = 260,
  RUIN_AT = 900,
  RUIN_MS = 2200,
  FALL_MOST = 14000;

//the black smoke off the top of it: puffs a second at the most, thick as it
//is ablaze; out of a window ablaze, a puff of it now and then, ms
var PLUME_MOST = 5,
  WINDOW_PUFF = [900, 2400];

//sparks: how many at once at the most, how fast they go up, pixels a
//second, and how long they last, ms
var SPARKS = 60,
  SPARK_RISE = [10, 26],
  SPARK_MS = [700, 1700];

//the colours of a flame, from its root up: white-hot, yellow, orange, red,
//and its smoky tip
var FLAME = [
  [255, 250, 206],
  [255, 222, 104],
  [255, 156, 40],
  [236, 82, 22],
  [150, 36, 14],
];

//the light it throws round it after dark, and how far
var GLOW = [1, 0.5, 0.18],
  REACH = 34;

//the soot over a window ablaze, blacker as it burns
var SOOT = [
  "rgba(24,20,18,0.35)",
  "rgba(20,17,15,0.5)",
  "rgba(16,13,12,0.65)",
  "rgba(12,10,9,0.8)",
];

var css = {};

function rgb(c) {
  var k = c[0] + "," + c[1] + "," + c[2];

  return css[k] || (css[k] = "rgb(" + k + ")");
}

//a number 0..1 for i, j and a seed, the same every time
function hash(i, j, s) {
  var h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

function between(range) {
  return range[0] + Math.random() * (range[1] - range[0]);
}

/* --- Fires ------------------------------------------------------------- */

/**
 * @param root {Vkaria}
 */
function Fires(root) {
  this.root = root;
  //what is burning or smouldering in sight, by the tile of its building
  this.blazes = {};
  //a clock of its own, the game's time, ms - a lab bench's, standing still
  //or going as fast as it is asked - or null for the game's own (now)
  this.clock = null;
  //when the game's clock last went on a tick, real time
  this.ticked = 0;
  this.look = LOOK_EVERY;
}

Fires.prototype.init = function () {
  var self = this,
    time = this.root.core.time,
    go = new engine.GameObject("fires");

  go.addComponent(new FiresScript(this));
  this.root.game.logic.world.addGameObject(go);

  this.ticked = performance.now();
  Events.on(time, time.constructor.events.advance, function () {
    self.ticked = performance.now();
  });

  //a building set on fire, come down, gone: looked for at once
  Events.on(
    this.root.core.buildingService,
    this.root.core.buildingService.events.buildingUpdated,
    function () {
      self.look = LOOK_EVERY;
    },
  );
};

/**
 * The game's time now, ms - by its clock, and the part of a tick gone by
 * since it last went on, smoothly; or a bench's own clock.
 */
Fires.prototype.now = function () {
  if (this.clock !== null) return this.clock();

  var time = this.root.core.time;

  return (
    time.now +
    Math.min(1, (performance.now() - this.ticked) / CoreConfig.tickDelay) *
      VTime.millisecondsPerTick
  );
};

/**
 * What is burning in sight, and how many of its windows are ablaze - for a
 * bench to say.
 */
Fires.prototype.status = function () {
  var out = [];

  for (var tile in this.blazes) out.push(this.blazes[tile].status());

  return out;
};

/**
 * Whether anything on fire is coming down still.
 */
Fires.prototype.falling = function () {
  for (var tile in this.blazes)
    if (this.blazes[tile].collapse !== null) return true;

  return false;
};

//every building on fire in sight with a blaze, and none for what is not
function look(self) {
  var views = self.root.buildman.getBuildingViews(),
    now = self.now(),
    seen = {};

  views.forEach(function (b) {
    var model = b.data;

    if (
      !model ||
      model.fire === null ||
      model.fire === undefined ||
      !b.view ||
      now - model.fire >= CoreBuilding.SMOULDERS
    )
      return;

    seen[model.tile] = true;

    var blaze = self.blazes[model.tile];

    if (blaze === undefined || blaze.building !== b) {
      if (blaze !== undefined) blaze.end();
      self.blazes[model.tile] = new Blaze(self, b);
    }
  });

  for (var tile in self.blazes)
    if (seen[tile] !== true) {
      self.blazes[tile].end();
      delete self.blazes[tile];
    }
}

function FiresScript(fires) {
  engine.Component.call(this);
  this.fires = fires;
}

FiresScript.prototype = Object.create(engine.Component.prototype);
FiresScript.prototype.profileName = "fires";

FiresScript.prototype.tick = function (time) {
  var fires = this.fires;

  fires.look += time.dt;
  if (fires.look >= LOOK_EVERY) {
    fires.look = 0;
    look(fires);
  }

  for (var tile in fires.blazes) {
    var blaze = fires.blazes[tile];

    blaze.tick(time.dt);
    if (blaze.over) {
      blaze.end();
      delete fires.blazes[tile];
    }
  }
};

/* --- A building burning ------------------------------------------------- */

/**
 * A building on fire as it is drawn, from when it was set on fire till it
 * is cold.
 *
 * @param building {Building} the client's, its view up
 */
function Blaze(fires, building) {
  var self = this,
    model = building.data,
    iter = model.occupiedTiles();

  this.fires = fires;
  this.root = fires.root;
  this.building = building;
  this.model = model;
  this.tiles = [];
  while (!iter.done) this.tiles.push(iter.next());
  this.seed = (model.tile * 2654435761) >>> 0;
  //its windows, once known (gather): each {go, renderer, x, y, z, floor,
  //catches, seed}
  this.windows = null;
  this.gathering = 0;
  //what is left of it to burn on, once it is down: points over its tiles
  this.embers = embersOf(this);
  this.sparks = [];
  this.plumed = 0;
  //coming down, and how long since, ms; and already down when first seen
  this.collapse = null;
  this.since = 0;
  this.knocks = [];
  this.down = model.getState() === BuildingState.ruin;
  this.over = false;
  this.clock = 0;
  //how tall it stands, pixels - as its windows say, once they do
  this.high = 30;
  //how much of it is ablaze, 0..1
  this.share = 0;
  //the middle of it, on the ground: x, z in the world, and how high there
  this.middle = middleOf(this);
  this.plumeKey = -1;
  this.plumeKind = null;

  var at = building.view.gameObject.transform.getPosition([0, 0, 0]);

  this.go = new engine.GameObject("blaze");
  this.renderer = new FireRenderer(this);
  this.go.addComponent(this.renderer);
  this.go.transform.setPosition(at[0], at[1], at[2]);
  this.root.game.logic.world.addGameObject(this.go);

  //turned round: its windows as they are seen from the new side
  this.turned = Events.on(View, View.events.change, function () {
    self.windows = null;
    self.gathering = 0;
  });
}

//how long it has burnt, of the game's time, hours
Blaze.prototype.hours = function () {
  return (this.fires.now() - this.model.fire) / HOUR;
};

Blaze.prototype.status = function () {
  var h = this.hours(),
    ablaze = 0;

  (this.windows || []).forEach(function (w) {
    if (intensity(w, h) > 0.5) ablaze++;
  });

  return {
    tile: this.model.tile,
    hours: Math.round(h * 10) / 10,
    phase:
      h < BURNS && !this.down
        ? "burning"
        : h < REMAINS
          ? "remains burning"
          : "smouldering",
    windows: this.windows ? this.windows.length : 0,
    ablaze: ablaze,
    sparks: this.sparks.length,
  };
};

Blaze.prototype.end = function () {
  if (this.collapse !== null) {
    var c = this.collapse;

    this.tiles.forEach(function (t) {
      c.letGo(t);
    });
    this.collapse = null;
  }
  if (this.building.view) this.building.view.setOpacity(1);
  if (this.go.world !== null) this.go.world.removeGameObject(this.go);
  if (this.turned !== null) {
    Events.off(View, View.events.change, this.turned);
    this.turned = null;
  }
};

Blaze.prototype.tick = function (dt) {
  var h = this.hours();

  this.clock += dt;

  if (h >= SMOULDERS) {
    this.over = true;
    return;
  }

  //burnt long enough: down it comes - a tick of the game early at most,
  //for the world not to have it down before it is seen to come down; and
  //had the world it down already (a tab left, a frame missed), down it is
  if (!this.down && h >= BURNS - VTime.millisecondsPerTick / HOUR) this.fall();
  else if (!this.down && this.model.getState() === BuildingState.ruin)
    this.down = true;

  if (this.collapse !== null) this.coming(dt);

  if (!this.down) {
    //its view drawn anew (turned, its pictures in): its windows afresh
    if (
      this.windows !== null &&
      this.windows.length > 0 &&
      this.windows[0].go.world === null
    ) {
      this.windows = null;
      this.gathering = 0;
    }
    if (this.windows === null) gather(this, dt);
    char(this, h);
    burning(this, h, dt);
  } else remains(this, h, dt);

  sparksOn(this, dt);
};

/**
 * Its windows, as its pictures say they are (CachedSprite windows) - asked
 * for every frame till they are in, or made up from its shape a while on
 * where they are not - and when each catches: from a window low down, up,
 * down and along, every one by LATEST.
 */
function gather(self, dt) {
  var children = self.building.view.gameObject.transform.children,
    out = [],
    waiting = false;

  self.gathering += dt;

  children.forEach(function (child) {
    var r = child.gameObject.spriteRenderer,
      sprite = r ? r.sprite : null;

    if (!sprite || !sprite.windows) return;

    var ws = sprite.windows();

    if (ws === null) {
      waiting = true;
      return;
    }

    //none of its own, or none to be had: made up from its shape
    if (ws.length === 0) ws = madeUp(sprite, r);

    //and its roof, over its windows - a building's, not its yard's
    if (ws.length > 0) ws = ws.concat(roofOf(sprite, r, ws));

    ws.forEach(function (w) {
      out.push({
        go: child.gameObject,
        renderer: r,
        x: w.x,
        y: w.y,
        z: w.z,
        roof: w.roof === true,
        //across the screen from the middle of what it is on
        across: w.x - r.pivotX,
        floor: Math.max(0, Math.round(w.z / STOREY)),
      });
    });
  });

  if (waiting && self.gathering < 6000) return;

  if (out.length === 0) {
    //nothing to burn out of yet, or ever: tried again in a moment
    if (self.gathering < 6000) return;
  }

  //where it catches: a window of the lowest floors, any of them
  var low = out.filter(function (w) {
      return w.floor <= 1;
    }),
    pool = low.length > 0 ? low : out,
    first = pool[Math.floor(hash(pool.length, 3, self.seed) * pool.length)];

  out.forEach(function (w, i) {
    w.seed = Math.floor(hash(i, 5, self.seed) * 1e6);

    if (w === first) {
      w.catches = 0;
      return;
    }

    var floors = w.floor - first.floor,
      t =
        (floors > 0 ? UP : DOWN) * Math.abs(floors) +
        (Math.abs(w.across - first.across) / STRIDE) * ALONG +
        0.15 +
        0.6 * hash(i, 7, self.seed);

    w.catches =
      Math.min(LATEST + 0.4 * hash(i, 9, self.seed), t) +
      (w.roof ? ROOF_AFTER : 0);
  });

  self.windows = out;
}

//windows made up from a picture's shape where it says of none: a few to a
//floor, where there is anything of it there
function madeUp(sprite, r) {
  var out = [],
    w = sprite.width;

  for (var z = 6; z < r.pivotY - 4; z += STOREY)
    for (var x = 6; x < w - 6; x += 9) {
      var y = r.pivotY - 8 - z;

      if (
        y > 0 &&
        (!sprite.hitAt || sprite.hitAt(x, y, true) || sprite.hitAt(x, y))
      )
        out.push({ x: x, y: y, z: z });
    }

  return out;
}

/**
 * Where flames go up off the top of a picture with windows in it: along the
 * top of it every ROOF_EVERY pixels, a floor over the highest of its windows
 * - roof: true.
 */
function roofOf(sprite, r, ws) {
  var out = [],
    high = 0,
    x,
    y;

  if (!sprite.hitAt) return out;

  ws.forEach(function (w) {
    high = Math.max(high, w.z);
  });

  for (x = 3; x < sprite.width - 3; x += ROOF_EVERY)
    for (y = 0; y < r.pivotY - 12; y++)
      //drawn lit, its picture to be lit is the one in hand
      if (sprite.hitAt(x, y, true) || sprite.hitAt(x, y)) {
        out.push({ x: x, y: y + 2, z: high + STOREY * 0.7, roof: true });
        break;
      }

  return out;
}

/**
 * Its pictures charred as far as the fire has got by h hours in (CHARS,
 * client/burnt char) - put in the place of the ones its view draws, every
 * time it draws them anew; as they are, before it.
 */
function char(self, h) {
  var level = 0;

  CHARS.forEach(function (c) {
    if (h >= c[0]) level = c[1];
  });

  if (level === 0) return;

  var sprites = self.root.sprites,
    words = "c:" + (self.seed % 100000) + ":" + level;

  self.building.view.gameObject.transform.children.forEach(function (child) {
    var r = child.gameObject.spriteRenderer;

    if (
      !r ||
      !r.sprite ||
      r.layer !== RenderLayer.buildingsLayer ||
      r.charred === words
    )
      return;

    if (r.unburnt === undefined) r.unburnt = r.sprite;
    r.setSprite(sprites.burnt(r.unburnt, words));
    r.charred = words;
  });
}

//how far ablaze a window is, hours h in, 0..1
function intensity(w, h) {
  return Math.max(0, Math.min(1, (h - w.catches) / FLARE));
}

//where in the world a window is - x, y, z world units - the point of its
//picture lifted as high as it stands, put back on the ground under it
function worldOf(w) {
  var p = w.go.transform.getPosition([0, 0, 0]),
    sx = w.x - w.renderer.pivotX,
    sy = w.y - w.renderer.pivotY + w.z,
    //along the tile as it is seen, tiles: x - y across, (x + y) / 2 down
    gx = (sx - 2 * sy) / 64,
    gy = (-sx - 2 * sy) / 64,
    v = View.unvector(gx, gy);

  return [p[0] + v[0] * TILE, p[1] + w.z * PER_PIXEL, p[2] + v[1] * TILE];
}

/**
 * Burning: smoke out of its windows ablaze, and black smoke off the top of
 * it - more and more of it, as more of it is.
 */
function burning(self, h, dt) {
  var windows = self.windows || [],
    world = self.root.game.logic.world,
    total = 0,
    top = 0;

  windows.forEach(function (w) {
    var k = intensity(w, h);

    total += k;
    top = Math.max(top, w.z);

    if (k < 0.25) return;

    w.puff = (w.puff === undefined ? between(WINDOW_PUFF) : w.puff) - dt;
    if (w.puff > 0) return;

    w.puff = between(WINDOW_PUFF) / k;

    var at = worldOf(w);

    //pouring out of it, the worst of it billowing out to join what rolls
    //up off the top of it
    SmokeSource.puff(
      world,
      at[0],
      at[1] + 2,
      at[2],
      k > 0.6 && Math.random() < 0.06 ? plumeOf(self) : SmokeScript.soot,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
    );

    if (Math.random() < 0.35 * k) spark(self, w);
  });

  //how much of it is ablaze - a little smoke from the first of it
  var share = windows.length > 0 ? total / windows.length : h / BURNS;

  self.share = share;
  self.high = top || self.high;
  plume(self, Math.max(0.08, share), self.high, dt);
}

/**
 * The black smoke rolling up off it as big as it is: off a house a thinner
 * column of it, not so high and gone sooner, than off a block of flats
 * (SmokeScript plume) - by its ground and how tall it stands.
 */
function plumeOf(self) {
  var size = Math.sqrt(self.tiles.length) * (0.6 + self.high / 50),
    s = Math.max(0.4, Math.min(1, size / 2.6)),
    key = Math.round(s * 10);

  if (self.plumeKey !== key) {
    self.plumeKey = key;
    self.plumeKind = Object.assign({}, SmokeScript.plume, {
      ttl: SmokeScript.plume.ttl * (0.45 + 0.55 * (key / 10)),
      rise: SmokeScript.plume.rise * (0.55 + 0.45 * (key / 10)),
    });
  }

  return self.plumeKind;
}

/**
 * The black smoke rolling up off it: share of it ablaze, puffs off the top
 * of it, as tall as it stands (pixels), more of them the bigger it is.
 */
function plume(self, share, high, dt) {
  var size = Math.sqrt(self.tiles.length) * (0.7 + high / 60),
    rate = Math.min(PLUME_MOST, (0.4 + 2.6 * share) * size);

  self.plumed += (dt / 1000) * rate;

  while (self.plumed >= 1) {
    self.plumed--;

    var t = self.tiles[Math.floor(Math.random() * self.tiles.length)],
      x = Terrain.extractX(t) + (Math.random() - 0.5) * 0.8,
      y = Terrain.extractY(t) + (Math.random() - 0.5) * 0.8,
      ground = Carman.groundHeight(self.root, x, y) * Config.tileZStep;

    SmokeSource.puff(
      self.root.game.logic.world,
      x * TILE,
      ground + high * PER_PIXEL * (0.75 + Math.random() * 0.4),
      y * TILE,
      plumeOf(self),
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6,
    );
  }
}

/**
 * Down it comes: what it looks like stood up in its place and brought down
 * a tile at a time, floor onto floor - no fence, and no heaps of rubble but
 * what is left of it (client/demolition) - its view hidden meanwhile, the
 * ruin coming up under the dust; the core told.
 */
Blaze.prototype.fall = function () {
  var self = this,
    view = this.building.view;

  this.down = true;

  if (view && view.gameObject.transform.children.length > 0) {
    this.collapse = new Demolition.Demolition(
      this.root,
      this.building,
      this.tiles,
      { fence: false, rubble: false },
    );
    this.since = 0;
    this.knocks = this.tiles.map(function (t, k) {
      return { tile: t, at: k * KNOCK_APART * Math.random() };
    });
    view.setOpacity(0);
  }

  this.model.burn(this.model.fire + CoreBuilding.BURNS);

  //a burst of smoke and dust as it goes
  for (var i = 0; i < 18; i++) {
    var t = self.tiles[i % self.tiles.length];

    SmokeSource.puff(
      this.root.game.logic.world,
      (Terrain.extractX(t) + (Math.random() - 0.5)) * TILE,
      Carman.groundHeight(this.root, Terrain.extractX(t), Terrain.extractY(t)) *
        Config.tileZStep +
        Math.random() * 10,
      (Terrain.extractY(t) + (Math.random() - 0.5)) * TILE,
      i % 3 === 0 ? SmokeScript.plume : SmokeScript.debris,
      (Math.random() - 0.5) * 30,
      (Math.random() - 0.5) * 30,
    );
  }
};

//coming down: each tile in its turn, then what is left of it coming up
//under the dust, and all of it let go of
Blaze.prototype.coming = function (dt) {
  var c = this.collapse,
    view = this.building.view;

  this.since += dt;

  this.knocks = this.knocks.filter(function (k) {
    if (this.since < k.at) return true;
    c.knock(k.tile);
    return false;
  }, this);

  //what is left of it, coming up as it comes down
  var k = Math.max(0, Math.min(1, (this.since - RUIN_AT) / RUIN_MS)),
    fallen = true;

  if (view && view.opacity !== k) view.setOpacity(k);

  for (var tile in c.columns)
    if (c.columns[tile].state !== "down" && c.columns[tile].state !== "gone")
      fallen = false;

  //all of it down, and what flew off it lying still - or long enough
  if (
    this.knocks.length === 0 &&
    ((fallen && c.chunks.length === 0 && k >= 1) || this.since > FALL_MOST)
  ) {
    this.tiles.forEach(function (t) {
      c.letGo(t);
    });
    this.collapse = null;
    if (view) view.setOpacity(1);
    changed();
  }
};

//the middle of its tiles, in the world, on the ground: [x, y, z]
function middleOf(self) {
  var x = 0,
    y = 0;

  self.tiles.forEach(function (t) {
    x += Terrain.extractX(t) / self.tiles.length;
    y += Terrain.extractY(t) / self.tiles.length;
  });

  return [
    x * TILE,
    Carman.groundHeight(self.root, x, y) * Config.tileZStep,
    y * TILE,
  ];
}

//points over its tiles for what is left of it to burn at: a few to a tile,
//low down
function embersOf(self) {
  var out = [];

  self.tiles.forEach(function (t, i) {
    for (var k = 0; k < 4; k++)
      out.push({
        x: Terrain.extractX(t) + (hash(i, k, self.seed) - 0.5) * 0.8,
        y: Terrain.extractY(t) + (hash(i, k + 9, self.seed) - 0.5) * 0.8,
        z: 1 + 7 * hash(i, k + 17, self.seed),
        seed: Math.floor(hash(i, k + 29, self.seed) * 1e6),
        //how long it burns on, of what is left, 0..1
        lasts: 0.35 + 0.65 * hash(i, k + 41, self.seed),
      });
  });

  return out;
}

//how much of what is left of it burns still, 0..1, hours h in
function remainsBurn(h) {
  return Math.max(0, Math.min(1, 1 - (h - BURNS) / (REMAINS - BURNS)));
}

/**
 * What is left of it burning on, the smoke thinning - then smouldering, a
 * wisp of smoke now and then.
 */
function remains(self, h, dt) {
  var r = remainsBurn(h),
    world = self.root.game.logic.world;

  if (r > 0) plume(self, 0.04 + 0.32 * r, 10, dt);
  else {
    //smouldering: a wisp here and there, fewer as it cools
    var cool = (h - REMAINS) / (SMOULDERS - REMAINS);

    self.plumed +=
      (dt / 1000) * 1.2 * (1 - cool) * Math.sqrt(self.tiles.length);

    while (self.plumed >= 1) {
      self.plumed--;

      var e = self.embers[Math.floor(Math.random() * self.embers.length)],
        ground = Carman.groundHeight(self.root, e.x, e.y) * Config.tileZStep;

      SmokeSource.puff(
        world,
        e.x * TILE,
        ground + 2,
        e.y * TILE,
        cool < 0.4 ? SmokeScript.soot : SmokeScript.steam,
        0,
        0,
      );
    }
  }
}

//a spark off a window ablaze, flying up
function spark(self, w) {
  if (self.sparks.length >= SPARKS) return;

  self.sparks.push({
    w: w,
    dx: (Math.random() - 0.5) * 4,
    dy: 0,
    vx: (Math.random() - 0.5) * 6,
    vy: between(SPARK_RISE),
    t: 0,
    ttl: between(SPARK_MS),
  });
}

function sparksOn(self, dt) {
  var s = dt / 1000;

  self.sparks = self.sparks.filter(function (p) {
    p.t += dt;
    p.dx += p.vx * s;
    p.dy -= p.vy * s;
    p.vx += (Math.random() - 0.5) * 12 * s;

    return p.t < p.ttl;
  });
}

/* --- Drawing ------------------------------------------------------------ */

/**
 * Draws a building's fire over it: the soot over its windows, its windows
 * glowing and the flames out of them, the sparks - bright whatever the
 * light (client/glview GLOW), hidden behind whatever stands in front of
 * them; and at night lights what is round it. Once it is down, the flames
 * among what is left of it, and the embers glowing.
 */
function FireRenderer(blaze) {
  engine.Renderer.call(this);
  this.blaze = blaze;
  this.layer = RenderLayer.buildingsLayer;
}

FireRenderer.prototype = Object.create(engine.Renderer.prototype);
FireRenderer.prototype.constructor = FireRenderer;
FireRenderer.prototype.profileName = "fire";

//drawn whenever it is about at all - the blaze looks after itself
FireRenderer.prototype.cullingTest = function () {
  return true;
};

FireRenderer.prototype.render = function (layer, viewportRenderer) {
  var gl = engine.Config.gl,
    blaze = this.blaze;

  if (!gl || !layer.fillRect) return;

  var M = viewportRenderer.M,
    h = blaze.hours(),
    now = blaze.clock,
    up = View.top() ? Math.cos(Math.PI / 6) : -M[5],
    lights = 0;

  function project(x, y, z) {
    return [
      M[0] * x + M[4] * y + M[8] * z + M[12],
      M[1] * x + M[5] * y + M[9] * z + M[13],
    ];
  }

  layer.save();

  if (!blaze.down && blaze.windows !== null) {
    //the windows, by how ablaze each is: the soot over them first, then
    //each glowing within, and the flames out of it, the brightest lighting
    //what is round them
    var shown = [],
      spots = new Map();

    blaze.windows.forEach(function (w) {
      var k = intensity(w, h);

      if (k <= 0 || w.go.world === null) return;

      //where the picture it is in is on the screen, once for all of them
      var base = spots.get(w.go);

      if (base === undefined) {
        var p = w.go.transform.getPosition([0, 0, 0]);

        base = project(p[0], p[1], p[2]);
        base.push(up * p[1]);
        spots.set(w.go, base);
      }

      var x = Math.floor(base[0] - w.renderer.pivotX + w.x + 0.5),
        y = Math.floor(base[1] - w.renderer.pivotY + w.y + 0.5),
        ground = base[2],
        tall = 2 + Math.round(9 * k);

      shown.push({ w: w, k: k, x: x, y: y, ground: ground });

      //the roof: nothing over it to blacken
      if (w.roof) return;

      //the wall over it blackened as it burns, wider and higher up
      layer.glow = false;
      layer.standsAt = ground + w.z + tall;
      layer.fillStyle = SOOT[Math.min(SOOT.length - 1, Math.floor(k * 4))];
      layer.fillRect(
        x - 1 - (k > 0.5 ? 1 : 0) - (k > 0.85 ? 1 : 0),
        y - tall - 1,
        3 + (k > 0.5 ? 2 : 0) + (k > 0.85 ? 2 : 0),
        tall,
      );
    });

    layer.glow = true;

    shown.forEach(function (s) {
      //off the roof, once it has caught: taller than out of a window
      if (s.w.roof) {
        flame(layer, s.x, s.y, s.ground + s.w.z, s.k, s.w.seed, now, 1.5);
        return;
      }

      //the room inside it ablaze, flickering red to yellow as it takes
      var flick = 0.5 + 0.5 * Math.sin(now / 60 + s.w.seed * 1.7),
        heat = Math.min(
          FLAME.length - 1,
          Math.floor((1 - s.k * (0.6 + 0.4 * flick)) * 4),
        );

      layer.standsAt = s.ground + s.w.z + 1;
      layer.fillStyle = rgb(FLAME[heat]);
      layer.fillRect(s.x - 1, s.y - 1, 2, 2);

      //and out of it, once it has taken
      if (s.k > 0.2)
        flame(
          layer,
          s.x,
          s.y - 1,
          s.ground + s.w.z,
          (s.k - 0.2) / 0.8,
          s.w.seed,
          now,
        );
    });

    //the brightest of them light what is round them, after dark
    shown
      .sort(function (a, b) {
        return b.k - a.k;
      })
      .forEach(function (s) {
        if (lights >= 6 || !gl.workLight) return;
        lights++;
        gl.workLight(
          s.x,
          s.y + s.w.z,
          s.w.z,
          REACH * (0.6 + 0.4 * s.k),
          GLOW,
          0.7 * s.k * (0.85 + 0.15 * Math.sin(now / 90 + s.w.seed)),
        );
      });

    //and over all of it, the smoke rolling up off it lit from under by
    //the fire, after dark - as much as it is ablaze, as big as it is
    if (gl.workLight && blaze.share > 0.05) {
      var m = blaze.middle,
        c = project(m[0], m[1], m[2]);

      gl.workLight(
        c[0],
        c[1],
        blaze.high + 14,
        (50 + 30 * Math.sqrt(blaze.tiles.length)) * (0.6 + 0.4 * blaze.share),
        GLOW,
        0.55 * blaze.share * (0.9 + 0.1 * Math.sin(now / 130)),
      );
    }

    //sparks off them
    layer.fillStyle = rgb(FLAME[1]);
    blaze.sparks.forEach(function (p) {
      var w = p.w,
        q = w.go.transform.getPosition([0, 0, 0]),
        b = project(q[0], q[1], q[2]),
        fade = 1 - p.t / p.ttl;

      if (fade < 0.3 && Math.random() < 0.5) return;

      layer.fillStyle = rgb(fade > 0.6 ? FLAME[1] : FLAME[2]);
      layer.standsAt = up * q[1] + w.z - p.dy;
      layer.fillRect(
        Math.floor(b[0] - w.renderer.pivotX + w.x + p.dx),
        Math.floor(b[1] - w.renderer.pivotY + w.y + p.dy),
        1,
        1,
      );
    });
  }

  if (blaze.down) {
    //what is left of it burning on, then its embers glowing
    var r = remainsBurn(h),
      cool = h < REMAINS ? 0 : (h - REMAINS) / (SMOULDERS - REMAINS),
      ramp = blaze.collapse !== null ? Math.min(1, blaze.since / 2500) : 1;

    layer.glow = true;

    blaze.embers.forEach(function (e) {
      var g = Carman.groundHeight(blaze.root, e.x, e.y) * Config.tileZStep,
        s = project(e.x * TILE, g, e.y * TILE),
        x = Math.floor(s[0] + 0.5),
        y = Math.floor(s[1] + 0.5),
        k = r > 0 ? Math.min(1, (r / e.lasts) * ramp) : 0;

      if (k > 0.05) {
        flame(layer, x, y - Math.round(e.z), up * g + e.z, k, e.seed, now);

        if (lights < 6 && gl.workLight) {
          lights++;
          gl.workLight(x, y, e.z, REACH * 0.8 * k, GLOW, 0.6 * k);
        }
      } else if (cool < 1 - e.lasts * 0.5) {
        //an ember glowing, pulsing
        var pulse = 0.5 + 0.5 * Math.sin(now / 400 + e.seed);

        layer.standsAt = up * g + 1;
        layer.fillStyle = rgb(pulse > 0.5 ? FLAME[3] : FLAME[4]);
        layer.fillRect(x, y - 1, 1, 1);
      }
    });
  }

  layer.restore();
};

/**
 * A flame from x, y up - k ablaze, 0..1 - flickering: as tall and as wide
 * at its root as it is ablaze, white-hot there, yellow, orange and red up
 * it to its smoky tip, licking this way and that; standing at standsAt.
 */
function flame(layer, x, y, standsAt, k, seed, now, scale) {
  var big = scale || 1,
    flick =
      0.75 +
      0.25 * Math.sin(now / 70 + seed) * Math.sin(now / 113 + seed * 0.7),
    tall = Math.max(2, Math.round((3 + 10 * k) * flick * big)),
    wide = Math.max(1, Math.round(1 + 2.2 * k * Math.sqrt(big)));

  for (var j = 0; j < tall; j++) {
    var f = j / tall,
      w = Math.max(1, Math.round(wide * (1 - f * 0.85))),
      lick = Math.round(
        Math.sin(now / 95 + seed + j * 0.7) * f * (1 + 1.4 * k),
      ),
      c = FLAME[Math.min(FLAME.length - 1, Math.floor(f * FLAME.length))];

    //its tip broken off, a pixel here and there
    if (f > 0.7 && hash(j, Math.floor(now / 80), seed) < 0.35) continue;

    layer.fillStyle = rgb(c);
    //a few rows at a time as high as the highest of them: in front of the
    //wall it licks up, and no more of a batch to draw than that (glcanvas)
    layer.standsAt = standsAt + 3 + j - (j % 3);
    layer.fillRect(x - (w >> 1) + lick, y - j, w, 1);
  }
}

export default { Fires: Fires };
