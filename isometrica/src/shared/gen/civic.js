/**
 * The town's own buildings, painted out of boxes the way the houses are
 * (shared/gen/houses) - each painted whole and cut into its tiles (onTile):
 *
 *   - a church on 1x2, end on to the street: its tower at the front, half
 *     as high again as the old town's, with the
 *     door in its foot, a clock and the bells under a spire, its nave behind
 *     under a steep roof, tall windows down its sides between buttresses -
 *     whitewashed or of dark red brick, under slate or tiles - in a
 *     churchyard with its gravestones and a low wall along the street;
 *   - a town hall on 1x2, end on to the street - or on 2x1, along it - two
 *     storeys behind a paved
 *     forecourt with its flag: white with a portico of columns and a dome
 *     over it all, like a capitol; cream with columns, a hipped roof and a
 *     clock tower on it; clapboard with a porch and a bell cupola; or brick
 *     with stone at its corners and the clock in its gable, no columns;
 *   - a square on 1x1, for people to walk across where a park would be
 *     wasted - slabs or cobbles, a bench along each side, a tree in a tub
 *     at each corner, lamps - with an advertising column in the middle, a
 *     street food stand, an ice cream cart, or nothing; or bare paving and
 *     nothing else at all.
 *
 * Whichever it is is picked when it is placed (client/compoundbuilding), out
 * of the designs and options there are for each (FOOTPRINTS).
 *
 * While one goes up its tiles are the same building site as anybody's
 * (shared/gen/sites), then its walls going up on their slab (houses site).
 *
 * Units as everywhere: a tile is 32 along the ground, about ten metres;
 * heights in pixels, twelve to a storey.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  lighter,
  TILE,
  STOREY,
  GRASS,
  WOOD,
  METAL,
  CONCRETE,
  GLASSY,
  LIT,
  made,
  madeOf,
  random,
  namesOf,
  tree,
  measureOnTile,
  onTile,
  TURNS,
} from "./blocks.js";
import {
  face,
  windowOn,
  windowsOn,
  windowsAround,
  doorOn,
  walls,
  pitched,
  flatRoof,
  column,
  steps,
  balustrade,
  lawn,
  paved,
  flowers,
  bush,
  cypress,
  site,
  SH,
  PANE,
} from "./houses.js";
import { gable, pyramid } from "./oldtown.js";
import { turned, disc } from "./utilities.js";

var STAINED = [70, 92, 150],
  IRON = [46, 46, 54],
  GOLD = [214, 178, 64],
  CLOCK = [244, 240, 228],
  SLABS = madeOf([196, 190, 176], "slabs"),
  SETTS = madeOf([170, 162, 150], "setts"),
  PATH = madeOf([206, 196, 176], "slabs"),
  CHURCHYARD = madeOf([116, 160, 84], "grass"),
  COPPER = [104, 168, 146],
  POLE = [70, 74, 82],
  LAMP = [252, 238, 180];

//what a lamp glows with after dark, lighting what is round it (shared/gen
//parks lamp)
var GLOWS = Object.assign({}, LIT, { glow: true });

function constant(c) {
  return function () {
    return c;
  };
}

//a lamp on a post
function lamp(b, x, y) {
  b.push(box(x, x + 1, y, y + 1, 1, 10, POLE));
  b.push(box(x - 0.5, x + 1.5, y - 0.5, y + 1.5, 10, 11, LAMP, GLOWS));
  b.push(box(x - 0.5, x + 1.5, y - 0.5, y + 1.5, 11, 11.5, POLE));
}

//a seat 4 long along x at x, y, its back towards +y or -y (back)
function seat(b, x, y, back) {
  b.push(box(x, x + 4, y, y + 2, 2, 3, WOOD));
  b.push(
    box(x, x + 4, back > 0 ? y + 1 : y, back > 0 ? y + 2 : y + 1, 3, 4, WOOD),
  );
  b.push(box(x, x + 1, y, y + 2, 1, 2, METAL));
  b.push(box(x + 3, x + 4, y, y + 2, 1, 2, METAL));
}

//and along y at x, y, its back towards +x or -x
function seatY(b, x, y, back) {
  b.push(box(x, x + 2, y, y + 4, 2, 3, WOOD));
  b.push(
    box(back > 0 ? x + 1 : x, back > 0 ? x + 2 : x + 1, y, y + 4, 3, 4, WOOD),
  );
  b.push(box(x, x + 2, y, y + 1, 1, 2, METAL));
  b.push(box(x, x + 2, y + 3, y + 4, 1, 2, METAL));
}

//a flag on a pole at x, y, in the town's colours
function flagpole(b, x, y, colors) {
  b.push(box(x - 0.8, x + 0.8, y - 0.8, y + 0.8, 1, 1.8, CONCRETE));
  b.push(box(x - 0.25, x + 0.25, y - 0.25, y + 0.25, 1.8, 26, [220, 220, 216]));
  colors.forEach(function (c, i) {
    b.push(
      box(x + 0.25, x + 7, y - 0.1, y + 0.1, 25 - i * 1.5, 26 - i * 1.5, c),
    );
  });
}

/* --- The church ------------------------------------------------------- */

//what a church is built of: whitewashed, or dark red brick with stone dressings
var CHURCHES = {
  white: {
    wall: [238, 234, 222],
    trim: [250, 248, 240],
    door: [92, 62, 44],
  },
  red: {
    wall: madeOf([138, 56, 46], "brick"),
    trim: madeOf([222, 210, 190], "stone"),
    door: [62, 48, 40],
  },
};

var CHURCH_ROOFS = { slate: [84, 88, 102], tiles: [150, 74, 56] };

/**
 * A church on a tile across and two deep, its front to the street at -y.
 */
function church(o, rnd, stage) {
  var W = TILE,
    D = 2 * TILE,
    mid = W / 2,
    P = CHURCHES[o.style],
    roof = CHURCH_ROOFS[o.roof],
    t = { x0: mid - 5, x1: mid + 5, y0: 8, y1: 19 },
    r = { x0: 7, x1: 25, y0: 18, y1: 50 },
    h = 15,
    //its tower half as high again as the old town's, a storey more
    th = 48,
    b = [];

  if (stage)
    return site(
      W,
      D,
      [
        { rect: t, storeys: 4 },
        { rect: r, storeys: 1 },
      ],
      stage,
      rnd,
    );

  lawn(b, 0, W, 0, D, CHURCHYARD);
  paved(b, mid - 2.5, mid + 2.5, 0.3, t.y0, PATH);

  //a low wall along the street, the way in through it
  b.push(box(0.5, mid - 4, 1, 2, 1, 3, P.trim));
  b.push(box(mid + 4, W - 0.5, 1, 2, 1, 3, P.trim));
  [mid - 5, mid + 4].forEach(function (x) {
    b.push(box(x, x + 1, 0.6, 2.4, 1, 4.2, P.trim));
  });

  //gravestones in rows down both sides, a yew or two among them
  [
    [1.5, 5.5],
    [26.5, 30.5],
  ].forEach(function (side) {
    for (var y = 24; y < D - 6; y += 5)
      for (var x = side[0]; x < side[1]; x += 3) {
        if (rnd() < 0.35) continue;

        var grey = [148 + Math.floor(rnd() * 30), 148, 144];

        if (rnd() < 0.3) {
          b.push(box(x, x + 0.5, y, y + 0.5, 1.2, 4.6, grey));
          b.push(box(x - 0.8, x + 1.3, y, y + 0.5, 3.4, 3.9, grey));
        } else b.push(box(x, x + 1.8, y, y + 0.6, 1.2, 3.6, grey));
      }
  });
  cypress(b, 3.5, 13, 14);
  cypress(b, W - 3.5, 13, 14);
  tree(b, mid, D - 5, 3);

  //the nave, buttresses and tall windows down its sides
  b.push(
    box(r.x0 - 0.4, r.x1 + 0.4, r.y0, r.y1 + 0.4, 1, 2, darker(P.wall, 0.2)),
  );
  b.push(box(r.x0, r.x1, r.y0, r.y1, 2, h, P.wall));
  for (var y = r.y0 + 4; y < r.y1 - 3; y += 6)
    ["-x", "+x"].forEach(function (f) {
      b.push(face(r, f, y - 0.6, y + 0.6, 1, h - 3, 0, 1.4, P.trim));
      b.push(face(r, f, y + 1.6, y + 4.2, 5, 12.5, 0, 0.3, STAINED, GLASSY));
      b.push(face(r, f, y + 2.4, y + 3.4, 12.5, 13.8, 0, 0.3, STAINED, GLASSY));
    });
  gable(b, r, h, "y", 1, 1, roof, P.wall, made(o.roof));

  //the apse at the back, round in steps
  [7, 5, 3].forEach(function (w, i) {
    b.push(box(mid - w, mid + w, r.y1, r.y1 + 2 + i * 1.3, 1, h - 3, P.wall));
  });

  //the tower at the front
  b.push(
    box(t.x0 - 0.5, t.x1 + 0.5, t.y0 - 0.5, t.y1, 1, 3, darker(P.wall, 0.15)),
  );
  b.push(box(t.x0, t.x1, t.y0, t.y1, 3, th, P.wall));
  [18, 31].forEach(function (z) {
    b.push(box(t.x0 - 0.3, t.x1 + 0.3, t.y0 - 0.3, t.y1, z, z + 1, P.trim));
  });

  //the door, arched, in its foot, and the step before it
  b.push(face(t, "-y", mid - 2.2, mid + 2.2, 1.2, 9, 0, 0.3, P.door));
  b.push(face(t, "-y", mid - 1.2, mid + 1.2, 9, 10, 0, 0.3, P.door));
  b.push(face(t, "-y", mid - 3, mid + 3, 1, 1.4, 0, 0.8, CONCRETE));
  b.push(face(t, "-y", mid - 0.8, mid + 0.8, 12, 16, 0, 0.3, STAINED, GLASSY));
  b.push(face(t, "-y", mid - 0.8, mid + 0.8, 23, 28, 0, 0.3, STAINED, GLASSY));
  //the clock
  b.push(face(t, "-y", mid - 2, mid + 2, 35.5, 39.5, 0, 0.3, CLOCK));
  b.push(face(t, "-y", mid - 0.25, mid + 0.25, 37.4, 39, 0, 0.4, IRON));

  //the belfry: an opening on every side
  [
    ["-y", t.x0, t.x1],
    ["+y", t.x0, t.x1],
    ["-x", t.y0, t.y1],
    ["+x", t.y0, t.y1],
  ].forEach(function (q) {
    var m = (q[1] + q[2]) / 2;

    b.push(face(t, q[0], m - 2, m + 2, 42, 46.5, -0.5, 0.05, [40, 40, 46]));
  });
  b.push(
    box(t.x0 - 0.6, t.x1 + 0.6, t.y0 - 0.6, t.y1 + 0.6, th, th + 1, P.trim),
  );

  var sh = pyramid(
      b,
      t.x0 - 0.2,
      t.x1 + 0.2,
      t.y0 - 0.2,
      t.y1 + 0.2,
      th + 1,
      3,
      roof,
      made(o.roof),
    ),
    cy = (t.y0 + t.y1) / 2;

  //the cross, gilt, on top
  b.push(
    box(mid - 0.3, mid + 0.3, cy - 0.3, cy + 0.3, th + sh, th + sh + 4, GOLD),
  );
  b.push(
    box(
      mid - 1.3,
      mid + 1.3,
      cy - 0.3,
      cy + 0.3,
      th + sh + 2.4,
      th + sh + 3,
      GOLD,
    ),
  );

  return b;
}

/* --- The town hall ---------------------------------------------------- */

//what a town hall is built of, and its roof
var HALLS = {
  capitol: {
    wall: [242, 240, 234],
    trim: [252, 252, 248],
    door: [70, 56, 46],
    roof: COPPER,
  },
  cream: {
    wall: [236, 220, 178],
    trim: [250, 246, 234],
    door: [86, 58, 40],
    roof: [96, 100, 112],
  },
  wooden: {
    wall: madeOf([228, 226, 216], "siding"),
    trim: [86, 104, 126],
    door: [120, 52, 44],
    shutter: [86, 104, 126],
    roof: [104, 92, 84],
  },
  brick: {
    wall: madeOf([164, 84, 62], "brick"),
    trim: madeOf([222, 212, 192], "stone"),
    door: [56, 74, 62],
    roof: [84, 88, 102],
    texture: "quoins",
  },
};

//the town's colours, on its flag
var FLAG = [
  [36, 84, 160],
  [246, 246, 240],
  [200, 52, 44],
];

/**
 * A town hall on a footprint W by D tiles, its front to the street at -y,
 * behind a forecourt: end on to the street on a tile across and two deep,
 * or along it, its long side to it, on two across and one deep.
 */
function townhallOn(W, D) {
  return function (o, rnd, stage) {
    return townhall(o, rnd, stage, W * TILE, D * TILE);
  };
}

function townhall(o, rnd, stage, W, D) {
  var deep = D > W,
    mid = W / 2,
    P = HALLS[o.style],
    r = deep
      ? { x0: 4, x1: 28, y0: 22, y1: 56 }
      : { x0: 8, x1: 56, y0: 11, y1: 28 },
    z0 = 2.6,
    porch = o.style === "capitol" || o.style === "cream",
    //how far from the middle the flower beds are, and from where to where
    //back from the street
    fx = deep ? 9 : 13,
    fy = deep ? [6, 12] : [2, 6],
    //and the lamps
    lx = deep ? 9 : 11,
    b = [];

  if (stage)
    return site(W, D, [{ rect: r, storeys: 2, z: z0 - 1 }], stage, rnd);

  //the forecourt: paved, a lawn and flowers either side, the flag and lamps
  lawn(b, 0, W, 0, D);
  paved(b, mid - 7, mid + 7, 0.3, r.y0, SLABS);
  paved(b, 1.5, W - 1.5, r.y0 - 4, r.y0, SLABS);
  flowers(b, 2, mid - fx, fy[0], fy[1], rnd);
  flowers(b, mid + fx, W - 2, fy[0], fy[1], rnd);
  flagpole(b, 4, deep ? 15 : 7, FLAG);
  lamp(b, mid - lx, deep ? 2 : 1.5);
  lamp(b, mid + lx - 1, deep ? 2 : 1.5);
  //and round the back of it, a hedge
  bush(b, 2.5, D - 3, 2);
  bush(b, W - 2.5, D - 3, 2);

  //a terrace it stands on, the steps up to it
  b.push(box(r.x0 - 1, r.x1 + 1, r.y0 - 2, r.y1 + 1, 1, z0, P.trim));
  steps(b, mid - 5, mid + 5, r.y0 - 2, z0, 2, 1.2, P.trim);

  var top = walls(b, r, z0, 2, P);

  windowsAround(b, r, z0, 2, 3, PANE + 1, P, {
    "-y": [mid - (porch ? 9 : 4), mid + (porch ? 9 : 4)],
  });
  doorOn(b, r, "-y", mid - 2.5, 5, z0 + 0.1, 9, P);
  if (!porch) windowOn(b, r, "-y", mid - 2, 4, z0 + SH + 3, PANE + 1, P);

  if (porch) {
    //a portico of columns two storeys high, an entablature over them, a
    //pediment over that, and the steps up to it
    var p = { x0: mid - 9, x1: mid + 9, y0: r.y0 - 7, y1: r.y0 + 1 };

    b.push(box(p.x0, p.x1, p.y0, r.y0, 1, z0, P.trim));
    steps(b, mid - 7, mid + 7, p.y0, z0, 3, 1, P.trim);
    [mid - 7.5, mid - 2.5, mid + 2.5, mid + 7.5].forEach(function (x) {
      column(b, x, p.y0 + 1.5, z0, top, P.trim);
    });
    b.push(box(p.x0, p.x1, p.y0, p.y1, top, top + 1.6, P.trim));
    gable(b, p, top + 1.6, "y", 0.5, 0.4, P.trim, P.trim, made("render"));
    windowsOn(b, r, "-y", [mid - 5.5, mid + 3.5], 2, z0 + 3.5, PANE + 1, P);
    windowsOn(
      b,
      r,
      "-y",
      [mid - 5.5, mid - 1, mid + 3.5],
      2,
      z0 + SH + 3.5,
      PANE,
      P,
    );
  }

  if (o.style === "capitol") {
    //a flat roof behind a balustrade, and a dome on a drum in the middle of it
    flatRoof(b, r, top, P.trim, 0.8);
    balustrade(b, r.x0, r.x1, r.y0 + 0.4, top + 1.2, P.trim);
    var cy = (r.y0 + r.y1) / 2 + (deep ? 2 : 0),
      dz = top + 1.2;

    turned(b, mid, cy, dz, dz + 5, constant(7), constant(P.wall), "render");
    for (var k = 0; k < 8; k++) {
      var a = (k / 8) * Math.PI * 2;

      b.push(
        box(
          mid + Math.cos(a) * 7 - 0.5,
          mid + Math.cos(a) * 7 + 0.5,
          cy + Math.sin(a) * 7 - 0.5,
          cy + Math.sin(a) * 7 + 0.5,
          dz,
          dz + 5,
          P.trim,
        ),
      );
    }
    turned(
      b,
      mid,
      cy,
      dz + 5,
      dz + 12,
      function (z) {
        var u = (z - dz - 5) / 7;

        return 7.5 * Math.sqrt(Math.max(0, 1 - u * u));
      },
      constant(P.roof),
    );
    turned(
      b,
      mid,
      cy,
      dz + 12,
      dz + 15,
      constant(1.5),
      constant(P.trim),
      "render",
    );
    b.push(
      box(mid - 0.3, mid + 0.3, cy - 0.3, cy + 0.3, dz + 15, dz + 18, GOLD),
    );
  } else if (o.style === "cream") {
    //a hipped roof, a clock tower standing on the middle of its ridge
    pitched(
      b,
      r,
      top,
      {
        kind: "hip",
        axis: deep ? "y" : "x",
        rise: 8,
        over: 1.2,
        color: P.roof,
      },
      P.wall,
    );
    var cy0 = deep ? r.y0 + 10 : (r.y0 + r.y1) / 2 - 3.5,
      c = { x0: mid - 3.5, x1: mid + 3.5, y0: cy0, y1: cy0 + 7 };

    b.push(box(c.x0, c.x1, c.y0, c.y1, top, top + 16, P.wall));
    b.push(
      box(
        c.x0 - 0.4,
        c.x1 + 0.4,
        c.y0 - 0.4,
        c.y1 + 0.4,
        top + 15,
        top + 16,
        P.trim,
      ),
    );
    b.push(
      face(c, "-y", mid - 2, mid + 2, top + 9.5, top + 13.5, 0, 0.3, CLOCK),
    );
    b.push(
      face(c, "-y", mid - 0.25, mid + 0.25, top + 11.4, top + 13, 0, 0.4, IRON),
    );
    pyramid(
      b,
      c.x0 - 0.3,
      c.x1 + 0.3,
      c.y0 - 0.3,
      c.y1 + 0.3,
      top + 16,
      1.4,
      P.roof,
      made("slate"),
    );
  } else if (o.style === "wooden") {
    //a gable end to the street - or its eaves, along it - a porch on posts
    //over the door, and a bell cupola on the ridge
    pitched(
      b,
      r,
      top,
      {
        kind: "gable",
        axis: deep ? "y" : "x",
        rise: 9,
        over: 1.2,
        color: P.roof,
      },
      P.wall,
    );
    var q = { x0: mid - 5, x1: mid + 5, y0: r.y0 - 5, y1: r.y0 };

    [q.x0 + 0.5, q.x1 - 1.3].forEach(function (x) {
      b.push(box(x, x + 0.8, q.y0 + 0.5, q.y0 + 1.3, z0, z0 + SH - 1, P.trim));
    });
    b.push(box(q.x0, q.x1, q.y0, q.y1, z0 + SH - 1, z0 + SH, P.trim));
    b.push(
      box(
        q.x0 - 0.5,
        q.x1 + 0.5,
        q.y0 - 0.5,
        q.y1,
        z0 + SH,
        z0 + SH + 0.8,
        P.roof,
      ),
    );
    //as high as the ridge is over the eaves (houses pitched): half a unit
    //for every one across, from the eaves either side
    var uy0 = deep ? r.y0 + 4 : (r.y0 + r.y1) / 2 - 2.5,
      u = { x0: mid - 2.5, x1: mid + 2.5, y0: uy0, y1: uy0 + 5 },
      ridge = top + 0.25 * ((deep ? r.x1 - r.x0 : r.y1 - r.y0) + 2) + 1.5;

    b.push(box(u.x0, u.x1, u.y0, u.y1, top + 2, ridge + 4, [244, 244, 238]));
    b.push(
      face(
        u,
        "-y",
        mid - 1.2,
        mid + 1.2,
        ridge,
        ridge + 3,
        -0.2,
        0.05,
        [40, 40, 46],
      ),
    );
    pyramid(
      b,
      u.x0 - 0.4,
      u.x1 + 0.4,
      u.y0 - 0.4,
      u.y1 + 0.4,
      ridge + 4,
      1.6,
      P.roof,
      made("slate"),
    );
  } else {
    //a hipped roof of slate, and a gable over the front with the clock in it
    pitched(
      b,
      r,
      top,
      { kind: "hip", axis: "x", rise: 8, over: 1.2, color: P.roof },
      P.wall,
    );
    var g = { x0: mid - 6, x1: mid + 6, y0: r.y0 - 0.6, y1: r.y0 + 6 };

    b.push(box(g.x0, g.x1, g.y0, g.y1, top, top + 1, P.trim));
    gable(b, g, top + 1, "y", 1, 0.4, P.roof, P.wall, made("slate"));
    b.push(
      face(g, "-y", mid - 2, mid + 2, top + 1.5, top + 5.5, 0, 0.3, CLOCK),
    );
    b.push(
      face(g, "-y", mid - 0.25, mid + 0.25, top + 3.4, top + 5, 0, 0.4, IRON),
    );
    //lanterns either side of the door
    [mid - 4.5, mid + 3.5].forEach(function (x) {
      b.push(box(x, x + 1, r.y0 - 0.8, r.y0, z0 + 6, z0 + 8, LAMP, GLOWS));
    });
  }

  return b;
}

/* --- The square --------------------------------------------------------- */

//what stands in the middle of a square
//- or nothing at all, no benches or trees either: paving to walk across
var STANDS = ["none", "ads", "food", "icecream", "empty"];

//the posters on an advertising column, in bands round it
var POSTERS = [
  [214, 64, 60],
  [246, 206, 72],
  [70, 132, 196],
  [244, 244, 236],
  [96, 170, 104],
  [226, 120, 170],
];

/**
 * An advertising column at x, y: a drum pasted all over with posters, a
 * band round its foot, a green cap over it with a finial.
 */
function adColumn(b, x, y, rnd) {
  var a = Math.floor(rnd() * POSTERS.length);

  turned(b, x, y, 1, 2, constant(2.6), constant([60, 82, 70]), "render");
  turned(
    b,
    x,
    y,
    2,
    11,
    constant(2.2),
    function (z) {
      return POSTERS[(a + Math.floor((z - 2) / 3)) % POSTERS.length];
    },
    "render",
  );
  turned(
    b,
    x,
    y,
    11,
    13.5,
    function (z) {
      return 2.8 - (z - 11) * 0.8;
    },
    constant([60, 82, 70]),
  );
  b.push(box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 13.5, 15, [60, 82, 70]));
}

/**
 * A street food stand about x, y: a kiosk with its hatch to the front under
 * a striped awning, its board on top, and two tables to stand at.
 */
function foodStand(b, x, y) {
  var k = { x0: x - 4, x1: x + 4, y0: y - 1, y1: y + 4 },
    red = [200, 56, 44],
    cream = [244, 236, 214];

  b.push(box(k.x0, k.x1, k.y0, k.y1, 1, 9, cream));
  b.push(face(k, "-y", k.x0 + 1, k.x1 - 1, 4, 7, 0, 0.2, [70, 62, 56]));
  b.push(
    face(k, "-y", k.x0 + 0.5, k.x1 - 0.5, 3.6, 4, 0, 1.4, [180, 180, 176]),
  );
  for (var i = 0; i < 4; i++)
    b.push(
      face(
        k,
        "-y",
        k.x0 + i * 2,
        k.x0 + i * 2 + 2,
        8,
        9,
        0,
        2.2,
        i % 2 ? cream : red,
      ),
    );
  b.push(box(k.x0 - 0.2, k.x1 + 0.2, k.y0 - 0.2, k.y1 + 0.2, 9, 9.6, red));
  b.push(box(x - 3, x + 3, k.y0 + 1, k.y0 + 1.6, 9.6, 12, [246, 196, 52], LIT));
  b.push(box(x - 2, x + 2, k.y0 + 0.9, k.y0 + 1, 10.2, 11.4, red));

  [x - 8, x + 7].forEach(function (tx) {
    b.push(box(tx - 0.3, tx + 0.3, y - 5.3, y - 4.7, 1, 6, METAL));
    b.push(box(tx - 1.4, tx + 1.4, y - 6.4, y - 3.6, 6, 6.4, WOOD));
  });
}

/**
 * An ice cream cart about x, y: a white box on two wheels with its lids on
 * top, a cone on a stick over it, and a striped parasol.
 */
function iceCreamCart(b, x, y) {
  var pink = [240, 150, 180],
    white = [246, 246, 242];

  b.push(box(x - 4, x + 4, y - 2, y + 2, 2.5, 7, white));
  b.push(box(x - 4, x + 4, y - 2.1, y - 2, 3.5, 5.5, pink));
  [x - 3, x - 0.5, x + 2].forEach(function (lx) {
    b.push(box(lx, lx + 1.6, y - 1.4, y + 1.4, 7, 7.4, [170, 196, 214]));
  });
  [x - 3.2, x + 2.4].forEach(function (wx) {
    b.push(box(wx, wx + 0.8, y - 2.4, y - 2.1, 0.8, 3.2, [52, 52, 58]));
    b.push(box(wx, wx + 0.8, y + 2.1, y + 2.4, 0.8, 3.2, [52, 52, 58]));
  });
  b.push(box(x + 4, x + 6, y - 0.3, y + 0.3, 5, 5.5, METAL));

  //the parasol, in segments of colour round its pole
  b.push(box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 7, 15, METAL));
  turned(
    b,
    x,
    y,
    14,
    16.5,
    function (z) {
      return 6 - (z - 14) * 2.2;
    },
    function (z) {
      return z < 15 ? pink : white;
    },
  );
  //a cone, big, on a stick
  b.push(box(x - 3.6, x - 3.2, y - 0.2, y + 0.2, 7, 11, METAL));
  b.push(box(x - 4.2, x - 2.6, y - 0.5, y + 0.5, 11, 13, [214, 168, 100]));
  b.push(box(x - 4.5, x - 2.3, y - 0.8, y + 0.8, 13, 14.6, pink));
}

/**
 * A square on a tile: paving all over, a bench along each side facing in,
 * a tree in a tub at each corner, two lamps - and whatever stands in the
 * middle (STANDS).
 */
function square(o, rnd, stage) {
  var W = TILE,
    mid = W / 2,
    ground = o.paving === "cobbles" ? SETTS : SLABS,
    b = [];

  if (stage) return site(W, W, [], stage, rnd);

  b.push(box(0, W, 0, W, 0, 1, GRASS));
  b.push(box(0, W, 0, W, 1, 1.2, ground));

  //bare paving, and nothing else
  if (o.stand === "empty") return b;

  //a ring of a darker stone round the middle
  for (var i = 0; i < 24; i++) {
    var a = (i / 24) * Math.PI * 2,
      x = mid + Math.cos(a) * 8,
      y = mid + Math.sin(a) * 8;

    b.push(
      box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 1.2, 1.3, darker(ground, 0.2)),
    );
  }

  //the trees in their tubs at the corners
  [
    [4, 4],
    [W - 4, 4],
    [4, W - 4],
    [W - 4, W - 4],
  ].forEach(function (c) {
    b.push(
      box(c[0] - 2, c[0] + 2, c[1] - 2, c[1] + 2, 1.2, 3, [150, 146, 138]),
    );
    tree(b, c[0], c[1], 2);
  });

  seat(b, mid - 2, W - 4, 1);
  seatY(b, 1.5, mid - 2, -1);
  seatY(b, W - 3.5, mid - 2, 1);
  lamp(b, mid - 7, 2);
  lamp(b, mid + 6, W - 4);

  if (o.stand === "ads") adColumn(b, mid, mid, rnd);
  else if (o.stand === "food") foodStand(b, mid, mid);
  else if (o.stand === "icecream") iceCreamCart(b, mid, mid);
  else disc(b, mid, mid, 3, 1.4, darker(ground, 0.12), "slabs");

  return b;
}

/* --- Parts ---------------------------------------------------------------- */

var DESIGNS = {
  church: church,
  townhall: townhallOn(1, 2),
  townhallwide: townhallOn(2, 1),
  square: square,
};

//the options in a part's name after its design, by design, in order
var OPTIONS = {
  church: ["style", "roof"],
  townhall: ["style"],
  townhallwide: ["style"],
  square: ["paving", "stand"],
};

var AXES = {
  church: { style: Object.keys(CHURCHES), roof: Object.keys(CHURCH_ROOFS) },
  townhall: { style: Object.keys(HALLS) },
  townhallwide: { style: Object.keys(HALLS) },
  square: { paving: ["slabs", "cobbles"], stand: STANDS },
};

//how many tiles across and deep each is
var SIZES = {
  church: [1, 2],
  townhall: [1, 2],
  townhallwide: [2, 1],
  square: [1, 1],
};

//the tiles of a design, the part on each named by its options then the tile
function design(name) {
  var size = SIZES[name],
    template =
      "civic/" +
      name +
      "/" +
      OPTIONS[name]
        .map(function (axis) {
          return "{" + axis + "}";
        })
        .join("/"),
    tiles = [];

  for (var y = 0; y < size[1]; y++)
    for (var x = 0; x < size[0]; x++)
      tiles.push({ x: x, y: y, parts: [template + "/" + x + "/" + y] });

  return { design: name, weight: 1, axes: AXES[name], tiles: tiles };
}

/**
 * What every one can be, as shared/gen/shops has its footprints: a design
 * each, every option of it picked at random.
 */
var FOOTPRINTS = {
  church: [design("church")],
  townhall: [design("townhall")],
  "townhall-wide": [design("townhallwide")],
  square: [design("square")],
};

/**
 * Every part there is, by name without its turn - every design with every
 * option, "civic/church/red/slate/0/1" - and what each tile is while it goes
 * up, by the design and its first option and the stage
 * (shared/gen/stacking houseSite names them): "civic/frame/church/red/1/0/1".
 */
var PARTS = (function () {
  var out = {};

  Object.keys(FOOTPRINTS).forEach(function (fp) {
    FOOTPRINTS[fp].forEach(function (d) {
      d.tiles.forEach(function (t) {
        namesOf(t.parts[0], d.axes).forEach(function (name) {
          var q = name.split("/");

          out[name] = true;
          [1, 2].forEach(function (stage) {
            out[
              [
                "civic/frame",
                q[1],
                q[2],
                stage,
                q[q.length - 2],
                q[q.length - 1],
              ].join("/")
            ] = true;
          });
        });
      });
    });
  });

  return out;
})();

var whole = {};

/**
 * The whole of one, by its name without the tile: its boxes in the
 * footprint's own place.
 */
function built(id) {
  if (whole[id] !== undefined) return whole[id];

  var p = id.split("/"),
    o = {},
    stage = 0,
    name = p[1];

  if (name === "frame") {
    name = p[2];
    o[OPTIONS[name][0]] = p[3];
    stage = +p[4];
  } else
    OPTIONS[name].forEach(function (axis, k) {
      o[axis] = p[2 + k];
    });

  var made = DESIGNS[name](o, random(id), stage);

  //a building site is painted the houses' way, with its bays (none)
  whole[id] = Array.isArray(made) ? made : made.boxes;

  return whole[id];
}

/**
 * The boxes of a part by its name without its turn, as it is painted: the
 * whole of it, so far off as the tile is from the corner of the footprint -
 * onTile cuts out the tile.
 */
export function partBoxes(key) {
  if (PARTS[key] === undefined) throw new Error("no such part: " + key);

  var p = key.split("/"),
    cx = +p[p.length - 2],
    cy = +p[p.length - 1];

  return built(p.slice(0, p.length - 2).join("/")).map(function (c) {
    return iso.moved(c, -cx * TILE, -cy * TILE, 0);
  });
}

/**
 * Every part, by sprite name - "gen/civic/townhall/brick/0/1/r2" - with its
 * size and pivot, without painting it; and what every one can be.
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

export { PARTS, STOREY, FOOTPRINTS };
