/**
 * The trees of the grassland, painted by shared/gen/trees: oak, beech, ash,
 * alder, birch, pine and spruce, two of each - every one a building of its
 * own, of the tree class, the variants of the tree type (data/buildings). The
 * world grows them on its own (core/ambient), in woods of their own
 * (core/woods) - and among them now and then a dead tree still standing, a
 * stump or a fallen trunk, which only the world puts down: a tree planted is
 * a live one. Where it is not green (core/climate), the world has kinds of
 * its own: out in the cold the spruce and the pine snowed over, and the dead
 * wood snowed over; in the desert the dead wood dried out - only the world
 * puts those down either.
 *
 * The first oak and the first beech keep the codes the two trees drawn by hand
 * had, so a city that has those has these instead.
 */
import BuildingCode from "./buildingcode";

//over the parks' codes (data/parks)
var BASE = 6000;

//where the foot of a tree is in its picture (shared/gen/trees PIVOT_X,
//PIVOT_Y): the middle of its tile
var PIVOT_X = 38,
  PIVOT_Y = 60;

//a new kind goes on the end, so the codes of the ones before it stay
var KINDS = [
  "oak",
  "beech",
  "ash",
  "alder",
  "birch",
  "pine",
  "spruce",
  "snag",
  "stump",
  "log",
  "logs",
  "snowspruce",
  "snowpine",
  "snowsnag",
  "snowstump",
  "snowlog",
  "snowlogs",
  "drysnag",
  "drystump",
  "drylog",
  "drylogs",
];
var EACH = 2;

//the kinds nobody plants, and what they are called where it is not their
//kind's name
var WILD = {
  snag: true,
  stump: true,
  log: true,
  logs: true,
  snowspruce: true,
  snowpine: true,
  snowsnag: true,
  snowstump: true,
  snowlog: true,
  snowlogs: true,
  drysnag: true,
  drystump: true,
  drylog: true,
  drylogs: true,
};
var NAMES = {
  snag: "dead tree",
  log: "fallen tree",
  logs: "fallen trees",
  snowspruce: "snowy spruce",
  snowpine: "snowy pine",
  snowsnag: "snowy dead tree",
  snowstump: "snowy stump",
  snowlog: "snowy fallen tree",
  snowlogs: "snowy fallen trees",
  drysnag: "dry dead tree",
  drystump: "dry stump",
  drylog: "dry fallen tree",
  drylogs: "dry fallen trees",
};

var TREES = [];

KINDS.forEach(function (kind, k) {
  for (var v = 1; v <= EACH; v++) {
    var code =
      kind === "oak" && v === 1
        ? BuildingCode.tree1
        : kind === "beech" && v === 1
          ? BuildingCode.tree2
          : BASE + k * 10 + v;

    TREES.push({
      kind: kind,
      code: code,
      name: NAMES[kind] || kind,
      sprite: kind + "-" + v,
      wild: WILD[kind] === true,
    });
  }
});

/**
 * The trees as variants of the tree type, the way data/buildings has them.
 */
function variants(layer) {
  return TREES.map(function (tree) {
    return {
      buildingCode: tree.code,
      name: tree.name,
      //never the one planted (data/buildings expandVariants)
      wild: tree.wild,
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: PIVOT_X,
          pivotY: PIVOT_Y,
          path: "gen/trees/" + tree.sprite,
          layer: layer,
        },
      ],
    };
  });
}

/**
 * The picture of a tree seen from another of its sides, turns quarter turns
 * round - "gen/trees/oak-1/r2" (shared/gen/trees) - or of the stones on a
 * tile, which are painted from their four sides too (shared/gen/stones).
 * Anything else is left as it is.
 *
 * @param path {string}
 * @param turns {number}
 */
function turned(path, turns) {
  turns = ((turns % 4) + 4) % 4;

  if (turns === 0 || !TURNING.test(path)) return path;

  return path + "/r" + turns;
}

//the pictures painted from all four sides - the stones of every zone of the
//climate as well, "snowstone", "desertstone0"
var TURNING = /^gen\/(trees|scenery\/[a-z]*(stone|rubble))/;

/**
 * The codes of every tree of each kind, by kind.
 */
function codesByKind() {
  var out = {};

  TREES.forEach(function (tree) {
    (out[tree.kind] = out[tree.kind] || []).push(tree.code);
  });

  return out;
}

/**
 * Which way round a tree the world grew on a tile is, of its four: the same
 * every time, and any of them as likely as the others, with nothing to tell
 * from the next tile's (client/envman; standing, or lying knocked down,
 * client/buildingview).
 *
 * @param tile {number}
 * @returns {number} quarter turns, 0..3
 */
function tileTurns(tile) {
  var h =
    Math.imul(tile & 0xffff, 0x27d4eb2d) ^
    Math.imul(tile >>> 16, 0x165667b1) ^
    0x2545f491;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return (h ^ (h >>> 16)) >>> 30;
}

export default {
  KINDS: KINDS,
  TREES: TREES,
  variants: variants,
  codesByKind: codesByKind,
  turned: turned,
  tileTurns: tileTurns,
};
