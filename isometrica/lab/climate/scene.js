/**
 * The climate bench: every zone on one island, its temperatures laid out
 * along it (setHeat), shores, a river and hills; warmth moves them.
 * See isometrica/.claude/skills/lab/benches.md.
 */
import Simplex from "simplex-noise";
import Core from "../../src/core/main";
import Climate from "../../src/core/climate";

var Terrain = Core.Terrain;

//the island, tiles from the middle of the bench: its corner with the least
//x and y, and how far it goes - along x from hot to cold
var X = -36,
  Y = -24,
  W = 72,
  H = 48;

//how high the land is, steps, and how much the water goes down from the
//edge of the island: the deep water round it, then the shallows
var LAND = 2;

//how much hotter than the desert starts the island's hot end is, and how
//much colder than the north starts its other end, °C
var HOTTER = 8,
  COLDER = 10;

//how far the zones' edges wave to and fro across the island, tiles, and how
//often; and how far they stray either way in patches a few tiles across, as
//the climate's own patches have them over thousands of tiles
var WAVE = 1.5,
  WAVES = 24,
  STRAY = 2.5,
  STRAYS = 6;

var simplex = new Simplex("climate bench");

/**
 * How warm it is along the island, °C: [tiles from its hot end, how warm
 * there] - every zone a stretch as long as every other, from the
 * temperature it gives way to the one before it at to the one it starts at.
 */
var KNOTS = (function () {
  var zones = Climate.ZONES,
    n = zones.length,
    out = [[0, zones[0].from + HOTTER]];

  zones.forEach(function (zone, k) {
    out.push([
      (W * (k + 1)) / n,
      zone.from === -Infinity ? zones[k - 1].from - COLDER : zone.from,
    ]);
  });

  return out;
})();

//how warm it is u tiles along the island
function heatAlong(u) {
  for (var k = 1; k < KNOTS.length - 1; k++) if (u < KNOTS[k][0]) break;

  var a = KNOTS[k - 1],
    b = KNOTS[k];

  return a[1] + ((u - a[0]) * (b[1] - a[1])) / (b[0] - a[0]);
}

//and how far along it is that warm, tiles - no further than its ends
function along(t) {
  for (var k = 1; k < KNOTS.length; k++) {
    var a = KNOTS[k - 1],
      b = KNOTS[k];

    if (t <= a[1] && t >= b[1])
      return a[0] + ((t - a[1]) * (b[0] - a[0])) / (b[1] - a[1]);
  }

  return t > KNOTS[0][1] ? 0 : W;
}

//the hills, each [i, j, how high over the land, steps], one in every zone,
//away from the river and the shore
var HILLS = [
  [7, 9, 2],
  [22, 39, 3],
  [36, 8, 2],
  [50, 39, 3],
  [65, 9, 2],
];

//how steep a hill's side is, steps a tile - under one, for no two grid
//points next to each other to be more than a step apart
var HILLSIDE = 0.7;

//the river: how far it winds either way of the middle, and how long a bend
//is, tiles
var MEANDER = 5,
  BEND = 8;

/**
 * How high the grid point i, j from the island's corner is, steps: the land,
 * hills on it, a ring of water round it and the river through it - no two
 * points next to each other more than a step apart, for there to be a tile
 * for every slope (shared/gen/terrain SLOPES).
 */
function height(i, j) {
  var h = LAND,
    edge = Math.min(i, j, W - i, H - j),
    middle = H / 2 + MEANDER * Math.sin(i / BEND),
    across = Math.abs(j - middle);

  HILLS.forEach(function (hill) {
    var d = Math.hypot(i - hill[0], j - hill[1]);

    h = Math.max(h, Math.round(LAND + hill[2] - d * HILLSIDE));
  });

  //the river: deep in the middle, the shallows either side - wide enough
  //for no tile of its banks to go down into the deep - and its banks
  h = Math.min(
    h,
    across < 1.5 ? -1 : across < 3.5 ? 0 : across < 4.5 ? 1 : Infinity,
  );

  //the sea round the island: deep at its edge, then the shallows, the
  //shore and the land
  return Math.min(h, edge - 2);
}

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Scene(world) {
  this.world = world;
  this.warmth = 0;

  var corner = world.tile(X, Y);

  this.x0 = Terrain.extractX(corner);
  this.y0 = Terrain.extractY(corner);

  this.lay();
  world.look(0, 0);
}

/**
 * The island laid and drawn as warm as it is now (warmth), with the
 * world's own trees and stones on it - again, over itself, when it is
 * warmer or colder.
 */
Scene.prototype.lay = function () {
  var x0 = this.x0,
    y0 = this.y0,
    warmth = this.warmth;

  Climate.setHeat(function (x, y) {
    return (
      heatAlong(
        x -
          x0 +
          WAVE * Math.sin((2 * Math.PI * (y - y0)) / WAVES) +
          STRAY * simplex.noise2D(x / STRAYS, y / STRAYS),
      ) + warmth
    );
  });

  this.world.ground(X, Y, W, H, { heights: height, wild: true });
};

/**
 * Warmer, or colder, by degrees, °C, than the bench starts - every zone
 * along the island moving with it.
 */
Scene.prototype.warm = function (degrees) {
  this.warmth = degrees;
  this.lay();
};

/**
 * Where each zone starts along the island, tiles from its hot end - as it
 * would were it not for the patches and the waves - for the page to tell.
 *
 * @returns {{name: string, from: number}[]}
 */
Scene.prototype.zones = function () {
  var warmth = this.warmth;

  return Climate.ZONES.map(function (zone, i) {
    return {
      name: zone.name,
      from: i === 0 ? 0 : Math.round(along(Climate.ZONES[i - 1].from - warmth)),
    };
  });
};

export { W, H };
