import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Works from "../core/works";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import Carman from "./carman";
import WorkLights from "./worklights";
import Smoke from "./smoke";
import { NEAR, VIEW, COARSE as COARSE_LEVEL } from "shared/interest";
import { COARSE, DORMANT, FULL, Scheduler } from "shared/schedule";
import { GridIndex } from "shared/spatial";

var Terrain = Core.Terrain;

/**
 * The bulldozers on screen. They are the world's records (core/works),
 * stepped here by region and tier - every frame near the camera, a few
 * times a second further off, asleep beyond (brought up to date by the
 * works themselves) - and drawn only in view: a game object each, its
 * dust, and what stands on a tile held standing till one gets there.
 * See isometrica/.claude/skills/buildings/going-up.md (The bulldozers as
 * records).
 */

//how often a bulldozer at work kicks up dust, ms; and how many puffs go up
//where what stood on a tile goes down
var DUST_EVERY = 120,
  BURST = 9;

//how often what is held is looked over for a tile no bulldozer is coming
//to any more, ms
var LOOK_EVERY = 500;

//a coarse region's turn comes this often, ms, and coarse turns may take
//this long a frame (shared/schedule Scheduler)
var COARSE_EVERY = 250,
  COARSE_BUDGET = 0.5;

var events = {
  //a bulldozer got to a tile: it is free to build on again
  reached: 0,
};

var DOZERS = engine.Stats.counter("dozers", true),
  DOZER_VIEWS = engine.Stats.counter("dozer views", true),
  TIME = engine.Stats.section("clearworks");

function Clearworks(root) {
  var self = this;

  this.root = root;
  //the world's bulldozers and the ground waiting for them
  this.works = root.core.works;
  //what is held standing on a tile till a bulldozer gets there (hold), by
  //the tile: told as one comes up to it (knock) and as it gets there
  //(letGo)
  this.held = {};
  //the views of the bulldozers in view, by their row
  this.views = [];
  //where each is, by its row, cells a chunk across: a region's are a cell's
  this.index = null;
  this.found = new Int32Array(16);
  this.scheduler = Scheduler({ period: COARSE_EVERY, budget: COARSE_BUDGET });
  this.scheduler.system("clearworks", function (key) {
    stepRegion(self, key);
  });
  this.stamp = 0;
  this.stamps = new Uint32Array(16);
  this.looked = 0;
}

Clearworks.events = events;

Clearworks.prototype.init = function () {
  var go = new engine.GameObject("clearworks"),
    self = this;

  this.index = GridIndex(this.root.tilesman.chunkSize, 16);
  go.addComponent(new ClearworksScript(this));
  this.root.game.logic.world.addGameObject(go);

  //told what is done, to show it
  this.works.view = {
    added: function (slot) {
      appear(self, slot);
    },
    leaving: function (slot) {
      appear(self, slot);
    },
    removed: function (slot) {
      unshow(self, slot);
      self.index.remove(slot);
    },
    knocked: function (tile, heading) {
      return knocked(self, tile, Works.HEADINGS[heading]);
    },
    reaching: function (tile, heading) {
      reaching(self, tile, heading < 0 ? undefined : Works.HEADINGS[heading]);
    },
    reached: function (tile) {
      reached(self, tile);
    },
  };

  //the regions round the camera, as their levels change
  this.root.tilesman.listen(function (key, from, to) {
    levelChanged(self, key, to);
  });
};

/**
 * Clears tiles - clear(tile) clearing each in the world, and saying which
 * tiles it cleared, every tile of a building on it - and has the bulldozers
 * out to them (core/works): what stood on them stays standing until one
 * gets there.
 *
 * @param tiles {number[]}
 * @param clear {function(number): number[]}
 */
Clearworks.prototype.clear = function (tiles, clear) {
  var self = this;

  this.works.clear(tiles, clear).forEach(function (t) {
    //nothing held - nothing of it in sight - so nothing a bulldozer has
    //to push over: in its dust, there and then
    if (self.held[t] === undefined) burst(self, t);
  });
};

/**
 * Has the bulldozers out to the tiles a building is to go up on, once they
 * are cleared (core/city/citybuildings buildBuilding).
 *
 * @param tiles {number[]}
 */
Clearworks.prototype.sweep = function (tiles) {
  this.works.sweep(tiles);
};

//how many bulldozers there are, and tiles waiting for one
Clearworks.prototype.dozers = function () {
  return this.works.count();
};

Clearworks.prototype.waiting = function () {
  return this.works.waitingCount();
};

/**
 * Holds what stood on a tile being cleared (core/terrain beingCleared) till
 * a bulldozer gets to it, when letGo(push) takes it away - push the way the
 * bulldozer pushed it over, in the world ("x+", "y-" - client/view
 * headingOf), or none for gone without one - if the tile is being cleared
 * at all. As the bulldozer comes up to it, pushing on the way push goes,
 * knock(push) says so, and how long what stands there takes to come down,
 * ms.
 *
 * @param tile {number}
 * @param letGo {function(string=)}
 * @param [knock] {function(string): number}
 * @returns {boolean} whether it is held
 */
Clearworks.prototype.hold = function (tile, letGo, knock) {
  if (!this.works.waits(tile) && !this.root.core.terrain.beingCleared(tile))
    return false;

  var held = this.held[tile] || (this.held[tile] = { letGo: [], knock: [] });

  held.letGo.push(letGo);
  if (knock) held.knock.push(knock);

  return true;
};

/**
 * A bulldozer has come up to a tile, pushing on the way push goes: whatever
 * is held there told, and a building being demolished there brought down
 * (client/buildman knockDown) - how long it takes, ms, or -1 for nothing
 * shown.
 */
function knocked(self, tile, push) {
  var held = self.held[tile],
    takes = self.root.buildman ? self.root.buildman.knockDown(tile) : -1;

  if (held !== undefined) {
    held.knock.forEach(function (knock) {
      takes = Math.max(takes, knock(push) || 0);
    });
    held.knock = [];
  }

  return takes;
}

//a bulldozer's blade got to a tile: whatever is held there let go of - a
//tree out of view just gone, not pushed over - and the rubble of a building
//being demolished pushed away
function reaching(self, tile, push) {
  var held = self.held[tile];

  if (!inView(self, tile)) push = undefined;

  if (held !== undefined) {
    delete self.held[tile];
    held.letGo.forEach(function (letGo) {
      letGo(push);
    });
  }
  if (self.root.buildman) self.root.buildman.pushedAway(tile);
}

//and gone: the tile bare, in a cloud of dust
function reached(self, tile) {
  self.root.terrain.redraw([tile]);
  burst(self, tile);
  Events.fire(self, events.reached, tile);
}

/**
 * Let go of whatever is held on a tile no bulldozer is coming to, nor being
 * cleared any more - gone the way it would have gone.
 */
function unheld(self) {
  for (var tile in self.held)
    if (!self.works.waits(+tile) && !self.root.core.terrain.beingCleared(+tile))
      reaching(self, +tile);
}

function ClearworksScript(man) {
  engine.Component.call(this);
  this.man = man;
}

ClearworksScript.prototype = Object.create(engine.Component.prototype);
ClearworksScript.prototype.profileName = "clearworks";

ClearworksScript.prototype.tick = function (time) {
  var man = this.man,
    works = man.works,
    Stats = engine.Stats;

  Stats.begin(TIME);
  man.stamp = (man.stamp + 1) >>> 0 || 1;

  //the clock on, and those asleep brought up to date now and then
  works.tick(time.dt);

  //the regions with any out, by tier - with none out, nothing to step
  if (works.store.count > 0) {
    man.scheduler.full(time.dt);
    man.scheduler.coarse(performance.now());
  }

  man.looked += time.dt;
  if (man.looked >= LOOK_EVERY) {
    man.looked = 0;
    unheld(man);
  }

  //where each is now, and seen there
  var store = works.store,
    views = 0;

  for (var i = store.count - 1; i >= 0; i--) {
    var slot = store.live[i];

    if (track(man, slot)) {
      views++;
      place(man, slot, time.dt);
    }
  }
  Stats.end(TIME);

  Stats.gauge(DOZERS, store.count);
  Stats.gauge(DOZER_VIEWS, views);
};

//what a region's level (shared/interest) makes it to the bulldozers
function tierOf(level) {
  return level >= NEAR ? FULL : level === COARSE_LEVEL ? COARSE : DORMANT;
}

function levelOf(self, slot) {
  var tm = self.root.tilesman,
    cols = self.works.store.cols;

  return tm.levelOf(
    tm.regionOf(Math.round(cols.x[slot]), Math.round(cols.y[slot])),
  );
}

//the bulldozers in a region, into found
function dozersIn(self, key) {
  var tm = self.root.tilesman,
    s = tm.chunkSize,
    x = tm.cornerX(key),
    y = tm.cornerY(key),
    n = self.index.query(x, y, x + s - 0.5, y + s - 0.5, self.found);

  if (n > self.found.length) {
    self.found = new Int32Array(n * 2);
    n = self.index.query(x, y, x + s - 0.5, y + s - 0.5, self.found);
  }

  return n;
}

/**
 * Brings the bulldozers of a region up to the works' clock (the
 * scheduler's system) - each once a frame, whichever region it is in.
 */
function stepRegion(self, key) {
  var n = dozersIn(self, key),
    works = self.works;

  for (var i = 0; i < n; i++) {
    var slot = self.found[i];

    if (self.stamps.length <= slot) {
      var s = new Uint32Array(Math.max(slot + 1, self.stamps.length * 2));

      s.set(self.stamps);
      self.stamps = s;
    }
    if (self.stamps[slot] === self.stamp) continue;
    self.stamps[slot] = self.stamp;
    works.advance(slot, works.clock);
  }
}

/**
 * A region's level changed (client/tilesman listen): its tier, and its
 * bulldozers brought up to date as it wakes.
 */
function levelChanged(self, key, to) {
  var tier = tierOf(to),
    n = tier === DORMANT ? 0 : dozersIn(self, key);

  self.scheduler.set(key, tier, VIEW - to, performance.now());

  for (var i = 0; i < n; i++)
    self.works.advance(self.found[i], self.works.clock);
}

/**
 * Where a bulldozer is now: under its tile in the index, and with a view
 * while it is in view, none while not.
 *
 * @returns {boolean} whether it has a view
 */
function track(self, slot) {
  var cols = self.works.store.cols;

  self.index.set(slot, Math.round(cols.x[slot]), Math.round(cols.y[slot]));

  if (levelOf(self, slot) === VIEW) {
    if (!self.views[slot]) self.views[slot] = show();
    return true;
  }

  unshow(self, slot);
  return false;
}

//a view: a game object with the picture of a bulldozer and its lights
function show() {
  var go = new engine.GameObject("clearworks"),
    renderer = new WorkLights.Renderer();

  renderer.layer = RenderLayer.buildingsLayer;
  go.addComponent(renderer);

  return { go: go, renderer: renderer, seen: null, dusted: 0 };
}

function unshow(self, slot) {
  var v = self.views[slot];

  if (!v) return;

  if (v.go.world !== null) v.go.world.removeGameObject(v.go);
  self.views[slot] = null;
}

//a bulldozer coming out of its dust, or going off into it: a few puffs of
//it, if it is in view
function appear(self, slot) {
  var cols = self.works.store.cols;

  self.index.set(slot, Math.round(cols.x[slot]), Math.round(cols.y[slot]));
  if (levelOf(self, slot) !== VIEW) return;

  for (var k = 0; k < 3; k++)
    dust(
      self,
      cols.x[slot] + (Math.random() - 0.5) * 0.6,
      cols.y[slot] + (Math.random() - 0.5) * 0.6,
      2,
    );
}

//whether a tile's region is in view
function inView(self, tile) {
  var tm = self.root.tilesman;

  return (
    tm.levelOf(tm.regionOf(Terrain.extractX(tile), Terrain.extractY(tile))) ===
    VIEW
  );
}

//a cloud of dust going up all over a tile, if it is in view
function burst(self, tile) {
  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile);

  if (!inView(self, tile)) return;

  for (var k = 0; k < BURST; k++)
    dust(
      self,
      x + (Math.random() - 0.5) * 0.8,
      y + (Math.random() - 0.5) * 0.8,
      Math.random() * 6,
    );
}

/**
 * Kicks up a little dust now and then, as it drives or pushes on over a
 * tile, where its blade is.
 */
function kick(self, slot, v, dt) {
  var cols = self.works.store.cols,
    phase = cols.phase[slot];

  if (
    phase !== Works.DRIVING &&
    !(phase === Works.SHOVING && cols.t[slot] / Works.SHOVE_MS > 0.5)
  )
    return;

  v.dusted += dt;
  if (v.dusted < DUST_EVERY) return;
  v.dusted = 0;

  var h = View.headingVector(Works.HEADINGS[cols.heading[slot]]),
    side = (Math.random() - 0.5) * 0.5;

  dust(
    self,
    cols.x[slot] + h[0] * Works.BLADE - h[1] * side,
    cols.y[slot] + h[1] * Works.BLADE + h[0] * side,
    Math.random() * 3,
  );
}

//a puff of dust at x, y in tiles, `up` over the ground there
function dust(self, x, y, up) {
  Smoke.puff(
    self.root.game.logic.world,
    x * Config.tileSize,
    (Carman.groundHeight(self.root, x, y) * Config.tileZStep || 0) + up,
    y * Config.tileSize,
    Smoke.dust,
  );
}

/**
 * Puts a bulldozer's view where it is, facing the way it does as it is seen
 * - its picture and its lights - coming out of its dust or going off into
 * it.
 */
function place(self, slot, dt) {
  var v = self.views[slot],
    cols = self.works.store.cols,
    go = v.go,
    heading = View.heading(Works.HEADINGS[cols.heading[slot]]),
    renderer = v.renderer,
    x = cols.x[slot],
    y = cols.y[slot],
    fading =
      cols.phase[slot] === Works.LEAVING
        ? 1 - cols.t[slot] / Works.FADE_MS
        : Math.min(1, cols.age[slot] / Works.FADE_MS);

  kick(self, slot, v, dt);

  if (v.seen !== heading) {
    var vehicles = self.root.generated ? self.root.generated.vehicles : null,
      look =
        vehicles && vehicles.bulldozer
          ? vehicles.bulldozer.colors.yellow[heading]
          : null;

    if (!look) return;

    renderer.setSprite(self.root.sprites.getSprite(look.sprite));
    renderer.pivotX = look.pivotX;
    renderer.pivotY = look.pivotY;
    v.seen = heading;
  }

  //its lights on only once it is all there
  renderer.lights =
    fading < 1 ? null : WorkLights.machineOf("bulldozer", heading);
  renderer.opacity = Math.max(0, fading);

  go.transform.setPosition(
    x * Config.tileSize,
    Carman.groundHeight(self.root, x, y) * Config.tileZStep,
    y * Config.tileSize,
  );

  if (go.world === null) self.root.game.logic.world.addGameObject(go);
}

export default Clearworks;
