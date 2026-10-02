/**
 * The concrete a building on uneven ground stands on, the way Transport
 * Tycoon put its buildings on a slope: the ground under the building is
 * built up to its highest corner, and the building stands on that, level. It
 * takes no more than one step - ground that falls further is too steep to
 * build on (core/buildings).
 *
 * A piece for a tile is the concrete between the ground and a level top: a
 * step deep under the corners that are one lower, nothing under the ones at
 * the top, cut along the ground between them the way the ground is folded
 * (shared/gen/terrain fold), so it sits on the tile's own slope. What shows of
 * it is its top - under the building, mostly - and the walls along the two
 * edges in front, from nothing where the ground is up at the top to a step
 * where it is not.
 *
 * Every piece is named by how far each corner of its tile is below the top,
 * as it is seen (client/view corner): W, N, E, S, each 0 or 1 -
 * "gen/foundations/0011". Its pivot is the middle of the tile at the top.
 */
import * as iso from "./isobox.js";
import { box, CONCRETE, free, measureFree, TILE } from "./blocks.js";

//a step of the ground, in units
var STEP = 8;

//the corners, in the order a name gives them: W, N, E, S - [x, y] on the tile
var CORNERS = [
  [0, TILE],
  [TILE, TILE],
  [TILE, 0],
  [0, 0],
];

//every way the corners can be, but all of them at the top
export var NAMES = [];

for (var i = 1; i < 16; i++)
  NAMES.push(
    "gen/foundations/" +
      [(i >> 3) & 1, (i >> 2) & 1, (i >> 1) & 1, i & 1].join(""),
  );

/**
 * The diagonal the ground of a tile folds along, as shared/gen/terrain has it:
 * the one whose ends are at the same height - of a saddle, the lower pair;
 * null for a tile that is a plane.
 */
function fold(w, n, e, s) {
  var ns = n === s,
    we = w === e;

  if (n + s === w + e) return null;
  if (ns && we) return n < w ? "ns" : "we";

  return ns ? "ns" : "we";
}

//the plane through three corners, as the ground's height z = a x + b y + c
function planeThrough(p, q, r) {
  var ux = q[0] - p[0],
    uy = q[1] - p[1],
    uz = q[2] - p[2],
    vx = r[0] - p[0],
    vy = r[1] - p[1],
    vz = r[2] - p[2],
    nx = uy * vz - uz * vy,
    ny = uz * vx - ux * vz,
    nz = ux * vy - uy * vx;

  return {
    a: -nx / nz,
    b: -ny / nz,
    c: p[2] + (nx * p[0] + ny * p[1]) / nz,
  };
}

/**
 * The boxes of a piece, its top at 0: each half of the tile the ground folds
 * into a slab down to the ground there.
 *
 * @param drops {number[]} how far W, N, E and S are below the top, 0 or 1
 */
export function boxesOf(drops) {
  var z = drops.map(function (d) {
      return -d * STEP;
    }),
    corner = function (k) {
      return [CORNERS[k][0], CORNERS[k][1], z[k]];
    },
    f = fold(z[0], z[1], z[2], z[3]) || "ns",
    //each half: its three corners, and the plane that keeps a box to it
    halves =
      f === "ns"
        ? [
            //W of the line from N to S, where y is over x
            { corners: [0, 1, 3], side: iso.plane(1, -1, 0, 0) },
            { corners: [1, 2, 3], side: iso.plane(-1, 1, 0, 0) },
          ]
        : [
            //N of the line from W to E, where x + y is over a tile
            { corners: [0, 1, 2], side: iso.plane(-1, -1, 0, -TILE) },
            { corners: [0, 2, 3], side: iso.plane(1, 1, 0, TILE) },
          ];

  return halves.map(function (h) {
    var g = planeThrough(
      corner(h.corners[0]),
      corner(h.corners[1]),
      corner(h.corners[2]),
    );

    return iso.cut(box(0, TILE, 0, TILE, -STEP, 0, CONCRETE), [
      h.side,
      //over the ground: z >= a x + b y + c
      iso.plane(g.a, g.b, -1, -g.c),
    ]);
  });
}

function dropsOf(name) {
  var m = /^gen\/foundations\/([01]{4})$/.exec(name);

  if (m === null || m[1] === "0000")
    throw new Error("no such foundation: " + name);

  return m[1].split("").map(Number);
}

/**
 * Every piece, by sprite name, with its size and pivot, without painting it.
 */
export function describe() {
  var sizes = {};

  NAMES.forEach(function (name) {
    sizes[name] = measureFree(boxesOf(dropsOf(name)));
  });

  return { sizes: sizes, data: { step: STEP } };
}

/**
 * One piece, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  return iso.toImage(free(boxesOf(dropsOf(name))));
}
