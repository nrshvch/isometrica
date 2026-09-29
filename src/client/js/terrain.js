/**
 * Created by User on 13.07.2014.
 */
import Core from "core/main";
import Tile from "./gameObjects/tile";
import Config from "./config";
import Events from "events";
import Generated from "./generated";

var TerrainType = Core.TerrainType;
var TileIterator = Core.TileIterator;
var CoreTerrain = Core.Terrain;

//how deep water has to be to be drawn as deep water, see waterDepth: the
//first level along the shore stays the shallows
var DEEP_WATER = 2;

/**
 * How many levels down the water over a tile goes, counted from its highest
 * corner: 1 where a corner is at the water line, as it is all along the
 * shore, and one more for every step down from there.
 */
function waterDepth(x, y) {
  var terrain = vkaria.core.world.terrain;

  return (
    1 -
    Math.max(
      terrain.getGridPointHeight(x, y),
      terrain.getGridPointHeight(x + 1, y),
      terrain.getGridPointHeight(x, y + 1),
      terrain.getGridPointHeight(x + 1, y + 1),
    )
  );
}

/**
 * The sprite of a tile of that terrain type and slope - painted as the game
 * started, see client/generated.
 */
function tileSprite(x, y, type, slope) {
  var terrain = vkaria.generated !== null ? vkaria.generated.terrain : null,
    kind =
      type === TerrainType.water
        ? waterDepth(x, y) >= DEEP_WATER
          ? "deep"
          : "water"
        : type === TerrainType.shore
          ? "shore"
          : "land";

  //nothing was painted: draws nothing, and says so once
  if (terrain === null) return vkaria.sprites.getSprite("gen/terrain");

  return vkaria.sprites.getComposite(
    Generated.tileParts(terrain, kind, slope, x, y),
  );
}

var events = {};

function CreateTile(self) {
  if (self.pool.length > 0) {
    return self.pool.pop();
  } else {
    return new Tile();
  }
}

function Terrain(root) {
  this.tiles = [];
  this.gos = [];
  this.pool = [];
  this.root = root;
}

Terrain.events = events;

Terrain.prototype.init = function () {};

Terrain.prototype.clear = function (x0, y0, w, l) {
  var tile0 = CoreTerrain.convertToIndex(x0, y0);
  var tile1 = CoreTerrain.convertToIndex(x0 + w - 1, y0 + l - 1);
  var iter = new TileIterator(tile0, tile1);
  var tile,
    index,
    tiles = this.tiles,
    pool = this.pool,
    gos = this.gos,
    world = vkaria.game.logic.world;
  while (true) {
    index = iter.next();
    if (index === -1) break;

    tile = this.tiles[index];
    if (tile) {
      world.removeGameObject(tile);
      pool.push(tile);
      delete tiles[index];
      delete gos[tile.instanceId];
    }
  }
};

/**
 * this will calculate slope id starting from most-left point and goings clock-wise
 * @param self
 * @param x
 * @param y
 * @returns {number}
 */
function calcSpriteCode(self, x, y) {
  var terrain = vkaria.core.world.terrain;
  var terrainType = terrain.getTerrainType(x, y);

  if (terrainType === TerrainType.water) return 2222;

  var z0 = terrain.getGridPointHeight(x, y + 1), //gridPoints[2];
    z1 = terrain.getGridPointHeight(x + 1, y + 1), //gridPoints[3];
    z2 = terrain.getGridPointHeight(x + 1, y), //gridPoints[1];
    z3 = terrain.getGridPointHeight(x, y); //gridPoints[0];

  return 2000 + (z1 - z0 + 2) * 100 + (z2 - z0 + 2) * 10 + (z3 - z0 + 2);
}

var routine = function (iter, self) {
  var i = 0;
  while (i++ < 128) {
    var index = iter.next();

    if (index === -1) return -1;

    var coreTerrain = vkaria.core.world.terrain;

    var x = index & 0xffff;
    var y = index >>> 16;

    if (!self.tiles[index]) {
      var t = CreateTile(self);

      //var gps = coreTerrain.getGridPoints(x, y);
      var terrain = vkaria.core.world.terrain;

      var gps = [
        terrain.getGridPointHeight(x, y),
        terrain.getGridPointHeight(x + 1, y),
        terrain.getGridPointHeight(x, y + 1),
        terrain.getGridPointHeight(x + 1, y + 1),
      ];

      //var slope = coreTerrain.calcSlopeId(x,y);
      var slope = calcSpriteCode(self, x, y);
      var type = coreTerrain.getTerrainType(x, y);
      var sprite = null;

      var z = 0;

      if (type !== TerrainType.water) z = gps[2]; //2 is west, most left gridpoint, it should be gps[0], but sprites are drawn with pivot point being most left gridpoint

      t.transform.setPosition(
        x * Config.tileSize,
        z * Config.tileZStep,
        y * Config.tileSize,
      );

      sprite = tileSprite(x, y, type, slope);

      t.renderer.setSprite(sprite);
      vkaria.game.logic.world.addGameObject(t);

      self.tiles[index] = t;
      self.gos[t.instanceId] = index;
    }
  }

  return 0;
};

Terrain.prototype.draw0 = function (x0, y0, w, l) {
  var iter = new TileIterator(x0, y0, w, l);

  Isometrica.Engine.Coroutine.startCoroutine(routine, iter, this);
};

/**
 * Puts tile t where the ground of tile index is, with the sprite of its shape.
 */
function shapeTile(self, t, index) {
  var terrain = vkaria.core.world.terrain,
    x = Core.Terrain.extractX(index),
    y = Core.Terrain.extractY(index),
    slope = calcSpriteCode(self, x, y),
    type = terrain.getTerrainType(x, y),
    sprite,
    z = 0;

  //the west corner - sprites are drawn with the most left grid point as
  //their pivot. Water is drawn at its surface, whatever lies underneath
  if (type !== TerrainType.water) z = terrain.getGridPointHeight(x, y + 1);

  t.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );

  sprite = tileSprite(x, y, type, slope);

  t.renderer.setSprite(sprite);
}

function drawTile(self, index) {
  var t = CreateTile(self);

  shapeTile(self, t, index);
  vkaria.game.logic.world.addGameObject(t);

  self.tiles[index] = t;
  self.gos[t.instanceId] = index;
}

Terrain.prototype.draw = function (x0, y0, w, l) {
  var tile0 = CoreTerrain.convertToIndex(x0, y0);
  var tile1 = CoreTerrain.convertToIndex(x0 + w - 1, y0 + l - 1);
  var iter = new TileIterator(tile0, tile1);
  var tiles = this.tiles,
    index;

  while ((index = iter.next()) !== -1) {
    if (!tiles[index]) drawTile(this, index);
  }
};

/**
 * Reshapes tiles after the ground under them moved. Only the ones on screen
 * are - the rest are drawn as they are when their chunk comes in. The tile
 * stays in the world: taking one out only happens at the end of the tick, so
 * putting it straight back in would lose it.
 *
 * @param indexes {number[]}
 */
Terrain.prototype.redraw = function (indexes) {
  var t;

  for (var i = 0; i < indexes.length; i++) {
    t = this.tiles[indexes[i]];

    if (t) shapeTile(this, t, indexes[i]);
  }
};

Terrain.prototype.getTile = function (idx_or_x, y) {
  var idx;

  if (arguments.length === 2) {
    idx = Core.Terrain.convertToIndex(idx_or_x, y);
  } else {
    idx = idx_or_x;
  }

  var t = this.tiles[idx];

  return (t !== undefined && t) || null;
};

/**
 * Find tile coordinates by gameObject
 */
Terrain.prototype.getCoordinates = function (go) {
  return this.gos[go.instanceId] || -1;
};

Terrain.prototype.tileXPos = function (tile) {
  return CoreTerrain.extractX(tile) * Config.tileSize;
};

Terrain.prototype.tileZPos = function (tile) {
  return CoreTerrain.extractY(tile) * Config.tileSize;
};

Terrain.prototype.tileYPos = function (tile) {
  return this.root.core.terrain.getGridPointHeight(tile) * Config.tileZStep;
};

export default Terrain;
