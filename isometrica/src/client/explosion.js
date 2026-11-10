import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import Demolition from "./demolition";
import Collapse from "./collapse";
import Felling from "./felling";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import BuildingClassCode from "../data/classcode";
import { changed } from "./looks";

/**
 * A building blown up (core/city explode). It is gone from the world at
 * once - rubble left on every tile of the building itself, its yard left
 * wrecked - and what it looked like stands where it was a moment longer
 * (client/collapse), its lights out, no fence round it and no bulldozer
 * coming: the charges go off at its foot, flashing, and it shakes; then it
 * goes up. A fireball bursts out of it, white-hot to orange to soot
 * (SmokeScript fire) - out of the building itself, not its yard - and
 * pieces of it are torn off every floor and flung out any way at all and
 * high up, to fall all round, bounce, lie a while and go (client/
 * demolition burst). What is left of it stands there blackened and broken
 * an instant, and comes down a tile at a time, one after another, floor
 * onto floor - the tiles still standing open where the ones in front have
 * gone - the rubble coming up under the dust as each goes, smouldering a
 * while after (client/fires). Its yard, its car park, its playground, a
 * park, all of it, is the wreck of itself in the dust.
 *
 * And a cloud of dust rolls out of it over everything round it, and down
 * the streets from it a road at a time, hanging over all of it a long
 * while (SmokeScript cloud) - while whatever the blast took the health out
 * of round it comes down too, the nearest first (client/buildman explode).
 *
 * Turned round, it is down at once, and the rubble there. None of it is
 * kept: after a reload there is the rubble.
 */

var P = Demolition.pieces,
  Terrain = Core.Terrain;

//a tile across, world units; and how far up the world a pixel up the screen
//is
var TILE = Config.tileSize,
  PER_PIXEL = Config.tileZStep / 8;

//how long the charges go off at its foot before it goes up, ms - shaking
//harder and harder - and how often one goes off on a tile of it, on
//average
var FUSE_MS = 500,
  CHARGE_EVERY = 160;

//the pieces torn off it: how many off every floor, how fast out and up,
//world units a second - out any way at all, all round it - how long they
//lie where they fall, ms - and how many of a building at most
var FLING = {
    n: 7,
    out: [40, 150],
    up: [70, 210],
    lie: [2500, 5500],
    around: true,
  },
  MOST = 300;

//what is left standing of it: how long after it goes up its first tile
//gives, and how far apart the rest do, ms; how black it is (client/burnt
//char); how much dust each tile comes down in
var GIVES = 140,
  APART = 340,
  CHARRED = 62,
  DUST_DOWN = 6;

//the fireball: puffs of it over every tile, and in the middle of it; and
//puffs of it all together at the most
var FIRE_EACH = 6,
  FIRE_MIDDLE = 8,
  MOST_PUFFS = 220;

//the dust: puffs of it rolling out of every tile of it, how fast; down the
//streets from it, how many tiles along them at the most, how long it takes
//to roll a tile further, ms, how fast it rolls to begin with and how many
//puffs of it over every tile it gets to
var RING_EACH = 7,
  RING = [26, 64],
  STREETS = 9,
  STREET_MS = 150,
  ROLL = [20, 36],
  STREET_PUFFS = 2;

/**
 * A building about to go up, from where it stands: what it looks like
 * taken off its view - which whoever has it lets go of then - and stood up
 * in its place, every tile of it; it goes up once its fuse is lit (light).
 *
 * @param root {Vkaria} what it is drawn with: the pictures (sprites), the
 *        world it is drawn in (game.logic.world), the ground under it
 *        (core.terrain) and the rubble the world leaves there (buildman)
 * @param building {{view: BuildingView, staticData: Object, data: Object}}
 *        the client's building, its view up still
 * @param tiles {number[]} every tile of the building itself
 * @param [yards] {number[]} and every tile of it that is only its yard
 */
function Explosion(root, building, tiles, yards) {
  var self = this,
    at = building.view.gameObject.transform.getPosition([0, 0, 0]),
    //what bursts: the building itself - a park, all of it
    bursts = tiles.length > 0 ? tiles : yards || [];

  this.root = root;
  this.tiles = bursts.slice();
  this.columns = {};
  this.chunks = [];
  this.chunked = 0;
  this.most = MOST;
  this.puffs = 0;
  //the dust rolling down the streets, still to come: {at, tile, from}
  this.waves = [];
  //the trees it knocks over, still to go: {at, tile, push, letGo}
  this.trees = [];
  //the middle of it, in the world
  this.mx = 0;
  this.mz = 0;
  //standing, its fuse lit, blown up - or over
  this.state = "standing";
  this.t = 0;

  bursts.forEach(function (t) {
    self.mx += (Terrain.extractX(t) * TILE) / bursts.length;
    self.mz += (Terrain.extractY(t) * TILE) / bursts.length;
    self.columns[t] = P.column(t);
  });

  this.go = new engine.GameObject("explosion");
  this.go.explosion = this;
  this.go.transform.setPosition(at[0], at[1], at[2]);
  this.go.addComponent(new ExplosionScript(this));
  root.game.logic.world.addGameObject(this.go);

  //what is torn off it when it goes up, cut out of it as it stands - not
  //to be seen till then: what stands of it is the collapse's
  P.stand(this, building.view.gameObject, at);
  for (var tile in this.columns) {
    var col = this.columns[tile];

    col.whole.concat(col.feet).forEach(P.gone);
    col.whole = [];
    col.feet = [];
  }

  //what stands of it, to come down after
  this.collapse = new Collapse.Collapse(root, building, tiles, {
    delay: FUSE_MS + GIVES,
    apart: APART,
    from: [this.mx, this.mz],
    dust: DUST_DOWN,
    yards: yards || [],
    yardsAt: FUSE_MS,
  });

  //turned round: down at once, the rubble there
  this.turned = Events.on(
    View,
    View.events.change,
    function () {
      self.stop();
    },
    this,
  );
}

/**
 * Its fuse lit: the charges go off at its foot, and it goes up a moment
 * after - once the world has let go of it and left its rubble, which is not
 * to be seen till then.
 */
Explosion.prototype.light = function () {
  if (this.state !== "standing") return;

  this.state = "fuse";
  this.t = 0;
  this.collapse.start();

  var self = this;

  this.trees.forEach(function (t) {
    lying(self, t.tile, 0);
  });
};

/**
 * All of it gone there and then, with nothing shown of it going - and the
 * rubble there, as it lies.
 */
Explosion.prototype.stop = function () {
  for (var tile in this.columns) {
    var col = this.columns[tile];

    col.floors.concat(col.feet, col.whole).forEach(P.gone);
    col.floors = [];
    col.feet = [];
    col.whole = [];
    col.cuts = [];
  }

  this.chunks.forEach(function (c) {
    if (c.go.world !== null) c.go.world.removeGameObject(c.go);
  });
  this.chunks = [];
  this.waves = [];
  this.trees.forEach(function (t) {
    if (!t.gone) t.letGo(t.push);
    lying(this, t.tile, 1);
  }, this);
  this.trees = [];
  this.collapse.stop();

  end(this);
};

/**
 * A tree it knocks over (core/city explode), so long after it goes up -
 * the way push goes - from where it stands (client/envman, client/buildman
 * hold, letGo); lying for good once it is down (client/buildingview
 * fallen), not to be seen till then.
 *
 * @param tile {number}
 * @param push {string} "x+", "x-", "y+", "y-"
 * @param after {number} ms after it goes up
 * @param letGo {function(string)}
 */
Explosion.prototype.fell = function (tile, push, after, letGo) {
  this.trees.push({
    tile: tile,
    push: push,
    at: after,
    letGo: letGo,
    gone: false,
  });
};

//the tree knocked down lying on tile, as see-through as k says
function lying(self, tile, k) {
  var b = self.root.buildman.getBuilding(tile);

  if (b !== null && b.view && b.view.opacity !== k) b.view.setOpacity(k);
}

/**
 * Whether all of it is over: blown up, every piece of it gone, the rubble
 * up.
 */
Explosion.prototype.over = function () {
  return this.state === "over";
};

/**
 * How many pieces of it are flying or lying about.
 */
Explosion.prototype.pieces = function () {
  return this.chunks.length;
};

function ExplosionScript(explosion) {
  engine.Component.call(this);
  this.explosion = explosion;
}

ExplosionScript.prototype = Object.create(engine.Component.prototype);
ExplosionScript.prototype.profileName = "explosion";

ExplosionScript.prototype.tick = function (time) {
  var self = this.explosion,
    dt = time.dt;

  if (self.state === "standing" || self.state === "over") return;

  self.t += dt;

  if (self.state === "fuse") {
    fuse(self, dt);
    if (self.t >= FUSE_MS) blast(self);
  } else if (self.state === "blown") {
    roll(self);
    trees(self);
  }

  P.flyOn(self, dt);

  if (
    self.state === "blown" &&
    self.chunks.length === 0 &&
    self.waves.length === 0 &&
    self.trees.length === 0 &&
    self.collapse.over()
  )
    end(self);
};

/**
 * The charges going off at its foot: a flash here and there, a puff of
 * dust - and all of it shaking, harder and harder.
 */
function fuse(self, dt) {
  var k = Math.min(1, self.t / FUSE_MS) * 0.9,
    columns = self.collapse.demolition.columns,
    g = self.go.transform.getPosition([0, 0, 0]);

  self.collapse.tiles.forEach(function (tile) {
    var col = columns[tile];

    if (col === undefined || col.state !== "standing") return;

    col.whole.forEach(function (p) {
      P.seat(
        p,
        p.x0 + (Math.random() - 0.5) * k,
        p.y0,
        p.z0 + (Math.random() - 0.5) * k,
      );
    });
  });

  self.tiles.forEach(function (tile) {
    if (Math.random() >= dt / CHARGE_EVERY) return;

    var x = (Terrain.extractX(tile) + (Math.random() - 0.5) * 0.8) * TILE,
      z = (Terrain.extractY(tile) + (Math.random() - 0.5) * 0.8) * TILE;

    puff(self, SmokeScript.fire, x - g[0], z - g[2], 2, 6);
    P.debris(self, x - g[0], z - g[2], Math.random() * 3, 10);
  });
}

/**
 * It goes up: a fireball bursting out of it, pieces of it torn off every
 * floor of every tile and flung out and up - what is left of it blackened,
 * to come down after (client/collapse) - and the dust rolling out of it
 * and down the streets.
 */
function blast(self) {
  var g = self.go.transform.getPosition([0, 0, 0]),
    high = 0;

  self.state = "blown";
  self.t = 0;

  //what stands of it, blackened and broken
  self.collapse.demolition.burn(
    "c:" + ((self.tiles[0] * 7) % 100000) + ":" + CHARRED,
  );

  for (var tile in self.columns) {
    var col = self.columns[tile],
      x = Terrain.extractX(+tile) * TILE - g[0],
      z = Terrain.extractY(+tile) * TILE - g[2],
      top = 0,
      k;

    P.slice(self, col);

    //the floors of it - or, for a park, what is laid on the ground
    (col.floors.length > 0 ? col.floors : col.feet).forEach(function (f) {
      //laid on the ground: a floor of it, low
      if (f.cuttable === undefined) {
        f.base = 0;
        f.h = 6;
        f.cuttable = !!(f.part && f.part.name);
      }
      //how high it stands over where the building is drawn from
      var foot = P.bottomOf(f, f.y0 - g[1]);

      top = Math.max(top, (isFinite(foot) ? foot : 0) + f.h * PER_PIXEL);
      P.burst(self, col, f, FLING);
    });
    col.floors.concat(col.feet).forEach(P.gone);
    col.floors = [];
    col.feet = [];
    high = Math.max(high, top);

    for (k = 0; k < FIRE_EACH; k++)
      puff(
        self,
        SmokeScript.fire,
        x + (Math.random() - 0.5) * TILE * 0.8,
        z + (Math.random() - 0.5) * TILE * 0.8,
        Math.random() * Math.max(8, top),
        20 + Math.random() * 30,
      );
  }

  //and in the middle of it all, the heart of the fireball
  for (var i = 0; i < FIRE_MIDDLE; i++)
    puff(
      self,
      SmokeScript.fire,
      self.mx - g[0] + (Math.random() - 0.5) * TILE * 0.5,
      self.mz - g[2] + (Math.random() - 0.5) * TILE * 0.5,
      Math.max(8, high) * (0.2 + Math.random() * 0.5),
      10 + Math.random() * 20,
    );

  ring(self);
  self.waves = streets(self);

  changed();
}

/**
 * The dust rolling out of every tile of it, any way at all, low and fast -
 * to hang over everything round it.
 */
function ring(self) {
  var world = self.root.game.logic.world;

  self.tiles.forEach(function (tile) {
    var x = Terrain.extractX(tile),
      y = Terrain.extractY(tile),
      ground = groundAt(self, x, y);

    for (var k = 0; k < RING_EACH; k++) {
      var a = Math.random() * Math.PI * 2,
        v = RING[0] + Math.random() * (RING[1] - RING[0]);

      SmokeSource.puff(
        world,
        (x + (Math.random() - 0.5) * 0.7) * TILE,
        ground + Math.random() * 14,
        (y + (Math.random() - 0.5) * 0.7) * TILE,
        SmokeScript.cloud,
        Math.cos(a) * v,
        Math.sin(a) * v,
      );
    }
  });
}

/**
 * The roads the dust rolls down from it: every tile of road next to it,
 * and the road on from those a tile at a time, STREETS at most - when the
 * dust gets to each (at, ms after it goes up), and from which tile: {at,
 * tile, from, step}.
 */
function streets(self) {
  var service = self.root.core.buildingService,
    seen = {},
    queue = [],
    out = [];

  function road(t) {
    var b = service.get(t);

    return b !== null && b.data.classCode === BuildingClassCode.road;
  }

  self.tiles.forEach(function (t) {
    seen[t] = true;
  });

  self.tiles.forEach(function (t) {
    for (var dx = -1; dx <= 1; dx++)
      for (var dy = -1; dy <= 1; dy++) {
        var n = t + dx + dy * Terrain.dy;

        if (seen[n] || !road(n)) continue;
        seen[n] = true;
        queue.push({ tile: n, from: t, step: 0 });
      }
  });

  for (var i = 0; i < queue.length; i++) {
    var q = queue[i];

    out.push({
      at: q.step * STREET_MS,
      tile: q.tile,
      from: q.from,
      step: q.step,
    });

    if (q.step >= STREETS) continue;

    [1, -1, Terrain.dy, -Terrain.dy].forEach(function (d) {
      var n = q.tile + d;

      if (seen[n] || !road(n)) return;
      seen[n] = true;
      queue.push({ tile: n, from: q.tile, step: q.step + 1 });
    });
  }

  return out;
}

//the dust rolling down the streets, as it gets to each tile of them -
//rolling on the way it came, slower the further it has rolled
function roll(self) {
  var world = self.root.game.logic.world;

  self.waves = self.waves.filter(function (w) {
    if (self.t < w.at) return true;

    var x = Terrain.extractX(w.tile),
      y = Terrain.extractY(w.tile),
      dx = x - Terrain.extractX(w.from),
      dy = y - Terrain.extractY(w.from),
      l = Math.hypot(dx, dy) || 1,
      slow = 1 - w.step / (STREETS + 3),
      ground = groundAt(self, x, y);

    for (var k = 0; k < STREET_PUFFS; k++) {
      var v = (ROLL[0] + Math.random() * (ROLL[1] - ROLL[0])) * slow;

      SmokeSource.puff(
        world,
        (x + (Math.random() - 0.5) * 0.6) * TILE,
        ground + 1 + Math.random() * 8,
        (y + (Math.random() - 0.5) * 0.6) * TILE,
        SmokeScript.cloud,
        (dx / l) * v + (Math.random() - 0.5) * 6,
        (dy / l) * v + (Math.random() - 0.5) * 6,
      );
    }

    return false;
  });
}

//the trees going over as the blast gets to them, and lying there for good
//once they are down
function trees(self) {
  self.trees = self.trees.filter(function (t) {
    if (!t.gone && self.t >= t.at) {
      t.gone = true;
      t.letGo(t.push);
    }

    if (t.gone && self.t >= t.at + Felling.LANDS) {
      lying(self, t.tile, 1);
      return false;
    }

    return true;
  });
}

//how high the ground is at a tile's corner, world units
function groundAt(self, x, y) {
  return self.root.core.terrain.getGridPointHeight(x, y) * Config.tileZStep;
}

/**
 * A puff of kind x, z off where the building is drawn from (world units),
 * up that high over the ground there, thrown out from the middle of it - so
 * many puffs at the most.
 */
function puff(self, kind, x, z, up, out) {
  if (self.puffs >= MOST_PUFFS) return;

  self.puffs++;

  var g = self.go.transform.getPosition([0, 0, 0]),
    wx = g[0] + x,
    wz = g[2] + z,
    dx = wx - self.mx,
    dz = wz - self.mz,
    l = Math.hypot(dx, dz) || 1;

  SmokeSource.puff(
    self.root.game.logic.world,
    wx,
    g[1] + up,
    wz,
    kind,
    (dx / l) * out,
    (dz / l) * out,
  );
}

//all of it over: every piece gone, the rubble there
function end(self) {
  if (self.state === "over") return;

  self.state = "over";
  if (self.go.world !== null) self.go.world.removeGameObject(self.go);
  if (self.turned !== null) {
    Events.off(View, View.events.change, self.turned);
    self.turned = null;
  }
  changed();
}

/**
 * How long after its fuse is lit a building blown up goes up, ms - for
 * what the blast brings down round it to come down after (client/buildman
 * explode).
 */
Explosion.FUSE_MS = FUSE_MS;

export default { Explosion: Explosion };
