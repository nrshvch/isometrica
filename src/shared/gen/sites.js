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
 *   - cranetop: the cab on top of the mast.
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

/**
 * The mast from z0 to z1: a lattice, in bands a quarter of a storey high so
 * that one storey of it stacked on the next carries straight on.
 */
function mastSection(b, z0, z1) {
  var band = STOREY / 4,
    z;

  for (z = z0; z < z1; z += band)
    b.push(
      box(
        MAST.x - 1.5,
        MAST.x + 1.5,
        MAST.y - 1.5,
        MAST.y + 1.5,
        z,
        Math.min(z + band, z1),
        Math.floor((z - PLINTH) / band) % 2 ? darker(MACHINE, 0.2) : MACHINE,
      ),
    );
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
      box(p[0] - 0.7, p[0] + 0.7, p[1] - 0.7, p[1] + 0.7, z, z + 1.5, MACHINE),
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

//how a heading turns with the part, a quarter turn at a time: what faced +x
//faces -y (see iso.rotate)
var HEADING_TURN = { "x+": "y-", "y-": "x-", "x-": "y+", "y+": "x+" };

var HEADING = { "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1] };

function turnHeading(heading, turns) {
  for (var t = 0; t < turns; t++) heading = HEADING_TURN[heading];

  return heading;
}

/**
 * Every part there is, by name without its turn: "sites/lot/pile",
 * "sites/mast", "sites/cranetop".
 */
var PARTS = (function () {
  var out = {};

  Object.keys(LOTS).forEach(function (lot) {
    out["sites/lot/" + lot] = { kind: "lot", lot: lot };
  });
  out["sites/mast"] = { kind: "mast" };
  out["sites/cranetop"] = { kind: "cranetop" };

  return out;
})();

/**
 * The boxes of a part by its name without its turn, as it is painted: a mast
 * as the first storey of it, the top over a mast one storey high.
 */
export function partBoxes(key) {
  var p = PARTS[key],
    b = [];

  if (p === undefined) throw new Error("no such part: " + key);

  if (p.kind === "lot") {
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
 *     the other, each with its pivot where the tile's middle is.
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

      sizes["gen/" + key + "/r" + turns] = measureOnTile(
        iso.rotate(partBoxes(key), 1, 1, turns),
      );

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
    onTile(iso.rotate(partBoxes(key.slice(0, at)), 1, 1, turns)),
  );
}

export { PARTS, STOREY };
