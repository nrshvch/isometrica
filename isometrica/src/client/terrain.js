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
import { changed } from "./looks";

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
 * The edges and corners of a tile, as it is seen, that the tile there off it
 * is one beyond(x, y) holds for - a corner only where neither edge next to
 * it is.
 */
function edgesOf(x, y, beyond) {
  var out = [],
    around = aroundNow();

  for (var i = 0; i < SPILLS.length; i++) {
    var s = SPILLS[i];

    if (s[3] && (out.indexOf(s[3]) !== -1 || out.indexOf(s[4]) !== -1))
      continue;

    if (beyond(x + around[i][0], y + around[i][1])) out.push(s[0]);
  }

  return out;
}

//where each of SPILLS is off a tile in the world, the camera turned as it
//is - worked out once for every way it turns, as every tile drawn asks
var arounds = [];

function aroundNow() {
  var t = View.turns();

  return (
    arounds[t] ||
    (arounds[t] = SPILLS.map(function (s) {
      return View.unvector(s[1], s[2]);
    }))
  );
}

/**
 * The edges and corners of a tile of the shallows, as it is seen, that deep
 * water lies beyond.
 */
function spillsOf(x, y) {
  var terrain = vkaria.core.world.terrain;

  return edgesOf(x, y, function (nx, ny) {
    return (
      terrain.getTerrainType(nx, ny) === TerrainType.water &&
      waterDepth(nx, ny) >= DEEP_WATER
    );
  });
}

//what the ground of a tile of land is: grass; the earth it was cleared down
//to (core/terrain bareFor); or that earth with the grass growing back over
//it
var GRASS = 0,
  BARE = 1,
  REGROWING = 2;

//how much of the while it takes the grass to grow back (core/terrain
//REGROWS) the earth lies bare before it starts to - give or take so much of
//it from tile to tile, so that a field cleared all at once greens over a tile
//at a time
var BARE_SHARE = 0.4,
  BARE_JITTER = 0.25;

//a number 0..1 for a tile, always the same for it
function tileHash(x, y) {
  var h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ 0x6a09e667;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * What the ground of the tile at x, y is - GRASS, BARE or REGROWING. Water
 * is none of them; and a tile being cleared is grass still until the
 * bulldozer gets to it (client/clearworks).
 */
function groundOf(x, y) {
  var terrain = vkaria.core.world.terrain,
    tile = CoreTerrain.convertToIndex(x, y),
    t = terrain.bareFor(tile);

  if (t < 0 || terrain.getTerrainType(x, y) === TerrainType.water) return GRASS;
  if (vkaria.clearworks && vkaria.clearworks.holds(tile)) return GRASS;

  return t <
    CoreTerrain.REGROWS * (BARE_SHARE + BARE_JITTER * (tileHash(x, y) - 0.5))
    ? BARE
    : REGROWING;
}

//the grass on a tile, to spill over the earth growing back over next to it
function grassAt(x, y) {
  return (
    groundOf(x, y) === GRASS &&
    vkaria.core.world.terrain.getTerrainType(x, y) !== TerrainType.water
  );
}

//the earth of a tile cleared, to spill over the land next to it
function bareAt(x, y) {
  return groundOf(x, y) === BARE;
}

/**
 * How a tile of land is drawn where the ground was cleared, on it or next to
 * it (client/generated tileParts): the earth on a tile cleared, its edge
 * churned up over the grass round it; the grass growing back over it, the
 * grass round it spilling over its edges - or null, for grass with no earth
 * next to it.
 */
function groundParts(x, y) {
  var ground = groundOf(x, y),
    earth = ground === BARE ? [] : edgesOf(x, y, bareAt);

  if (ground === GRASS && earth.length === 0) return null;

  return {
    set: ground === BARE ? "earth" : ground === REGROWING ? "regrowing" : null,
    grass: ground === REGROWING ? edgesOf(x, y, grassAt) : [],
    earth: earth,
  };
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
      kind === "land" || kind === "shore" ? groundParts(x, y) : null,
    ),
    last = parts.length - 1;

  //the water moves: a tile of it, and the water up a shore over the ground
  //- laid over it last
  if ((kind === "water" || kind === "deep") && terrain.waves)
    return waves(parts, terrain.waves, 0);
  if (
    kind === "shore" &&
    terrain.waves &&
    last > 0 &&
    /\/shore\//.test(parts[last])
  )
    return waves(parts, terrain.waves, last);

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

//where the grid over the ground is kept on or off in the browser (setGrid)
var GRID_STORE = "isometrica.grid";

//whether the grid over the ground is wanted: as kept, or it is
function gridWanted() {
  try {
    return localStorage.getItem(GRID_STORE) !== "off";
  } catch (e) {
    return true;
  }
}

function Terrain(root) {
  this.tiles = [];
  this.gos = [];
  this.pool = [];
  this.root = root;
  //the tiles drawn with earth on them, by index, and how - BARE or
  //REGROWING - to be drawn again as the grass grows back (Regrowth)
  this.bare = {};
  //the grid over the ground: wanted at all (setGrid), and shown with the
  //words over the world (showGrid) - drawn only when both
  this.grid = new TerrainGridRenderer(this);
  this.gridOn = gridWanted();
  this.gridShown = true;
  this.gridListeners = [];
  this.grid.shown = this.gridOn;
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

  //a tile cleared - by whatever cleared it - is drawn the earth it was
  //cleared down to, and the ones round it with their grass over its edges
  Events.on(
    this.root.core.terrain,
    CoreTerrain.events.tileCleared,
    function (sender, tile, self) {
      self.redraw([tile]);
    },
    this,
  );

  var grid = new engine.GameObject("terrain grid");

  grid.addComponent(this.grid);
  grid.addComponent(new Regrowth(this));
  this.root.game.logic.world.addGameObject(grid);
};

//how often the earth drawn is looked over for the grass growing back on it,
//ms
var REGROWTH_EVERY = 2000;

/**
 * Has the tiles drawn with earth on them drawn again as the grass grows back
 * over them - first coming up through it, then over the whole of it - and
 * the ones round them, whose grass spills over their edges.
 */
function Regrowth(terrain) {
  engine.Component.call(this);
  this.terrain = terrain;
  this.since = 0;
}

Regrowth.prototype = Object.create(engine.Component.prototype);
Regrowth.prototype.profileName = "regrowth";

Regrowth.prototype.tick = function (time) {
  this.since += time.dt;
  if (this.since < REGROWTH_EVERY) return;
  this.since = 0;

  var terrain = this.terrain,
    grown = [];

  for (var index in terrain.bare)
    if (
      groundOf(Core.Terrain.extractX(+index), Core.Terrain.extractY(+index)) !==
      terrain.bare[index]
    )
      grown.push(+index);

  if (grown.length > 0) terrain.redraw(grown);
};

/**
 * Draws the grid over the ground, or leaves it off, with the words over the
 * world (client/serviceman toggleLabels) - if it is wanted at all (setGrid).
 * Drawn as lines over the tiles (components/terraingridrenderer), so none
 * of them is drawn again.
 *
 * @param shown {boolean}
 */
Terrain.prototype.showGrid = function (shown) {
  this.gridShown = shown;
  this.grid.shown = shown && this.gridOn;
};

/**
 * Has the grid over the ground wanted, or not at all - off, nothing brings it
 * back but this (showGrid); kept in the browser for next time.
 *
 * @param [on] {boolean} - or the other way round from how it is
 */
Terrain.prototype.setGrid = function (on) {
  this.gridOn = on === undefined ? !this.gridOn : on === true;

  try {
    localStorage.setItem(GRID_STORE, this.gridOn ? "on" : "off");
  } catch (e) {
    //not kept: as it is now, then
  }

  this.grid.shown = this.gridShown && this.gridOn;
  this.gridListeners.forEach(function (fn) {
    fn();
  });
};

//told whenever the grid is set wanted or not
Terrain.prototype.onGrid = function (fn) {
  this.gridListeners.push(fn);
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
      delete this.bare[index];
      this.grid.changed(
        CoreTerrain.extractX(index),
        CoreTerrain.extractY(index),
      );
      delete tiles[index];
      delete gos[tile.instanceId];
      changed();
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
  changed();

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
  self.grid.changed(x, y);

  t.transform.setPosition(
    x * Config.tileSize,
    z * Config.tileZStep,
    y * Config.tileSize,
  );

  sprite = tileSprite(x, y, type, slope);

  //the earth on it, for the grass to grow back over (Regrowth)
  var ground = type === TerrainType.water ? GRASS : groundOf(x, y);

  if (ground !== GRASS) self.bare[index] = ground;
  else delete self.bare[index];

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
 * Reshapes tiles after the ground under them moved, or was cleared - and the
 * tiles round them, whose grass spills over the earth on them, or the other
 * way round. Only the ones on screen are - the rest are drawn as they are
 * when their chunk comes in. The tile stays in the world: taking one out
 * only happens at the end of the tick, so putting it straight back in would
 * lose it.
 *
 * @param indexes {number[]}
 */
Terrain.prototype.redraw = function (indexes) {
  var done = {},
    index,
    t;

  for (var i = 0; i < indexes.length; i++)
    for (var dx = -1; dx <= 1; dx++)
      for (var dy = -1; dy <= 1; dy++) {
        index = indexes[i] + dx + dy * CoreTerrain.dy;
        if (done[index] === true) continue;
        done[index] = true;

        t = this.tiles[index];
        if (t) shapeTile(this, t, index);
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
