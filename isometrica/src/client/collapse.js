import engine from "engine";
import Core from "../core/main";
import Config from "./config";
import Demolition from "./demolition";
import Yards from "./yards";
import BuildingCode from "../data/buildingcode";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import { changed } from "./looks";

/**
 * A building coming down by itself (core/city explode): no fence round it,
 * no bulldozer at it - the one blown up, and every one the blast took the
 * health out of round it. What it looks like stands in its place
 * (client/demolition), the world having let go of it, and comes down a tile
 * at a time - the nearest to whatever hit it first, the rest one after the
 * other a moment apart, every tile of it shaking, its floors falling onto
 * each other, each in a cloud of dust that hangs there - the tiles still
 * standing open where the ones in front of them have gone (Demolition
 * open). The heaps of rubble the world left on its ground come up under
 * the dust as each tile goes, and with the last of it, it is over. Its
 * yard stands as it was till the blast gets to it, and then it is the
 * wreck the world left there.
 *
 * And which tiles of a building are only its yard (yards), for the world
 * to know where to leave rubble and where only the wreck of a yard.
 */

var Terrain = Core.Terrain,
  TILE = Config.tileSize,
  P = Demolition.pieces;

//how long the rubble takes to come up under the dust once a tile is down,
//ms; and puffs of dust over a tile then, to hang there - and how fast they
//roll out, world units a second, at the least and at the most: hardly off
//the tile
var SHOW_MS = 700,
  DUST_DOWN = 3,
  DUST_OUT = [1.5, 5];

/**
 * @param root {Vkaria}
 * @param building {{view: BuildingView, staticData: Object, data: Object}}
 *        the client's building, its view up still
 * @param tiles {number[]} the tiles of it to come down - not its yard
 * @param [options] {{delay: number, apart: number, from: number[],
 *        dust: number, yards: number[], yardsAt: number}} how long after it
 *        is set going its first tile gives, ms, and how far apart the rest
 *        do, about; from where it was hit, x, z in the world, for the
 *        nearest to give first; how much dust it comes down in, as many
 *        puffs over each tile; the tiles of its yard, and how long after it
 *        is set going they are wrecked
 */
function Collapse(root, building, tiles, options) {
  var self = this,
    o = options || {},
    from = o.from || null;

  this.root = root;
  this.tiles = tiles.slice();
  this.yards = (o.yards || []).slice();
  this.yardsAt = o.yardsAt || 0;
  this.dust = o.dust === undefined ? DUST_DOWN : o.dust;
  this.demolition = new Demolition.Demolition(
    root,
    building,
    tiles.concat(this.yards),
    { fence: false, rubble: false },
  );

  //the nearest first, the rest a moment apart each
  var order = tiles.slice().sort(function (a, b) {
    return from === null
      ? Math.random() - 0.5
      : away(a, from) - away(b, from) + (Math.random() - 0.5) * 0.4;
  });

  this.knocks = order.map(function (t, k) {
    return {
      tile: t,
      at: (o.delay || 0) + k * (o.apart || 300) * (0.7 + 0.6 * Math.random()),
    };
  });
  //each tile's rubble as far up as it is, 0..1
  this.shown = {};
  this.t = 0;
  this.going = false;
  this.done = false;

  this.go = new engine.GameObject("collapse");
  this.go.collapse = this;
  this.go.addComponent(new CollapseScript(this));
  root.game.logic.world.addGameObject(this.go);

  tiles.concat(this.yards).forEach(function (t) {
    self.shown[t] = 0;
  });
}

//how far a tile is from a point in the world, tiles
function away(tile, at) {
  return Math.hypot(
    Terrain.extractX(tile) - at[0] / TILE,
    Terrain.extractY(tile) - at[1] / TILE,
  );
}

/**
 * Set going - once the world has let go of it, and left its rubble: which
 * is not to be seen till the tile it is on is down.
 */
Collapse.prototype.start = function () {
  var self = this;

  this.going = true;
  this.t = 0;
  this.tiles.concat(this.yards).forEach(function (t) {
    show(self, t, 0);
  });
};

/**
 * All of it down there and then, its rubble there - for a camera turned,
 * or a bench put back up.
 */
Collapse.prototype.stop = function () {
  var self = this;

  this.demolition.stop();
  this.knocks = [];
  this.tiles.concat(this.yards).forEach(function (t) {
    show(self, t, 1);
  });
  end(this);
};

/**
 * Whether it is all down, its rubble up, and gone.
 */
Collapse.prototype.over = function () {
  return this.done;
};

/**
 * Whether a tile of it is down yet - every one by now, for a tile not of it.
 */
Collapse.prototype.fallen = function (tile) {
  var col = this.demolition.columns[tile];

  return col === undefined || col.state === "down" || col.state === "gone";
};

function CollapseScript(collapse) {
  engine.Component.call(this);
  this.collapse = collapse;
}

CollapseScript.prototype = Object.create(engine.Component.prototype);
CollapseScript.prototype.profileName = "collapse";

CollapseScript.prototype.tick = function (time) {
  var self = this.collapse,
    d = self.demolition,
    all = true;

  if (!self.going || self.done) return;

  self.t += time.dt;

  self.knocks = self.knocks.filter(function (k) {
    if (self.t < k.at) return true;
    d.knock(k.tile);
    return false;
  });

  //its yard wrecked, as the blast gets to it
  if (self.yards.length > 0 && self.t >= self.yardsAt)
    self.yards.forEach(function (t) {
      if (self.shown[t] === 1) return;
      d.letGo(t);
      show(self, t, 1);
    });
  else if (self.yards.length > 0) all = false;

  self.tiles.forEach(function (t) {
    var col = d.columns[t],
      down = col === undefined || col.state === "down" || col.state === "gone";

    if (!down) {
      all = false;
      return;
    }

    //the dust it comes down in hanging over it, the first time it is seen
    //down, and its rubble coming up
    if (self.shown[t] === 0) cloud(self, t);

    var k = Math.min(1, self.shown[t] + time.dt / SHOW_MS);

    if (k !== self.shown[t]) show(self, t, k);
    if (k < 1) all = false;
  });

  if (all && self.knocks.length === 0 && d.chunks.length === 0) {
    self.tiles.forEach(function (t) {
      d.letGo(t);
    });
    end(self);
  }
};

//a tile's rubble, or its yard wrecked, as see-through as k says - and k
//kept: the world's heap of rubble there, or what is left of a part of a
//building still standing (client/buildingview damaged)
function show(self, tile, k) {
  var b = self.root.buildman.getBuilding(tile);

  self.shown[tile] = k;

  if (b === null || !b.view || !b.staticData) return;

  if (b.staticData.variantOf === BuildingCode.rubble) {
    if (b.view.opacity !== k) b.view.setOpacity(k);
  } else if (b.data && b.data.isDown && b.data.isDown(tile))
    b.view.setTileOpacity(tile, k);
}

//dust over a tile come down, rolling out slowly and hanging there
function cloud(self, tile) {
  var world = self.root.game.logic.world,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    ground = self.root.core.terrain.getGridPointHeight(x, y) * Config.tileZStep;

  self.shown[tile] = 0.001;

  for (var i = 0; i < self.dust; i++) {
    var a = Math.random() * Math.PI * 2,
      v = DUST_OUT[0] + Math.random() * (DUST_OUT[1] - DUST_OUT[0]);

    SmokeSource.puff(
      world,
      (x + (Math.random() - 0.5) * 0.8) * TILE,
      ground + 2 + Math.random() * 10,
      (y + (Math.random() - 0.5) * 0.8) * TILE,
      SmokeScript.cloud,
      Math.cos(a) * v,
      Math.sin(a) * v,
    );
  }
}

function end(self) {
  if (self.done) return;

  self.done = true;
  if (self.go.world !== null) self.go.world.removeGameObject(self.go);
  changed();
}

export default { Collapse: Collapse, yards: Yards.yards, P: P };
