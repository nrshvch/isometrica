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
import Ruin from "./ruin";
import Yards from "./yards";
import Carman from "./carman";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import { changed } from "./looks";

/**
 * Buildings on fire (core/building ignite), as they burn down over a day of
 * the game's time.
 *
 * It catches in a window of a floor low down, and spreads from there the
 * way fire goes through a building: along that floor of that tile first,
 * window by window, then on at once to the same floor of the tiles next to
 * it and the floor over it, and on from each of those the same way - up
 * and across, down only slowly - till every window of it is ablaze
 * (Blaze). Flames lick up out of every
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

//a heap of rubble left by a building blown up (core/city explode, smoke):
//how long the fire in it burns on, and it smoulders, hours
var PILE_REMAINS = 1.5,
  PILE_SMOULDERS = 7;

//how far up the world a pixel up the screen is, and a tile across
var PER_PIXEL = Config.tileZStep / 8,
  TILE = Config.tileSize;

//how high a floor is, pixels; how long a window takes from catching to
//ablaze, hours; how long the fire takes to go from a floor of a tile to the
//one over it, the one under it, and the same floor of the tile next to it,
//hours; along a floor of a tile, a tile's width, at the most - and how late,
//at the most, the last window catches
var STOREY = 13,
  FLARE = 0.9,
  UP = 0.6,
  DOWN = 1.3,
  ACROSS = 0.65,
  FILLS = 0.5,
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

//coming down: how far apart its tiles give, ms, about - one after another,
//not all at once; when what is left of it starts to show through the dust,
//and takes to; and how long it takes at the most, whatever is still falling
//then
var KNOCK_APART = 340,
  RUIN_AT = 900,
  RUIN_MS = 2200,
  FALL_MOST = 14000;

//the black smoke off the top of it: puffs a second at the most, thick as it
//is ablaze; out of a window ablaze, a puff of it now and then, ms
var PLUME_MOST = 5,
  WINDOW_PUFF = [3500, 7000];

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

//a window alight within, before flames are out of it: bright, flickering
var GLOWING = [
  [255, 214, 110],
  [255, 172, 56],
  [255, 136, 40],
];

//how far ablaze a window is before flames are out of it; how much bigger a
//roof's are than a window's, and what is left of it, once it is down; and
//how many of its flames light what is round them at night
var FLAMES_FROM = 0.15,
  ROOF_BIG = 1.5,
  EMBER_BIG = 0.75,
  LIGHTS = 6;

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

//whether something is on fire, or smouldering still, by now: a building
//set on fire, and a heap of rubble a building blown up left
function alight(model, now) {
  if (typeof model.fire === "number")
    return now - model.fire < CoreBuilding.SMOULDERS;
  if (typeof model.smoke === "number")
    return now - model.smoke < PILE_SMOULDERS * HOUR;

  return false;
}

//every building on fire in sight with a blaze, and none for what is not
function look(self) {
  var views = self.root.buildman.getBuildingViews(),
    now = self.now(),
    seen = {};

  views.forEach(function (b) {
    var model = b.data;

    if (!model || !b.view || !alight(model, now)) return;

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

  //the building itself, not its yard: what burns, and comes down
  var yard = Yards.yards(fires.root, building);

  this.built = this.tiles.filter(function (t) {
    return yard[t] !== true;
  });
  if (this.built.length === 0) this.built = this.tiles.slice();
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
  //a heap of rubble smouldering, down from the start - and from when, and
  //how long what is left burns on and smoulders, hours
  this.pile = typeof model.fire !== "number";
  this.start = this.pile ? model.smoke : model.fire;
  this.remains = this.pile ? 0 : BURNS;
  this.burnsOn = this.pile ? PILE_REMAINS : REMAINS;
  this.smoulders = this.pile ? PILE_SMOULDERS : SMOULDERS;
  this.down = this.pile || model.getState() === BuildingState.ruin;
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

//whether it is not to be seen yet: a heap of rubble under the dust of what
//it was, coming down still (client/collapse)
function hidden(self) {
  var view = self.building.view;

  return !view || view.opacity < 1;
}

//how long it has burnt, of the game's time, hours
Blaze.prototype.hours = function () {
  return (this.fires.now() - this.start) / HOUR;
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
        : h < this.burnsOn
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

    this.built.forEach(function (t) {
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

  //a heap of rubble not come up yet, under a building coming down
  if (this.pile && hidden(this)) return;

  if (h >= this.smoulders) {
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

    //its yard, its car park, its playground does not burn
    if (
      !sprite ||
      !sprite.windows ||
      child.gameObject.down === true ||
      Yards.yardPicture(sprite)
    )
      return;

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
        //the tile it is on - the building's, for one drawn whole
        tile:
          child.gameObject.tile !== undefined
            ? child.gameObject.tile
            : self.model.tile,
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

  //each floor of each tile, when the fire gets to it: from the first, a
  //tile across and a floor up or down at a time (ACROSS, UP, DOWN) - and
  //where along it, the nearest window of it to where it caught
  var fx = Terrain.extractX(first.tile),
    fy = Terrain.extractY(first.tile),
    at = worldOf(first),
    cells = {};

  out.forEach(function (w) {
    var p = worldOf(w),
      key = w.tile + ":" + w.floor,
      floors = w.floor - first.floor,
      tiles =
        Math.abs(Terrain.extractX(w.tile) - fx) +
        Math.abs(Terrain.extractY(w.tile) - fy),
      //how far it is from where it caught, across the ground, tiles
      off = (w.off = Math.hypot(p[0] - at[0], p[2] - at[2]) / TILE);

    if (cells[key] === undefined)
      cells[key] = {
        at: (floors > 0 ? UP : DOWN) * Math.abs(floors) + ACROSS * tiles,
        from: off,
      };
    else cells[key].from = Math.min(cells[key].from, off);
  });

  out.forEach(function (w, i) {
    w.seed = Math.floor(hash(i, 5, self.seed) * 1e6);

    if (w === first) {
      w.catches = 0;
      return;
    }

    //along its floor from where the fire got into it, window by window
    var cell = cells[w.tile + ":" + w.floor],
      along = Math.min(FILLS, (w.off - cell.from) * FILLS),
      t = cell.at + along + 0.05 + 0.25 * hash(i, 7, self.seed);

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
      r.charred === words ||
      child.gameObject.down === true ||
      Yards.yardPicture(r.unburnt || r.sprite)
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

    var at = worldOf(w),
      //over the tips of its flames
      over = (6 + 12 * k) * PER_PIXEL;

    //pouring out of it over its flames, billowing up to join what rolls up
    //off the top of it
    SmokeSource.puff(
      world,
      at[0],
      at[1] + over,
      at[2],
      plumeOf(self),
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
  var size = Math.sqrt(self.built.length) * (0.6 + self.high / 50),
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
  var size = Math.sqrt(self.built.length) * (0.7 + high / 60),
    rate = Math.min(PLUME_MOST, (0.4 + 2.6 * share) * size);

  self.plumed += (dt / 1000) * rate;

  while (self.plumed >= 1) {
    self.plumed--;

    var t = self.built[Math.floor(Math.random() * self.built.length)],
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
 * Burnt out, it goes the way what it is built of goes (client/ruin kindOf,
 * core/burning): gutted to its frame, it stands, roof and all; its walls
 * standing, its roof falls in, in a burst of sparks (roofFalls); fallen in,
 * down it comes - what it looks like stood up in its place and brought down
 * a tile at a time, floor onto floor, no fence, and no heaps of rubble but
 * what is left of it (client/demolition), its view hidden meanwhile, the
 * ruin coming up under the dust. The core told, either way.
 */
Blaze.prototype.fall = function () {
  var self = this,
    view = this.building.view,
    //it falls in; or stands, its roof fallen in; or stands gutted, its
    //roof on it - by what it is built of (client/ruin, core/burning)
    kind = Ruin.kindOf(this.model);

  this.down = true;

  if (kind !== "b") {
    this.model.burn(this.model.fire + CoreBuilding.BURNS);
    if (kind === "s") roofFalls(this);
    return;
  }

  if (view && view.gameObject.transform.children.length > 0) {
    this.collapse = new Demolition.Demolition(
      this.root,
      this.building,
      this.built,
      { fence: false, rubble: false },
    );
    this.since = 0;
    this.knocks = this.built.map(function (t, k) {
      return { tile: t, at: k * KNOCK_APART * (0.7 + 0.6 * Math.random()) };
    });
    view.setOpacity(0);
  }

  this.model.burn(this.model.fire + CoreBuilding.BURNS);

  //a burst of smoke and dust as it goes
  for (var i = 0; i < 18; i++) {
    var t = self.built[i % self.built.length];

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

//its roof fallen in, the shell of it left standing: sparks and black smoke
//bursting up out of it, and the dust of it
function roofFalls(self) {
  var world = self.root.game.logic.world;

  self.built.forEach(function (t) {
    var x = Terrain.extractX(t),
      y = Terrain.extractY(t),
      g = Carman.groundHeight(self.root, x, y) * Config.tileZStep;

    for (var i = 0; i < 6; i++)
      SmokeSource.puff(
        world,
        (x + (Math.random() - 0.5) * 0.8) * TILE,
        g + self.high * PER_PIXEL * (0.6 + Math.random() * 0.4),
        (y + (Math.random() - 0.5) * 0.8) * TILE,
        i % 2 === 0 ? plumeOf(self) : SmokeScript.debris,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
      );
  });

  (self.windows || []).forEach(function (w) {
    if (w.roof || Math.random() < 0.6) spark(self, w);
  });
}

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
    this.built.forEach(function (t) {
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

  self.built.forEach(function (t) {
    x += Terrain.extractX(t) / self.built.length;
    y += Terrain.extractY(t) / self.built.length;
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

  self.built.forEach(function (t, i) {
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
function remainsBurn(self, h) {
  return Math.max(
    0,
    Math.min(1, 1 - (h - self.remains) / (self.burnsOn - self.remains)),
  );
}

//how far it has cooled smouldering, 0..1, hours h in
function cooled(self, h) {
  return h < self.burnsOn
    ? 0
    : Math.min(1, (h - self.burnsOn) / (self.smoulders - self.burnsOn));
}

/**
 * What is left of it burning on, the smoke thinning - then smouldering, a
 * wisp of smoke now and then.
 */
function remains(self, h, dt) {
  var r = remainsBurn(self, h),
    world = self.root.game.logic.world;

  if (r > 0) plume(self, 0.04 + 0.32 * r, 10, dt);
  else {
    //smouldering: a wisp here and there, fewer as it cools
    var cool = cooled(self, h);

    self.plumed +=
      (dt / 1000) * 1.2 * (1 - cool) * Math.sqrt(self.built.length);

    while (self.plumed >= 1) {
      self.plumed--;

      var e = self.embers[Math.floor(Math.random() * self.embers.length)],
        ground = Carman.groundHeight(self.root, e.x, e.y) * Config.tileZStep;

      SmokeSource.puff(
        world,
        e.x * TILE,
        ground + 2,
        e.y * TILE,
        cool < 0.4 ? plumeOf(self) : SmokeScript.steam,
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

  if (!gl || !layer.fillRect || (blaze.pile && hidden(blaze))) return;

  var M = viewportRenderer.M,
    h = blaze.hours(),
    now = blaze.clock,
    up = View.top() ? Math.cos(Math.PI / 6) : -M[5],
    //what burns: {x, y, ground, z, k, big, seed} each - a window, a stretch
    //of its roof, what is left of it, on the screen
    sources = [],
    glows = [];

  function project(x, y, z) {
    return [
      M[0] * x + M[4] * y + M[8] * z + M[12],
      M[1] * x + M[5] * y + M[9] * z + M[13],
    ];
  }

  if (!blaze.down && blaze.windows !== null) {
    var spots = new Map();

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
        y = Math.floor(base[1] - w.renderer.pivotY + w.y + 0.5);

      //the room behind it alight, before the flames are out of it
      if (!w.roof)
        glows.push({ x: x, y: y, z: base[2] + w.z, k: k, seed: w.seed });

      if (k > FLAMES_FROM)
        sources.push({
          x: x,
          y: y,
          ground: base[2],
          z: w.z,
          k: (k - FLAMES_FROM) / (1 - FLAMES_FROM),
          big: w.roof ? ROOF_BIG : 1,
          seed: w.seed,
        });
    });
  }

  if (blaze.down) {
    //what is left of it burning on, then its embers glowing
    var r = remainsBurn(blaze, h),
      cool = cooled(blaze, h),
      ramp = blaze.collapse !== null ? Math.min(1, blaze.since / 2500) : 1;

    blaze.embers.forEach(function (e) {
      var g = Carman.groundHeight(blaze.root, e.x, e.y) * Config.tileZStep,
        q = project(e.x * TILE, g, e.y * TILE),
        x = Math.floor(q[0] + 0.5),
        y = Math.floor(q[1] + 0.5) - Math.round(e.z),
        k = r > 0 ? Math.min(1, (r / e.lasts) * ramp) : 0;

      if (k > 0.05)
        sources.push({
          x: x,
          y: y,
          ground: up * g,
          z: e.z,
          k: k,
          big: EMBER_BIG,
          seed: e.seed,
        });
      else if (cool < 1 - e.lasts * 0.5)
        glows.push({ x: x, y: y + 1, z: up * g + 1, k: 0.3, seed: e.seed });
    });
  }

  layer.save();
  layer.glow = true;

  //windows alight within, flickering - bright, never dark
  glows.forEach(function (g) {
    var f = 0.5 + 0.5 * Math.sin(now / 55 + g.seed * 1.7);

    layer.standsAt = g.z + 1;
    layer.fillStyle = rgb(GLOWING[Math.floor(f * 2.99)]);
    layer.fillRect(g.x - 1, g.y - 1, g.k > 0.5 ? 3 : 2, 2);
  });

  fire(layer, sources, now);

  //the brightest of it lights what is round it, after dark
  if (gl.workLight)
    sources
      .slice()
      .sort(function (a, b) {
        return b.k * b.big - a.k * a.big;
      })
      .slice(0, LIGHTS)
      .forEach(function (s) {
        gl.workLight(
          s.x,
          s.y + s.z,
          s.z,
          REACH * (0.6 + 0.4 * s.k) * s.big,
          GLOW,
          0.7 * s.k * (0.85 + 0.15 * Math.sin(now / 90 + s.seed)),
        );
      });

  //and over all of it, the smoke rolling up off it lit from under by the
  //fire, after dark - as much as it is ablaze, as big as it is
  if (!blaze.down && gl.workLight && blaze.share > 0.05) {
    var m = blaze.middle,
      c = project(m[0], m[1], m[2]);

    gl.workLight(
      c[0],
      c[1],
      blaze.high + 14,
      (50 + 30 * Math.sqrt(blaze.built.length)) * (0.6 + 0.4 * blaze.share),
      GLOW,
      0.55 * blaze.share * (0.9 + 0.1 * Math.sin(now / 130)),
    );
  }

  //sparks off it
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

  layer.restore();
};

//noise over x, y, smooth between whole steps, 0..1
function smooth(x, y, k) {
  var x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    a = hash(x0, y0, k),
    b = hash(x0 + 1, y0, k),
    c = hash(x0, y0 + 1, k),
    d = hash(x0 + 1, y0 + 1, k);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * The fire of everything that burns, as one: a flame up out of every
 * source - as wide and tall as it is ablaze, a storey and more at its
 * height, licking up in tongues that flicker and run up it - and where the
 * flames of one run into another's, up a wall from floor to floor, along it
 * from window to window, one sheet of fire, white-hot at its root, yellow,
 * orange, and red up it to its tips.
 */
function fire(layer, sources, now) {
  var columns = new Map();

  sources.forEach(function (s) {
    var wide = Math.max(2, Math.round((3 + 4 * s.k) * s.big)),
      high = (5 + 12 * s.k) * s.big,
      x0 = s.x - (wide >> 1);

    for (var c = x0; c < x0 + wide; c++) {
      var e = 1 - Math.pow((c + 0.5 - s.x) / (wide / 2 + 0.5), 2);

      if (e <= 0) continue;

      //tongues: higher and lower along it, running up it as they flicker
      var n = smooth(c * 0.45 + (s.seed % 97), now * 0.006 - c * 0.07, 7),
        top = s.y - Math.max(2, high * Math.sqrt(e) * (0.4 + 0.6 * n)),
        list = columns.get(c);

      if (list === undefined) columns.set(c, (list = []));
      list.push({
        top: top,
        bottom: s.y + 1,
        ground: s.ground,
        z: s.z,
        k: s.k,
      });
    }
  });

  columns.forEach(function (spans, c) {
    //from the lowest up: one that reaches the next runs on into it
    spans.sort(function (a, b) {
      return b.bottom - a.bottom;
    });

    var at = spans[0];

    for (var i = 1; i < spans.length; i++) {
      var next = spans[i];

      if (next.bottom >= at.top - 2) {
        at.top = Math.min(at.top, next.top);
        at.k = Math.max(at.k, next.k);
      } else {
        column(layer, c, at, now);
        at = next;
      }
    }

    column(layer, c, at, now);
  });
}

//the bands up a column of fire, from its root: how far up it each starts,
//and its colour
var BANDS = [0, 0.1, 0.38, 0.66, 0.88],
  FIRE = [
    [255, 248, 214],
    [255, 214, 92],
    [255, 152, 40],
    [236, 88, 24],
    [178, 48, 18],
  ];

//a column of fire, x c on the screen, as span says - each band of it in
//front of the wall it is up, where one ends and the next begins wavering
//up and down it as it flickers; a gap in it now and then, where the flames
//part, and its tip broken off
function column(layer, c, span, now) {
  var len = span.bottom - span.top,
    //a fire just taken has no white-hot root to it
    from = span.k > 0.6 ? 0 : 1,
    t = Math.floor(now / 60);

  for (var i = from; i < BANDS.length; i++) {
    var wob = function (b) {
        return b <= 0 || b >= 1
          ? b
          : b + (smooth(c * 0.6, now * 0.008 + b * 5, 11) - 0.5) * 0.16;
      },
      y1 = Math.round(span.bottom - len * wob(BANDS[i])),
      y0 = Math.round(
        span.bottom - len * wob(BANDS[i + 1] !== undefined ? BANDS[i + 1] : 1),
      );

    //its tip broken off, here and there, as it flickers
    if (i === BANDS.length - 1 && hash(c, t, 13) < 0.45) continue;
    if (y1 <= y0) continue;

    layer.fillStyle = rgb(FIRE[i]);
    layer.standsAt = span.ground + span.z + (span.bottom - (y0 + y1) / 2) + 2;

    //the flames parting up it, a pixel or two, now and then
    var gap =
      i >= 2 && hash(c, t + i * 7, 17) < 0.18
        ? y0 + Math.floor((y1 - y0) / 2)
        : -1;

    if (gap > y0 && gap < y1 - 1) {
      layer.fillRect(c, y0, 1, gap - y0);
      layer.fillRect(c, gap + 1, 1, y1 - gap - 1);
    } else layer.fillRect(c, y0, 1, y1 - y0);
  }
}

export default { Fires: Fires };
