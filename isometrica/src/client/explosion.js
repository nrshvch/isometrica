import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import Demolition from "./demolition";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import BuildingCode from "../data/buildingcode";
import { changed } from "./looks";

/**
 * A building blown up (core/city explode). It is gone from the world at
 * once, the ground under it bare and a heap of rubble left on every tile of
 * it (CityBuildings leaveRubble) - and what it looked like stands where it
 * was a moment longer, its lights out, no fence round it and no bulldozer
 * coming: the charges go off at its foot, flashing, and it shakes; then it
 * goes up. Every floor of every tile of it is torn into pieces of itself
 * (client/demolition burst) flung out any way at all and high up,
 * to fall all round, bounce, lie a while and go; a fireball bursts out over
 * all of it, white-hot to orange to soot (SmokeScript fire), and grey dust
 * rolls out along the ground. Its foot goes
 * in the blast, and the rubble the world left there comes up under the
 * dust.
 *
 * What it is torn apart and thrown about with is a building coming down's
 * (Demolition pieces): taken off the building's view, a tile at a time,
 * each tile's floors the parts it is put together out of, or bands of a
 * picture painted whole.
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

//how its pieces go up: how many off every floor, how fast out and up,
//world units a second - out any way at all, all round it, not just out
//from the middle of it, which for a building a tile or two across is
//along it only - how long they lie where they fall, ms - and how many of a
//building at most
var FLING = {
    n: 18,
    out: [40, 150],
    up: [70, 210],
    lie: [2500, 5500],
    around: true,
  },
  MOST = 480;

//how long its foot takes to go in the blast, ms; and how long after the
//blast the rubble starts to come up under the dust, and takes to, ms
var FEET_MS = 450,
  SHOW_AT = 300,
  SHOW_MS = 900;

//the fireball: puffs of it over every tile, and in the middle of it; grey
//dust rolling out round every tile; and puffs of it all together at the
//most
var FIRE_EACH = 6,
  FIRE_MIDDLE = 8,
  DUST_EACH = 5,
  MOST_PUFFS = 160;

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
 * @param tiles {number[]} every tile it stands on
 */
function Explosion(root, building, tiles) {
  var self = this,
    at = building.view.gameObject.transform.getPosition([0, 0, 0]);

  this.root = root;
  this.tiles = tiles.slice();
  this.columns = {};
  this.chunks = [];
  this.chunked = 0;
  this.most = MOST;
  this.puffs = 0;
  //the middle of it, in the world
  this.mx = 0;
  this.mz = 0;
  //standing, its fuse lit, blown up - or over
  this.state = "standing";
  this.t = 0;

  tiles.forEach(function (t) {
    self.mx += (Terrain.extractX(t) * TILE) / tiles.length;
    self.mz += (Terrain.extractY(t) * TILE) / tiles.length;
    self.columns[t] = P.column(t);
  });

  this.go = new engine.GameObject("explosion");
  this.go.explosion = this;
  this.go.transform.setPosition(at[0], at[1], at[2]);
  this.go.addComponent(new ExplosionScript(this));
  root.game.logic.world.addGameObject(this.go);

  P.stand(this, building.view.gameObject, at);

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
 * after. The rubble the world left on its ground is not to be seen till
 * then.
 */
Explosion.prototype.light = function () {
  if (this.state !== "standing") return;

  this.state = "fuse";
  this.t = 0;
  showRubble(this, 0);
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

  end(this);
};

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
    footGoes(self);
    showRubble(self, Math.max(0, Math.min(1, (self.t - SHOW_AT) / SHOW_MS)));
  }

  P.flyOn(self, dt);

  if (
    self.state === "blown" &&
    self.t >= SHOW_AT + SHOW_MS &&
    self.chunks.length === 0
  )
    end(self);
};

/**
 * The charges going off at its foot: a flash here and there, a puff of
 * dust - and all of it shaking, harder and harder.
 */
function fuse(self, dt) {
  var k = Math.min(1, self.t / FUSE_MS) * 0.9;

  for (var tile in self.columns) {
    var col = self.columns[tile];

    col.whole.forEach(function (p) {
      P.seat(
        p,
        p.x0 + (Math.random() - 0.5) * k,
        p.y0,
        p.z0 + (Math.random() - 0.5) * k,
      );
    });

    if (Math.random() < dt / CHARGE_EVERY) {
      var x = (Terrain.extractX(+tile) + (Math.random() - 0.5) * 0.8) * TILE,
        z = (Terrain.extractY(+tile) + (Math.random() - 0.5) * 0.8) * TILE,
        g = self.go.transform.getPosition([0, 0, 0]);

      puff(self, SmokeScript.fire, x - g[0], z - g[2], 2, 6);
      P.debris(self, x - g[0], z - g[2], Math.random() * 3, 10);
    }
  }
}

/**
 * It goes up: every tile of it torn into its floors and every floor into
 * pieces of itself, flung out and up; the fireball bursting out over all of
 * it, and grey dust rolling out round it.
 */
function blast(self) {
  var g = self.go.transform.getPosition([0, 0, 0]),
    high = 0;

  self.state = "blown";
  self.t = 0;

  for (var tile in self.columns) {
    var col = self.columns[tile],
      x = Terrain.extractX(+tile) * TILE - g[0],
      z = Terrain.extractY(+tile) * TILE - g[2],
      top = 0,
      k;

    P.slice(self, col);

    col.floors.forEach(function (f) {
      top = Math.max(top, P.bottomOf(f, f.y) + f.h * PER_PIXEL);
      P.burst(self, col, f, FLING);
      P.gone(f);
    });
    col.floors = [];
    col.feet.forEach(function (f) {
      f.go.spriteRenderer.dither = true;
    });
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

    for (k = 0; k < DUST_EACH; k++)
      P.debris(
        self,
        x + (Math.random() - 0.5) * TILE * 0.9,
        z + (Math.random() - 0.5) * TILE * 0.9,
        Math.random() * 6,
        30 + Math.random() * 30,
      );
  }

  //and in the middle of it all, the heart of the fireball
  for (var i = 0; i < FIRE_MIDDLE; i++)
    puff(
      self,
      SmokeScript.fire,
      self.mx - g[0] + (Math.random() - 0.5) * TILE * 0.5,
      self.mz - g[2] + (Math.random() - 0.5) * TILE * 0.5,
      high * (0.2 + Math.random() * 0.5),
      10 + Math.random() * 20,
    );

  changed();
}

//its foot going in the blast, dithered away
function footGoes(self) {
  var k = Math.min(1, self.t / FEET_MS);

  for (var tile in self.columns) {
    var col = self.columns[tile];

    col.feet.forEach(function (f) {
      f.go.spriteRenderer.opacity = 1 - k;
    });
    if (k >= 1) {
      col.feet.forEach(P.gone);
      col.feet = [];
    }
  }
}

/**
 * The rubble the world left on its ground (core/city explode) as see-through
 * as k says - 0 not to be seen, 1 as it lies - wherever it lies still.
 */
function showRubble(self, k) {
  var buildman = self.root.buildman;

  self.tiles.forEach(function (tile) {
    var b = buildman.getBuilding(tile);

    if (
      b !== null &&
      b.view &&
      b.staticData &&
      b.staticData.variantOf === BuildingCode.rubble &&
      b.view.opacity !== k
    )
      b.view.setOpacity(k);
  });
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
  showRubble(self, 1);
  if (self.go.world !== null) self.go.world.removeGameObject(self.go);
  if (self.turned !== null) {
    Events.off(View, View.events.change, self.turned);
    self.turned = null;
  }
  changed();
}

export default { Explosion: Explosion };
