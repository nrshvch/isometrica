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
 * On a shore tile the water is painted a little way up the ground
 * (shared/gen/terrain SHORE), so it looks higher there than it is. A shore
 * piece is the same shape as any other, down to the ground, and marked where
 * the water stands against it: darker, wet concrete up to that waterline, a
 * line of green weed along it, and a fainter tide mark a little above.
 *
 * Every piece is named by how far each corner of its tile is below the top,
 * as it is seen (client/view corner): W, N, E, S, each 0 or 1 -
 * "gen/foundations/0011", or on the shore "gen/foundations/shore/0011". Its
 * pivot is the middle of the tile at the top.
 */
import * as iso from "./isobox.js";
import {
  box,
  CONCRETE,
  darker,
  free,
  madeOf,
  measureFree,
  TILE,
} from "./blocks.js";
import { SHORE } from "./terrain.js";

//a step of the ground, in units
var STEP = 8;

//how far over the foot of a shore piece - the ground at the water's level -
//the water looks to come up it, in whole units: as high as the water is
//painted up the ground, a little higher where it is ragged
var WATERLINE = Math.ceil(SHORE.water * STEP);

//concrete the water has wetted, under the waterline; the weed growing along
//it; and the mark the higher tides leave
var WET_CONCRETE = madeOf(darker(CONCRETE, 0.3), "concrete"),
  WEED = madeOf([82, 104, 70], "concrete"),
  TIDE_MARK = madeOf(darker(CONCRETE, 0.12), "concrete");

//the corners, in the order a name gives them: W, N, E, S - [x, y] on the tile
var CORNERS = [
  [0, TILE],
  [TILE, TILE],
  [TILE, 0],
  [0, 0],
];

//every way the corners can be, but all of them at the top - on dry land,
//and on the shore
export var NAMES = [];

["", "shore/"].forEach(function (where) {
  for (var i = 1; i < 16; i++)
    NAMES.push(
      "gen/foundations/" +
        where +
        [(i >> 3) & 1, (i >> 2) & 1, (i >> 1) & 1, i & 1].join(""),
    );
});

//and under a road that is a ramp on a base: its top the ramp, up to two of
//the corners side by side - W and N, N and E, E and S, or S and W - and one
//of those two a step over the ground, the ground rising to the other only;
//or both of them, a ramp raised over flat ground (client/road profile):
//"gen/foundations/ramp/1100/0100", "gen/foundations/ramp/1100/1100"
["1100", "0110", "0011", "1001"].forEach(function (tops) {
  tops.split("").forEach(function (t, k) {
    if (t !== "1") return;

    var drops = [0, 0, 0, 0];

    drops[k] = 1;
    NAMES.push("gen/foundations/ramp/" + tops + "/" + drops.join(""));
  });
  NAMES.push("gen/foundations/ramp/" + tops + "/" + tops);
});

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
 * @param [shore] {boolean} marked where the water looks to come up to, its
 *        corners a step down at the water's level
 * @param [tops] {number[]} which of W, N, E and S the top is up at, 1, or a
 *        step lower, 0 - a ramp's top, for a road; all of them unless given
 */
export function boxesOf(drops, shore, tops) {
  tops = tops || [1, 1, 1, 1];

  var top = tops.map(function (t) {
      return (t - 1) * STEP;
    }),
    z = drops.map(function (d, k) {
      return top[k] - d * STEP;
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

  var out = [],
    foot = -2 * STEP,
    //a ramp's top: under the plane through its corners
    slope =
      tops.indexOf(0) !== -1
        ? planeThrough(
            [CORNERS[0][0], CORNERS[0][1], top[0]],
            [CORNERS[1][0], CORNERS[1][1], top[1]],
            [CORNERS[2][0], CORNERS[2][1], top[2]],
          )
        : null,
    //bottom up, each band [to, colour]: on the shore, wet up to the
    //waterline, the weed along it, and the tide mark over it
    bands = shore
      ? [
          [foot + WATERLINE, WET_CONCRETE],
          [foot + WATERLINE + 1, WEED],
          [foot + WATERLINE + 2, CONCRETE],
          [foot + WATERLINE + 3, TIDE_MARK],
          [0, CONCRETE],
        ]
      : [[0, CONCRETE]];

  halves.forEach(function (h) {
    var g = planeThrough(
        corner(h.corners[0]),
        corner(h.corners[1]),
        corner(h.corners[2]),
      ),
      keep = [
        h.side,
        //over the ground: z >= a x + b y + c
        iso.plane(g.a, g.b, -1, -g.c),
      ];

    //and under a ramp's top: z <= a x + b y + c
    if (slope) keep.push(iso.plane(-slope.a, -slope.b, 1, slope.c));

    var from = foot;

    bands.forEach(function (band) {
      out.push(iso.cut(box(0, TILE, 0, TILE, from, band[0], band[1]), keep));
      from = band[0];
    });
  });

  return out;
}

//what a piece's name says: how far its corners drop, whether it is on the
//shore, and for a ramp, which corners its top is up at
function pieceOf(name) {
  var r = /^gen\/foundations\/ramp\/([01]{4})\/([01]{4})$/.exec(name);

  if (r !== null)
    return {
      drops: r[2].split("").map(Number),
      shore: false,
      tops: r[1].split("").map(Number),
    };

  var m = /^gen\/foundations\/(shore\/)?([01]{4})$/.exec(name);

  if (m === null || m[2] === "0000")
    throw new Error("no such foundation: " + name);

  return { drops: m[2].split("").map(Number), shore: m[1] !== undefined };
}

/**
 * Every piece, by sprite name, with its size and pivot, without painting it.
 */
export function describe() {
  var sizes = {};

  NAMES.forEach(function (name) {
    var p = pieceOf(name);

    sizes[name] = measureFree(boxesOf(p.drops, p.shore, p.tops));
  });

  return { sizes: sizes, data: { step: STEP, waterline: WATERLINE } };
}

/**
 * One piece, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var p = pieceOf(name);

  return iso.toImage(free(boxesOf(p.drops, p.shore, p.tops)));
}
