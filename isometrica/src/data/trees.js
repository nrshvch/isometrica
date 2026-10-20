/**
 * The trees of the grassland, painted by shared/gen/trees: oak, beech, ash,
 * alder, birch, pine and spruce, two of each - every one a building of its
 * own, of the tree class, the variants of the tree type (data/buildings). The
 * world grows them on its own (core/ambient), in woods of their own
 * (core/woods) - and among them now and then a dead tree still standing, or
 * a stump, which only the world puts down: a tree planted is a live one.
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
];
var EACH = 2;

//the kinds nobody plants, and what they are called where it is not their
//kind's name
var WILD = { snag: true, stump: true };
var NAMES = { snag: "dead tree" };

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
 * round - "gen/trees/oak-1/r2" (shared/gen/trees). Anything else is left as
 * it is.
 *
 * @param path {string}
 * @param turns {number}
 */
function turned(path, turns) {
  turns = ((turns % 4) + 4) % 4;

  if (turns === 0 || path.indexOf("gen/trees/") !== 0) return path;

  return path + "/r" + turns;
}

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

export default {
  KINDS: KINDS,
  TREES: TREES,
  variants: variants,
  codesByKind: codesByKind,
  turned: turned,
};
