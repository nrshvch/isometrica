/**
 * The climate bench (lab/climate.html): every zone of the climate
 * (core/climate) on one island, drawn the game's own way (lab/bench/world) -
 * from the desert at one end through the green to the snow at the other,
 * and on past the firs and the pines dying off and the dead trunks to the
 * empty frozen edge of the world. What the world spreads over thousands of
 * tiles is pressed into a few dozen here, so that where one zone gives way
 * to the next - ragged, in patches, the ground of the one spilling over the
 * edges of the other - can be seen all at once.
 *
 * The island has a ring of water round it, the shallows and deep water
 * beyond them, so every zone has its shore: a sand beach, and out in the cold
 * the water frozen over with frost for a beach. A river winds along it from
 * the one end to the other, deep in the middle, through every zone - open
 * water in the warm, the ice closing over it from the edges where the snow
 * comes in - and hills stand in every zone, for its ground on every slope.
 * On it all, the trees and the stones the world puts there by itself.
 *
 * Warmer or colder (warmth) moves every zone along it, the way warming the
 * world moves them out from its middle.
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

//how warm the hot end of it is, °C, and how much colder every tile along
//it: 40° to -18°, the desert at one end, then the green, then 16 tiles of
//the cold - the firs and the pines dying off, the dead trunks, and nothing
//(core/woods FLORA) - and how far the zones' edges wave to and fro across
//it, and how often
var HOT = 40,
  LAPSE = 0.8,
  WAVE = 1.5,
  WAVES = 24;

//and how far it strays either way, °C, in patches a few tiles across: the
//zones mixed over a dozen tiles or so either side of where they change,
//rather than the few the climate's own patches give a slope this steep
var STRAY = 3.5,
  STRAYS = 6;

var simplex = new Simplex("climate bench");

//the hills, each [i, j, how high over the land, steps], one or two in
//every zone, away from the river and the shore
var HILLS = [
  [7, 9, 2],
  [24, 39, 3],
  [36, 8, 2],
  [52, 39, 3],
  [62, 9, 2],
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
      HOT +
      warmth -
      (x - x0) * LAPSE +
      WAVE * Math.sin((2 * Math.PI * (y - y0)) / WAVES) +
      STRAY * simplex.noise2D(x / STRAYS, y / STRAYS)
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
      from:
        i === 0
          ? 0
          : Math.max(
              0,
              Math.round((HOT + warmth - Climate.ZONES[i - 1].from) / LAPSE),
            ),
    };
  });
};

export { W, H };
