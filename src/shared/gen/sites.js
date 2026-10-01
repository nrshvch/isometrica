/**
 * Building sites - the same for every building there is, whatever goes up on
 * them, hand-drawn houses and blocks alike: bare earth, and on each tile one
 * thing at work or waiting there. Which tile has what is picked for every
 * building (shared/gen/stacking siteTiles, lotTiles); here are the parts:
 *
 *   - lot: a tile of the site - with the digger at work on it (dig), a lorry
 *     come to cart the earth away (haul), a heap of sand (pile), the site
 *     office (cabin), materials stacked (materials), or the foot of the tower
 *     crane (crane);
 *   - mast: a storey of the tower crane's mast, stacked on its foot as high
 *     as the crane has to reach - which it does higher as the building goes
 *     up;
 *   - cranetop: the cab on top of the mast;
 *   - fence: the blue tarp on posts round the whole site, along the edges of
 *     a tile that are the site's edges - in two parts, the stretches at the
 *     back of the tile laid under everything else on it and the ones at the
 *     front over it, so that they hide and are hidden as they should. Which
 *     is which depends on which way the site is seen from, so each turn of
 *     them is painted with its own stretches (partBoxes).
 *
 * What moves is not painted into the parts but drawn over them as the game
 * draws them (client/siterenderer): the digger and the lorry, which are the
 * vehicle generator's own (shared/gen/vehicles), and the crane's jib, which
 * turns from one side to the other and back, painted here a frame for each
 * way it points.
 *
 * Units and light as in shared/gen/blocks, whose parts these are laid with.
 */
import * as iso from "./isobox.js";
import * as Vehicles from "./vehicles.js";
import {
  box,
  darker,
  TILE,
  STOREY,
  PLINTH,
  WOOD,
  METAL,
  DIRT,
  CONCRETE,
  TURNS,
  random,
  pick,
  round,
  turnPoint,
  turnHeading,
  free,
  measureFree,
  onTile,
  measureOnTile,
} from "./blocks.js";

var SAND = [196, 164, 112],
  MACHINE = [236, 178, 36],
  CAB_GLASS = [112, 156, 186],
  BRICK = [176, 84, 64],
  CABIN = [236, 236, 228],
  CABIN_TRIM = [70, 110, 160],
  TOILET = [64, 120, 196],
  TARP = [40, 112, 206],
  POST = [150, 152, 156],
  RUT = darker(DIRT, 0.12);

//where the crane's mast stands on its tile: in the middle, so its jib turns
//over the whole site
var MAST = { x: 16, y: 16 };

//which ways the jib points as it turns back and forth, in degrees off x
var JIB_ANGLES = [-45, -30, -15, 0, 15, 30, 45];

//how high the cab on the mast is, and the jib on the cab, over where the
//crane's top is painted - on a mast of one storey
var TOP = PLINTH + STOREY,
  CAB = 4;

function pallet(b, x, y) {
  b.push(box(x, x + 5, y, y + 4, 1, 2, WOOD));
  b.push(box(x + 0.3, x + 4.7, y + 0.3, y + 3.7, 2, 5, BRICK));
}

//a stack of steel bars along x from x to x1, at y
function bars(b, x, x1, y) {
  b.push(box(x + 1, x + 2, y - 0.5, y + 3.5, 1, 2, WOOD));
  b.push(box(x1 - 2, x1 - 1, y - 0.5, y + 3.5, 1, 2, WOOD));
  b.push(box(x, x1, y, y + 3, 2, 3.5, METAL));
}

//the ruts something on wheels or tracks left along x, at y0 and y1
function ruts(b, x0, x1, y0, y1) {
  b.push(box(x0, x1, y0, y0 + 1.5, 1, 1.05, RUT));
  b.push(box(x0, x1, y1, y1 + 1.5, 1, 1.05, RUT));
}

/**
 * A heap of sand tipped there: a cone, its point rounded off, steep as sand
 * lies, each grain a little lighter or darker than the next.
 */
function cone(b, x, y, r, h) {
  round(b, x, y, r, SAND, 0.05, function (u, v) {
    var d = Math.sqrt(u * u + v * v) / r;

    if (d >= 1) return null;

    //straight sides, and a soft top where they would meet in a point -
    //and which way the surface looks there, from how steep it is
    var k = h * 1.125,
      top,
      slope;

    //a curve meeting the sides at a fifth of the way out, as high and as
    //steep as they are there
    if (d < 0.2) {
      top = k * (0.9 - 2.5 * d * d);
      slope = (5 * k) / (r * r);
    } else {
      top = k * (1 - d);
      slope = k / (r * r * d);
    }

    return [1, 1 + Math.max(top, 0.3), u * slope, v * slope, 1];
  });
}

/**
 * The site office: a cabin, with its door and window, at x, y.
 */
function cabin(b, x, y) {
  b.push(box(x, x + 14, y, y + 6, 1, 8, CABIN));
  b.push(box(x - 0.2, x + 14.2, y - 0.2, y + 6.2, 8, 8.6, CABIN_TRIM));
  b.push(box(x + 2, x + 4, y - 0.2, y, 1, 6.5, CABIN_TRIM));
  b.push(box(x + 6, x + 12, y - 0.2, y, 4, 6.5, CAB_GLASS));
}

//what is painted on a lot - whatever moves on it is drawn over it (MACHINES)
var LOTS = {
  dig: function (b) {
    ruts(b, 4, 28, 9, 15);
  },
  haul: function (b) {
    ruts(b, 2, 30, 13, 18.5);
  },
  pile: function (b) {
    cone(b, 16, 16, 9, 8.5);
  },
  cabin: function (b) {
    cabin(b, 5, 17);
    b.push(box(23, 26, 19, 22, 1, 8, TOILET));
    b.push(box(22.8, 26.2, 18.8, 22.2, 8, 8.5, darker(TOILET, 0.2)));
    pallet(b, 7, 6);
  },
  materials: function (b) {
    pallet(b, 5, 5);
    pallet(b, 11, 6);
    pallet(b, 21, 21);
    bars(b, 6, 26, 14);
  },
  //the crane's foot: the slab it stands on, its mast as far as the first
  //storey of it (mast)
  crane: function (b) {
    b.push(box(MAST.x - 4, MAST.x + 4, MAST.y - 4, MAST.y + 4, 1, 2, CONCRETE));
    mastSection(b, 2, PLINTH);
    pallet(b, 23, 5);
  },
};

//a steel lattice: every member of it throws its shadow on the others (see
//iso finish)
var LATTICE = { shadow: true };

/**
 * The mast from z0 to z1: an open steel lattice - a post at each corner, a
 * ring of struts round it every half storey and a brace across each side
 * from corner to corner in between, each throwing its shadow on the rest.
 * Half a storey to a panel, so one storey of it stacked on the next carries
 * straight on; square on its tile's middle, so it is the same turned round.
 */
function mastSection(b, z0, z1) {
  var w = 1.9,
    t = 0.55,
    x0 = MAST.x - w,
    x1 = MAST.x + w,
    y0 = MAST.y - w,
    y1 = MAST.y + w,
    panel = STOREY / 2,
    steps = 8,
    z,
    k;

  [
    [x0, y0],
    [x1 - t, y0],
    [x0, y1 - t],
    [x1 - t, y1 - t],
  ].forEach(function (c) {
    b.push(box(c[0], c[0] + t, c[1], c[1] + t, z0, z1, MACHINE, LATTICE));
  });

  for (z = z0; z < z1 - 0.01; z += panel) {
    var top = Math.min(z + panel, z1),
      ring = Math.min(0.4, top - z);

    b.push(box(x0, x1, y0, y0 + 0.35, z, z + ring, MACHINE, LATTICE));
    b.push(box(x0, x1, y1 - 0.35, y1, z, z + ring, MACHINE, LATTICE));
    b.push(box(x0, x0 + 0.35, y0, y1, z, z + ring, MACHINE, LATTICE));
    b.push(box(x1 - 0.35, x1, y0, y1, z, z + ring, MACHINE, LATTICE));

    //the braces, each side's the other way round to the one before it
    for (k = 0; k < steps; k++) {
      var f = (k + 0.5) / steps,
        zz = z + f * (top - z),
        u = -w + f * 2 * w,
        h = Math.min(0.45, (top - z) / 2);

      b.push(
        box(
          MAST.x + u - 0.3,
          MAST.x + u + 0.3,
          y0,
          y0 + 0.3,
          zz - h,
          zz + h,
          MACHINE,
          LATTICE,
        ),
      );
      b.push(
        box(
          x1 - 0.3,
          x1,
          MAST.y + u - 0.3,
          MAST.y + u + 0.3,
          zz - h,
          zz + h,
          MACHINE,
          LATTICE,
        ),
      );
      b.push(
        box(
          MAST.x - u - 0.3,
          MAST.x - u + 0.3,
          y1 - 0.3,
          y1,
          zz - h,
          zz + h,
          MACHINE,
          LATTICE,
        ),
      );
      b.push(
        box(
          x0,
          x0 + 0.3,
          MAST.y - u - 0.3,
          MAST.y - u + 0.3,
          zz - h,
          zz + h,
          MACHINE,
          LATTICE,
        ),
      );
    }
  }
}

/**
 * The part of the tower crane that turns, pointing `angle` degrees off x:
 * the jib out over the site, the counter-jib behind with its weights, the
 * peak over the mast, the hook hanging near the end - in steps along the way
 * it points, each a little box, the way the ground is drawn in pixels.
 */
function jib(angle) {
  var b = [],
    a = (angle * Math.PI) / 180,
    dx = Math.cos(a),
    dy = Math.sin(a),
    z = TOP + CAB,
    s,
    p;

  function at(d) {
    return [MAST.x + d * dx, MAST.y + d * dy];
  }

  for (s = -8; s <= 22; s += 0.75) {
    p = at(s);
    b.push(
      box(
        p[0] - 0.7,
        p[0] + 0.7,
        p[1] - 0.7,
        p[1] + 0.7,
        z,
        z + 1.5,
        MACHINE,
        LATTICE,
      ),
    );
  }

  for (s = -7.5; s <= -4.5; s += 0.75) {
    p = at(s);
    b.push(
      box(p[0] - 1.1, p[0] + 1.1, p[1] - 1.1, p[1] + 1.1, z - 3, z, CONCRETE),
    );
  }

  b.push(
    box(
      MAST.x - 1,
      MAST.x + 1,
      MAST.y - 1,
      MAST.y + 1,
      z + 1.5,
      z + 6,
      MACHINE,
    ),
  );

  p = at(17);
  b.push(
    box(p[0] - 0.25, p[0] + 0.25, p[1] - 0.25, p[1] + 0.25, z - 22, z, METAL),
  );
  b.push(
    box(
      p[0] - 1.2,
      p[0] + 1.2,
      p[1] - 1,
      p[1] + 1,
      z - 24,
      z - 22,
      darker(MACHINE, 0.2),
    ),
  );

  return b;
}

/**
 * What works on a lot, from the vehicle generator's pictures - which is
 * where the game draws them from: its middle at x, y on the ground of the
 * lot's own tile, facing heading. The digger drives on by `drive` and turns
 * to face `turn` to dig; the lorry stands while it is loaded.
 */
var MACHINES = {
  dig: [
    {
      vehicle: "excavator",
      x: 9,
      y: 12.5,
      heading: "x+",
      drive: 9,
      turn: "y+",
    },
  ],
  haul: [{ vehicle: "lorry", x: 16, y: 16, heading: "x-" }],
};

//the tarp, creased a little all over
var CREASED = { noise: 0.07, base: 0, storey: STOREY };

//the edges of a tile a fence can run along, in the order a fence's name
//gives them: where x is 0, where y is 0 - the front - where x is a tile, and
//where y is
var EDGES = ["x0", "y0", "x1", "y1"];

/**
 * A stretch of the fence along an edge of the tile: posts every quarter of
 * the tile, the tarp hung between them - with the way in left open, for a
 * gate.
 */
function fence(b, edge, gate) {
  var along = edge[0] === "x" ? "y" : "x",
    near = edge[1] === "0",
    c0 = near ? 0 : TILE - 0.4,
    c1 = c0 + 0.4,
    //standing just clear of the ground: laid under the ground of its tile,
    //it would have its foot drawn over otherwise
    foot = 1.45;

  function piece(a0, a1, z0, z1, color, finish) {
    if (along === "x") b.push(box(a0, a1, c0, c1, z0, z1, color, finish));
    else b.push(box(c0, c1, a0, a1, z0, z1, color, finish));
  }

  var runs = gate
    ? [
        [0, 11],
        [21, TILE],
      ]
    : [[0, TILE]];

  runs.forEach(function (r) {
    piece(r[0], r[1], foot + 0.6, 6.5, TARP, CREASED);
    piece(r[0], r[1], foot, foot + 0.6, darker(TARP, 0.35));
  });

  [0.2, 8, 16, 24, TILE - 0.8].forEach(function (a) {
    if (gate && a > 11 && a < 21) return;

    piece(a, a + 0.6, foot, 7, POST);
  });

  if (gate) {
    piece(10.4, 11, foot, 7.5, POST);
    piece(21, 21.6, foot, 7.5, POST);
  }
}

//whether an edge of a tile is at its back, seen from where the camera is
//with the tile turned so many times: where x or y is a tile, once turned
function atBack(edge, turns) {
  var mid = {
      x0: [0, TILE / 2],
      y0: [TILE / 2, 0],
      x1: [TILE, TILE / 2],
      y1: [TILE / 2, TILE],
    }[edge],
    p = turnPoint(mid[0], mid[1], turns);

  return Math.max(p[0], p[1]) > TILE - 1;
}

//which way along the ground a heading goes
var HEADING = { "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1] };

/**
 * Every part there is, by name without its turn: "sites/lot/pile",
 * "sites/mast", "sites/cranetop", "sites/fence/1210/back" - a fence along
 * the edges its mask says, each of x0, y0, x1, y1 in turn: 1 for a fence, 2
 * for one with a gate in it (only ever the front, y0), 0 for none.
 */
var PARTS = (function () {
  var out = {};

  Object.keys(LOTS).forEach(function (lot) {
    out["sites/lot/" + lot] = { kind: "lot", lot: lot };
  });
  out["sites/mast"] = { kind: "mast" };
  out["sites/cranetop"] = { kind: "cranetop" };

  [0, 1].forEach(function (x0) {
    [0, 1, 2].forEach(function (y0) {
      [0, 1].forEach(function (x1) {
        [0, 1].forEach(function (y1) {
          var mask = "" + x0 + y0 + x1 + y1;

          if (mask === "0000") return;

          ["back", "front"].forEach(function (side) {
            out["sites/fence/" + mask + "/" + side] = {
              kind: "fence",
              mask: mask,
              back: side === "back",
            };
          });
        });
      });
    });
  });

  return out;
})();

/**
 * The boxes of a part by its name without its turn, as it is painted: a mast
 * as the first storey of it, the top over a mast one storey high - and a
 * stretch of fence as it is for the site turned `turns` times, at the back
 * or the front of the tile as it is seen then.
 *
 * @param [turns] {number} 0..3
 */
export function partBoxes(key, turns) {
  var p = PARTS[key],
    b = [];

  if (p === undefined) throw new Error("no such part: " + key);

  if (p.kind === "fence") {
    EDGES.forEach(function (edge, i) {
      var c = p.mask[i];

      if (c !== "0" && atBack(edge, turns || 0) === p.back)
        fence(b, edge, c === "2");
    });
  } else if (p.kind === "lot") {
    b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
    LOTS[p.lot](b, random(key));
  } else if (p.kind === "mast") mastSection(b, TOP, TOP + STOREY);
  else {
    b.push(
      box(
        MAST.x - 2,
        MAST.x + 2.5,
        MAST.y - 3,
        MAST.y + 2,
        TOP,
        TOP + CAB,
        CABIN,
      ),
    );
    b.push(
      box(
        MAST.x - 2.3,
        MAST.x + 2.8,
        MAST.y - 3.2,
        MAST.y - 2.9,
        TOP + 1,
        TOP + 3,
        CAB_GLASS,
      ),
    );
  }

  return b;
}

/**
 * What is drawn over a part - by its name with its turn - each where it is
 * on the screen from the middle of the part's tile:
 *
 *   - {vehicle, color, heading, x, y}, and for one that moves, turn - the
 *     heading it turns to - and move, [x, y] on the screen, how far it
 *     drives: a picture of the vehicle generator's (gfx/generated/
 *     vehicles.json), its middle at x, y;
 *   - {frames}: pictures to go through and back, the jib from one side to
 *     the other, each with its pivot where the tile's middle is - or, with
 *     cover, the one picture of the front of the fence, to be drawn again
 *     over a machine behind it (describe).
 */
function overlays(key, turns) {
  var p = PARTS[key],
    rnd = random(key + "/machines");

  if (p.kind === "cranetop")
    return [
      {
        frames: JIB_ANGLES.map(function (a, i) {
          return "gen/sites/jib/" + i + "/r" + turns;
        }),
      },
    ];

  if (p.kind !== "lot") return [];

  return (MACHINES[p.lot] || []).map(function (m) {
    var at = turnPoint(m.x, m.y, turns),
      heading = turnHeading(m.heading, turns),
      screen = iso.project(at[0] - TILE / 2, at[1] - TILE / 2, 1),
      o = {
        vehicle: m.vehicle,
        color: pick(rnd, Vehicles.TYPES[m.vehicle].colors),
        heading: heading,
        x: screen[0],
        y: screen[1],
      };

    if (m.drive) {
      var v = HEADING[heading];

      o.move = iso.project(v[0] * m.drive, v[1] * m.drive, 0);
      o.turn = turnHeading(m.turn, turns);
    }

    return o;
  });
}

//the boxes of a frame of the jib by its name - "sites/jib/3/r1", the fourth
//way it points, turned once - or null for a name that is not one
function jibOf(name) {
  var m = /^sites\/jib\/(\d+)\/r(\d)$/.exec(name);

  if (
    m === null ||
    JIB_ANGLES[+m[1]] === undefined ||
    TURNS.indexOf(+m[2]) === -1
  )
    return null;

  return iso.rotate(jib(JIB_ANGLES[+m[1]]), 1, 1, +m[2]);
}

/**
 * Every part and frame of the jib, by sprite name - "gen/sites/lot/pile/r0"
 * - with its size and pivot, without painting it; and what is drawn over
 * the parts, by part and turn.
 */
export function describe() {
  var sizes = {},
    over = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      var drawn = overlays(key, turns);

      var boxes = partBoxes(key, turns);

      //a stretch of fence that is all at the front, from where its back is
      //seen: nothing - it is left out (client/compoundbuilding)
      sizes["gen/" + key + "/r" + turns] =
        boxes.length === 0
          ? { w: 0, h: 0, pivotX: 0, pivotY: 0 }
          : measureOnTile(iso.rotate(boxes, 1, 1, turns));

      //the front of the fence, drawn again over the machines on its tile,
      //which drive behind it (client/compoundbuilding overlays)
      if (/^sites\/fence\/.*\/front$/.test(key) && boxes.length > 0)
        drawn = drawn.concat([
          { frames: ["gen/" + key + "/r" + turns], cover: true },
        ]);

      if (drawn.length > 0) over[key + "/r" + turns] = drawn;
    });
  });

  JIB_ANGLES.forEach(function (a, i) {
    TURNS.forEach(function (turns) {
      var name = "sites/jib/" + i + "/r" + turns;

      sizes["gen/" + name] = measureFree(jibOf(name));
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      lots: Object.keys(LOTS),
      turns: TURNS,
      overlays: over,
    },
  };
}

/**
 * One part, or frame of the jib, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    boxes = jibOf(key);

  if (boxes !== null) return iso.toImage(free(boxes));

  var at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  return iso.toImage(
    onTile(iso.rotate(partBoxes(key.slice(0, at), turns), 1, 1, turns)),
  );
}

export { PARTS, STOREY };
