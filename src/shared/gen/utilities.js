/**
 * What a town runs on, painted out of boxes the way the houses are
 * (shared/gen/houses): for now its water tower, in one of four designs of
 * the kind that stand over European towns and villages, picked for each
 * tower when it is placed (client/compoundbuilding):
 *
 *   - goblet: a wide concrete bowl, an upturned cone, on a round shaft
 *     banded red and white under it;
 *   - steel: a slim steel tank on a steel column a little narrower, with a
 *     ladder up the side of both;
 *   - stack: a tall square shaft of precast panels with three tanks like
 *     lenses stacked up its side, and aerials on top;
 *   - brick: a round brick shaft with a wider tank of steel sheet on it,
 *     funnelled under, a railing round its top.
 *
 * Each has a colour of its own and a band of blue round its tank. Whatever is
 * round is laid out in columns a unit across, each lit by which way the
 * surface looks there (blocks shaded), so its outline keeps to the pixels
 * the way everything else does (iso snap).
 *
 * The whole of it stands on one tile, and goes up on the same building site
 * as anything else (shared/gen/sites), then as its shaft (stage 1) and its
 * tank going up on top of it (stage 2).
 *
 * Units as everywhere: a tile is 32 along the ground - about ten metres -
 * and heights are in pixels, twelve to a storey of three metres.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  lighter,
  TILE,
  STOREY,
  GRASS,
  CONCRETE,
  METAL,
  DIRT,
  LIT,
  madeOf,
  shaded,
  measureOnTile,
  onTile,
  TURNS,
} from "./blocks.js";

var GRAVEL = madeOf([196, 190, 176], "gravel"),
  //the band of blue round every tank: water
  WATER_BLUE = [44, 112, 196],
  //what a tower is while it goes up: bare concrete and steel
  BARE = [164, 164, 160],
  STEEL = [150, 156, 164],
  DOOR = [86, 92, 100];

//where the middle of the tower is
var CX = 16,
  CY = 16;

//what a round thing's columns are made of, lit by which way they look
function litMade(material) {
  return material
    ? { lit: true, material: material, base: 0, storey: STOREY }
    : LIT;
}

/**
 * Something round about x = cx, y = cy, its radius r(z) from z0 up to z1 -
 * a shaft, a tank, a cone - laid out in columns a unit across, each cut
 * into lengths a unit high where its radius or colour changes. Every length
 * is lit by which way the surface looks at its front, the point of it
 * nearest the camera: lighter round to the left, darker round to the
 * right, darker where it slopes in underneath (shaded).
 *
 * @param r {function(z): number} the radius at a height, the middle of a
 *        unit high slice
 * @param color {function(z): number[]} the colour at a height - for bands
 * @param [material] {string} what it is made of (iso MATERIALS)
 */
function turned(b, cx, cy, z0, z1, r, color, material) {
  var fin = litMade(material),
    rmax = 0,
    z,
    i;

  for (z = z0; z < z1; z++) rmax = Math.max(rmax, r(z + 0.5));

  for (i = -Math.ceil(rmax); i < Math.ceil(rmax); i++) {
    var run = null;

    for (z = z0; z < z1; z++) {
      var mid = i + 0.5,
        rz = r(z + 0.5),
        h = rz > Math.abs(mid) ? Math.sqrt(rz * rz - mid * mid) : 0,
        y0 = Math.round(cy - h),
        y1 = Math.round(cy + h),
        slope = r(z + 1) - r(z),
        c =
          y1 > y0
            ? shaded(color(z + 0.5), mid / rz, -h / rz, -slope).join()
            : null;

      if (run !== null && run.y0 === y0 && run.y1 === y1 && run.c === c) {
        run.z1 = z + 1;
        continue;
      }

      if (run !== null && run.c !== null)
        b.push(
          box(cx + i, cx + i + 1, run.y0, run.y1, run.z0, run.z1, run.col, fin),
        );

      run = {
        y0: y0,
        y1: y1,
        z0: z,
        z1: z + 1,
        c: c,
        col: c === null ? null : c.split(",").map(Number),
      };
    }

    if (run !== null && run.c !== null)
      b.push(
        box(cx + i, cx + i + 1, run.y0, run.y1, run.z0, run.z1, run.col, fin),
      );
  }
}

//a round flat top at z, radius r: columns a unit across, lit from above
function disc(b, cx, cy, r, z, color, material) {
  for (var i = -Math.ceil(r); i < Math.ceil(r); i++) {
    var mid = i + 0.5,
      h = r > Math.abs(mid) ? Math.sqrt(r * r - mid * mid) : 0,
      y0 = Math.round(cy - h),
      y1 = Math.round(cy + h);

    if (y1 > y0)
      b.push(
        box(
          cx + i,
          cx + i + 1,
          y0,
          y1,
          z - 0.1,
          z,
          color,
          material
            ? { material: material, base: 0, storey: STOREY }
            : undefined,
        ),
      );
  }
}

/**
 * A railing round the edge of a round top at z, radius r: a post every
 * eighth of the way round, a rail along their tops a pixel high.
 */
function railing(b, cx, cy, r, z, color) {
  var i, j;

  for (i = -Math.ceil(r); i < Math.ceil(r); i++)
    for (j = -Math.ceil(r); j < Math.ceil(r); j++) {
      var d = Math.sqrt((i + 0.5) * (i + 0.5) + (j + 0.5) * (j + 0.5));

      if (d < r - 1 || d >= r) continue;

      var a = Math.atan2(j + 0.5, i + 0.5),
        post = Math.abs(Math.sin(a * 4)) < 0.2;

      b.push(
        box(
          cx + i,
          cx + i + 1,
          cy + j,
          cy + j + 1,
          post ? z : z + 2,
          z + 3,
          color,
        ),
      );
    }
}

//a ladder up the face looking towards -x at x, centred on y: two rails and
//a rung every two
function ladder(b, x, y, z0, z1) {
  b.push(box(x - 1, x, y - 1, y, z0, z1, METAL));
  b.push(box(x - 1, x, y + 1, y + 2, z0, z1, METAL));
  for (var z = z0 + 1; z < z1; z += 2)
    b.push(box(x - 1, x, y - 1, y + 2, z, z + 1, METAL));
}

//a door at the foot of a shaft, on its front, w wide
function door(b, cx, y, w) {
  b.push(box(cx - w / 2, cx + w / 2, y - 1, y, 1, 7, DOOR));
  b.push(box(cx - w / 2 - 1, cx + w / 2 + 1, y - 2, y, 7, 8, CONCRETE));
}

//a straight cone between two radii, from z0 to z1
function cone(r0, r1, z0, z1) {
  return function (z) {
    return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0);
  };
}

function constant(c) {
  return function () {
    return c;
  };
}

/* --- The designs ------------------------------------------------------ */

/**
 * Each design, by name: its colours, and how it is built at each stage -
 * 0 finished, 1 its shaft half up, 2 its shaft up and its tank bare on top.
 */
var DESIGNS = {
  //a concrete bowl on a round shaft, banded red and white at the top
  goblet: {
    weight: 1,
    build: function (b, stage) {
      var SHAFT = [218, 210, 192],
        RED = [184, 70, 54],
        BOWL = [168, 96, 72],
        top = stage === 1 ? 24 : 44;

      turned(
        b,
        CX,
        CY,
        1,
        top,
        constant(4),
        function (z) {
          if (stage || z < 30) return stage ? BARE : SHAFT;
          return Math.floor((z - 30) / 3) % 2 ? SHAFT : RED;
        },
        "concrete",
      );
      door(b, CX, CY - 4, 2);
      if (stage === 1) return;

      var bowl = stage ? BARE : BOWL;

      //the bowl: widening up from the shaft, its rim straight up
      turned(
        b,
        CX,
        CY,
        44,
        60,
        function (z) {
          return z < 55 ? cone(4.5, 12.5, 44, 55)(z) : 12.5;
        },
        function (z) {
          return !stage && z > 56 && z < 59 ? WATER_BLUE : bowl;
        },
        "concrete",
      );
      disc(b, CX, CY, 12.5, 60, darker(bowl, 0.1), "concrete");
      if (stage) return;

      railing(b, CX, CY, 12.5, 60, STEEL);
      b.push(box(CX - 1, CX + 1, CY - 1, CY + 1, 60, 63, STEEL));
    },
  },

  //a slim steel tank on a steel column, a ladder up the side
  steel: {
    weight: 1,
    build: function (b, stage) {
      var GALV = [196, 200, 204],
        top = stage === 1 ? 22 : 42;

      turned(
        b,
        CX,
        CY,
        1,
        top,
        constant(3.5),
        constant(stage ? BARE : GALV),
        "metal",
      );
      door(b, CX, CY - 3, 2);
      ladder(b, CX - 3, CY - 1, 1, stage === 1 ? top : 46);
      if (stage === 1) return;

      var tank = stage ? BARE : GALV;

      turned(
        b,
        CX,
        CY,
        42,
        62,
        function (z) {
          return z < 46 ? cone(3.5, 8, 42, 46)(z) : 8;
        },
        function (z) {
          return !stage && z > 51 && z < 55 ? WATER_BLUE : tank;
        },
        "metal",
      );
      disc(b, CX, CY, 8, 62, darker(tank, 0.05));
      ladder(b, CX - 8, CY - 1, 46, 62);
      if (stage) return;

      //the hatch on top, and a rail by the ladder
      b.push(box(CX - 2, CX + 1, CY - 1, CY + 2, 62, 64, darker(GALV, 0.15)));
      b.push(box(CX - 8, CX - 7, CY - 2, CY + 3, 62, 65, METAL));
    },
  },

  //a square shaft of precast panels, three lens-shaped tanks up its side
  stack: {
    weight: 1,
    build: function (b, stage) {
      var PANEL = [212, 208, 196],
        TANK = [182, 112, 74],
        top = stage === 1 ? 30 : 64,
        //the tanks' middles, one over another, out on the front of the shaft
        tx = CX + 3,
        ty = CY - 3;

      b.push(
        box(CX - 7, CX + 1, CY - 1, CY + 7, 1, top, stage ? BARE : PANEL, {
          material: "panels",
          base: 1,
          storey: STOREY,
        }),
      );
      door(b, CX - 3, CY - 1, 2);
      if (stage === 1) return;

      [42, 50, 58].forEach(function (zc) {
        turned(
          b,
          tx,
          ty,
          zc - 4,
          zc + 4,
          function (z) {
            return z < zc
              ? cone(4, 8, zc - 4, zc)(z)
              : cone(8, 4.5, zc, zc + 4)(z);
          },
          function (z) {
            return !stage && Math.abs(z - zc) < 1
              ? WATER_BLUE
              : stage
                ? BARE
                : TANK;
          },
          "concrete",
        );
      });
      if (stage) return;

      //aerials on top of the shaft, and a dish
      b.push(box(CX - 6, CX - 5, CY + 5, CY + 6, top, top + 10, STEEL));
      b.push(box(CX - 1, CX, CY + 1, CY + 2, top, top + 7, STEEL));
      b.push(
        box(CX - 3, CX - 1, CY + 4, CY + 5, top + 4, top + 7, [228, 228, 224]),
      );
    },
  },

  //a round brick shaft, a wider tank of steel sheet on it, funnelled under
  brick: {
    weight: 1,
    build: function (b, stage) {
      var BRICK = [180, 84, 62],
        STONE = [228, 216, 192],
        SHEET = [206, 208, 204],
        top = stage === 1 ? 20 : 38;

      turned(
        b,
        CX,
        CY,
        1,
        top,
        constant(7),
        function (z) {
          if (stage) return z < 3 ? BARE : BRICK;
          return z < 3 || z > 35 ? STONE : BRICK;
        },
        "brick",
      );
      door(b, CX, CY - 7, 3);
      if (stage === 1) return;

      var tank = stage ? BARE : SHEET;

      turned(
        b,
        CX,
        CY,
        38,
        56,
        function (z) {
          return z < 42 ? cone(7.5, 11, 38, 42)(z) : 11;
        },
        function (z) {
          return !stage && z > 48 && z < 51 ? WATER_BLUE : tank;
        },
        "metal",
      );
      disc(b, CX, CY, 11, 56, darker(tank, 0.08));
      if (stage) return;

      railing(b, CX, CY, 11, 56, STEEL);
    },
  },
};

/**
 * The tower whole: a gravel pad on its tile, and the design on it - or,
 * while it goes up, on bare earth with its slab poured.
 */
function waterTower(design, stage) {
  var b = [box(0, TILE, 0, TILE, 0, 1, stage ? DIRT : GRASS)];

  b.push(box(4, 28, 4, 28, 0.9, 1.1, stage ? CONCRETE : GRAVEL));
  DESIGNS[design].build(b, stage);

  if (!stage) {
    //the valve pit's lid out by the edge of the pad
    b.push(box(22, 26, 23, 27, 1, 1.5, darker(METAL, 0.1)));
  }

  return b;
}

/**
 * What every kind of utility can be, as shared/gen/shops has them: a design
 * for its footprint with the options it is put together with, and its tiles.
 */
var FOOTPRINTS = {
  watertower: [
    {
      design: "watertower",
      weight: 1,
      axes: { style: Object.keys(DESIGNS) },
      tiles: [{ x: 0, y: 0, parts: ["utilities/watertower/{style}/0/0"] }],
    },
  ],
};

/**
 * Every part there is, by name without its turn: each design of tower, and
 * what it is while it goes up. A tower saved before there were designs is
 * "std", and stands as the goblet.
 */
var PARTS = (function () {
  var out = {};

  Object.keys(DESIGNS)
    .concat(["std"])
    .forEach(function (d) {
      var design = d === "std" ? "goblet" : d;

      out["utilities/watertower/" + d + "/0/0"] = { design: design, stage: 0 };
      [1, 2].forEach(function (stage) {
        out["utilities/frame/watertower/" + d + "/" + stage + "/0/0"] = {
          design: design,
          stage: stage,
        };
      });
    });

  return out;
})();

var whole = {};

export function partBoxes(key) {
  var p = PARTS[key];

  if (p === undefined) throw new Error("no such part: " + key);

  if (whole[key] === undefined) whole[key] = waterTower(p.design, p.stage);

  return whole[key];
}

/**
 * Every part, by sprite name - "gen/utilities/watertower/std/0/0/r1" - with
 * its size and pivot, without painting it; and what every utility can be.
 */
export function describe() {
  var sizes = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      sizes["gen/" + key + "/r" + turns] = measureOnTile(
        iso.rotate(partBoxes(key), 1, 1, turns),
      );
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: {},
    },
  };
}

/**
 * One part, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  return iso.toImage(
    onTile(iso.rotate(partBoxes(key.slice(0, at)), 1, 1, turns)),
  );
}

export { PARTS, STOREY };
