/**
 * The trees of the grassland, painted by shared/gen/trees: oak, beech, ash
 * and alder, two of each - every one a building of its own, of the tree class,
 * the variants of the tree type (data/buildings). The world grows them on its
 * own (core/ambient), each kind in stands of its own.
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

var KINDS = ["oak", "beech", "ash", "alder"];
var EACH = 2;

var TREES = [];

KINDS.forEach(function (kind, k) {
  for (var v = 1; v <= EACH; v++) {
    var code =
      kind === "oak" && v === 1
        ? BuildingCode.tree1
        : kind === "beech" && v === 1
          ? BuildingCode.tree2
          : BASE + k * 10 + v;

    TREES.push({ kind: kind, code: code, name: kind, sprite: kind + "-" + v });
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
};
