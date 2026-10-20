/**
 * Created by User on 13.07.2014.
 */
import engine from "engine";
import Core from "../core/main";
import Tile from "./gameObjects/tile";
import Config from "./config";
import Events from "events";
import Generated from "./generated";
import View from "./view";
import AnimatedSprite from "./animatedsprite";
import TerrainGridRenderer from "./components/terraingridrenderer";

var TerrainType = Core.TerrainType;
var TileIterator = Core.TileIterator;
var CoreTerrain = Core.Terrain;

//how deep water has to be to be drawn as deep water, see waterDepth: the
//first level along the shore stays the shallows
var DEEP_WATER = 2;

//where deep water spills over the shallows from: every edge and corner of a
//tile as it is seen, and the tile there off it (shared/gen/terrain
//DIRECTIONS) - a corner only where neither edge next to it does already
var SPILLS = [
  ["ne", 1, 0],
  ["se", 0, -1],
  ["sw", -1, 0],
  ["nw", 0, 1],
  ["n", 1, 1, "ne", "nw"],
  ["e", 1, -1, "ne", "se"],
  ["s", -1, -1, "se", "sw"],
  ["w", -1, 1, "sw", "nw"],
];

/**
 * The edges and corners of a tile of the shallows, as it is seen, that deep
 * water lies beyond.
 */
function spillsOf(x, y) {
  var terrain = vkaria.core.world.terrain,
    out = [];

  SPILLS.forEach(function (s) {
    if (s[3] && (out.indexOf(s[3]) !== -1 || out.indexOf(s[4]) !== -1)) return;

    var w = View.unvector(s[1], s[2]),
      nx = x + w[0],
      ny = y + w[1];

    if (
      terrain.getTerrainType(nx, ny) === TerrainType.water &&
      waterDepth(nx, ny) >= DEEP_WATER
    )
      out.push(s[0]);
  });

  return out;
}

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
 * The sprite of a tile of that terrain type and slope - painted the first
 * time it is drawn, see client/generated and client/generator.
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

  var parts = Generated.tileParts(
    terrain,
    kind,
    slope,
    x,
    y,
    kind === "water" ? spillsOf(x, y) : null,
  );

  //the water moves: a tile of it, and the water up a shore over the ground
  if ((kind === "water" || kind === "deep") && terrain.waves)
    return waves(parts, terrain.waves, 0);
  if (
    kind === "shore" &&
    terrain.waves &&
    parts.length > 1 &&
    /\/shore\//.test(parts[1])
  )
    return waves(parts, terrain.waves, 1);

  return composite(parts);
}

//a tile's parts put together, as it is seen - or from straight above
function composite(parts) {
  return View.top()
    ? vkaria.sprites.getTop(parts)
    : vkaria.sprites.getComposite(parts);
}

//where a tile's picture is drawn from: where the tile's middle is in it -
//from the side, the W corner's height the tile is put at; from above, the
//middle of its square
var PIVOT_X = 32,
  PIVOT_Y = 24,
  TOP_PIVOT = 32;

//the water's tiles as they move, by what they are put together out of -
//one for every tile that looks the same
var moving = {};

/**
 * The sea's ripples on a tile of water, or on the water up a shore: its
 * parts, the one at index - its water - frame by frame
 * (client/animatedsprite), the rest as they are.
 */
function waves(parts, w, index) {
  var top = View.top(),
    key = (top ? "top:" : "") + parts.join("+");

  if (moving[key] === undefined) {
    var frames = [];

    for (var f = 0; f < w.frames; f++)
      frames.push(
        composite(
          parts.map(function (part, i) {
            return i === index ? vkaria.sprites.frameName(part, f) : part;
          }),
        ),
      );

    moving[key] = new AnimatedSprite(frames, w.ms);
  }

  return moving[key];
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
  //the grid over the ground (showGrid)
  this.grid = new TerrainGridRenderer(this);
}

Terrain.events = events;

Terrain.prototype.init = function () {
  //the camera turned (see client/view): every tile shows its ground as it
  //is seen from the new side
  Events.on(
    View,
    View.events.change,
    function (sender, args, self) {
      for (var index in self.tiles)
        if (self.tiles[index]) shapeTile(self, self.tiles[index], +index);
    },
    this,
  );

  var grid = new engine.GameObject("terrain grid");

  grid.addComponent(this.grid);
  this.root.game.logic.world.addGameObject(grid);
};

/**
 * Draws the grid over the ground, or leaves it off - drawn as lines over the
 * tiles (components/terraingridrenderer), so none of them is drawn again.
 *
 * @param shown {boolean}
 */
Terrain.prototype.showGrid = function (shown) {
  this.grid.shown = shown;
};

/**
 * The pictures of the tiles there are for which near(x, y) holds - as they
 * are seen now, with View peek from another side - into out, without
 * drawing anything (client/preloader).
 *
 * @param near {function(number, number): boolean} by where a tile's middle
 *        is in the world
 * @param [keys] {string[]} only these of the tiles (tileKeys)
 */
Terrain.prototype.seenSprites = function (out, near, keys) {
  var terrain = vkaria.core.world.terrain;

  keys = keys || this.tileKeys();

  for (var k = 0; k < keys.length; k++) {
    if (!this.tiles[keys[k]]) continue;

    var index = +keys[k],
      x = Core.Terrain.extractX(index),
      y = Core.Terrain.extractY(index);

    if (!near(x * Config.tileSize, y * Config.tileSize)) continue;

    out.push(
      tileSprite(
        x,
        y,
        terrain.getTerrainType(x, y),
        calcSpriteCode(this, x, y),
      ),
    );
  }
};

//the tiles there are, by index, for going through a few at a time
Terrain.prototype.tileKeys = function () {
  return Object.keys(this.tiles);
};

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
      this.grid.stale = true;
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

  //the corners as the tile is seen, the camera turned (see client/view):
  //on the left, at the bottom, on the right, at the top
  var z0 = View.cornerHeight(terrain, x, y, 0),
    z1 = View.cornerHeight(terrain, x, y, 1),
    z2 = View.cornerHeight(terrain, x, y, 2),
    z3 = View.cornerHeight(terrain, x, y, 3);

  return 2000 + (z1 - z0 + 2) * 100 + (z2 - z0 + 2) * 10 + (z3 - z0 + 2);
}

var routine = function (iter, self) {
  var i = 0;
  while (i++ < 128) {
    var index = iter.next();

    if (index === -1) return -1;

    if (!self.tiles[index]) {
      var t = CreateTile(self);

      shapeTile(self, t, index);
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

  //the corner on the left as it is seen - sprites are drawn with the most
  //left grid point as their pivot. Water is drawn at its surface, whatever
  //lies underneath
  if (type !== TerrainType.water) z = View.cornerHeight(terrain, x, y, 0);

  //how high its corners are drawn, for the grid over it
  //(components/terraingridrenderer): at x, y, x + 1, y, x, y + 1 and
  //x + 1, y + 1 - all at the water's surface for a tile of water
  var h = t.heights || (t.heights = new Int8Array(4));

  if (type === TerrainType.water) h.fill(0);
  else {
    h[0] = terrain.getGridPointHeight(x, y);
    h[1] = terrain.getGridPointHeight(x + 1, y);
    h[2] = terrain.getGridPointHeight(x, y + 1);
    h[3] = terrain.getGridPointHeight(x + 1, y + 1);
  }
  self.grid.stale = true;

  t.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );

  sprite = tileSprite(x, y, type, slope);

  t.renderer.setSprite(sprite);
  if (View.top()) t.renderer.setPivot(TOP_PIVOT, TOP_PIVOT);
  else t.renderer.setPivot(PIVOT_X, PIVOT_Y);
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
