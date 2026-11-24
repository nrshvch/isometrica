/**
 * Small town: one road or two (street, crossroads, tee, green), a small
 * centre, the village and farms along the roads.
 * See isometrica/.claude/skills/citygen/layouts.md (small town).
 */
import { WATER, FREE } from "./plan";
import { keepJoined } from "./streets";
import {
  fillStrip,
  stripsOf,
  freeCells,
  parkUp,
  farms,
  placeFacing,
} from "./lots";
import { codesOf } from "./catalogue";

export var LAYOUTS = { street: 3, crossroads: 3, tee: 2, green: 2 };

export var PALETTES = {
  centre: { oldtown: 3, house: 3, shop: 2, market: 1, village: 1 },
  edge: { village: 4, house: 2, villa: 0.6 },
  village: { village: 1 },
};

var EDGE = 4;

export var ALLOWED = {
  village: true,
  house: true,
  villa: true,
  shop: true,
  market: true,
  oldtown: true,
  park: true,
  square: true,
  church: true,
  townhall: true,
};

var CENTRE = 6;

//u along the main road, v across - whichever way the site is longer
function frameOf(plan) {
  var alongX = plan.rx >= plan.ry;

  return {
    alongX: alongX,
    u0: alongX ? plan.cx : plan.cy,
    v0: alongX ? plan.cy : plan.cx,
    xy: function (u, v) {
      return alongX ? [u, v] : [v, u];
    },
    side: function (du, dv) {
      if (alongX) return du < 0 ? 0 : du > 0 ? 2 : dv < 0 ? 1 : 3;

      return dv < 0 ? 0 : dv > 0 ? 2 : du < 0 ? 1 : 3;
    },
  };
}

function lay(plan, f, u, v, du, dv, n, material, level) {
  for (var i = 0; i < n; i++, u += du, v += dv) {
    var t = f.xy(u, v);

    if (!plan.inside(t[0], t[1]) || plan.at(t[0], t[1]) === WATER) return i;

    plan.setRoad(t[0], t[1], material(u, v), level);
  }

  return n;
}

function block(plan, f, ua, ub, va, vb, zone) {
  var a = f.xy(Math.min(ua, ub), Math.min(va, vb)),
    c = f.xy(Math.max(ua, ub), Math.max(va, vb)),
    b = {
      x0: Math.min(a[0], c[0]),
      y0: Math.min(a[1], c[1]),
      x1: Math.max(a[0], c[0]) + 1,
      y1: Math.max(a[1], c[1]) + 1,
      urban: true,
      district: "core",
      zone: zone,
      id: plan.blocks.length,
    };

  var cells = 0,
    good = 0;

  for (var y = b.y0; y < b.y1; y++)
    for (var x = b.x0; x < b.x1; x++) {
      if (plan.at(x, y) !== FREE) continue;

      plan.blockOf[plan.index(x, y)] = b.id;
      cells++;
      if (plan.ground.fits(plan.wx(x), plan.wy(y), 1, 1)) good++;
    }

  b.cells = cells;
  b.good = cells > 0 ? good / cells : 0;
  b.reach = plan.reach((b.x0 + b.x1 - 1) / 2, (b.y0 + b.y1 - 1) / 2);
  plan.blocks.push(b);

  return b;
}

export function layVillage(plan, random, wanted) {
  var f = frameOf(plan),
    u0 = f.u0,
    v0 = f.v0,
    //picked even when forced, so the rest of the town stays the same
    picked = random.weighted(LAYOUTS),
    layout = LAYOUTS[wanted] ? wanted : picked,
    main = random.chance(0.55) ? "asphalt" : "gravel",
    length = Math.round(Math.max(plan.rx, plan.ry) * 0.85),
    out = { layout: layout, frame: f, length: length, green: null };

  plan.lobes = null;

  function through(base) {
    return function (u, v) {
      var inMiddle =
        Math.abs(u - u0) <= CENTRE + 1 && Math.abs(v - v0) <= CENTRE + 1;

      return inMiddle ? (base === "asphalt" ? "asphalt" : "cobble") : base;
    };
  }

  function lane() {
    return "cobble";
  }

  if (layout === "green") {
    var g = random.int(2, 3),
      half = random.int(6, 9);

    lay(plan, f, u0 + half + 1, v0, 1, 0, 9999, through(main), 0);
    lay(plan, f, u0 - half - 1, v0, -1, 0, 9999, through(main), 0);
    lay(plan, f, u0 - half, v0 - g, 1, 0, 2 * half + 1, through(main), 0);
    lay(plan, f, u0 - half, v0 + g, 1, 0, 2 * half + 1, through(main), 0);
    lay(plan, f, u0 - half, v0 - g + 1, 0, 1, 2 * g - 1, through(main), 0);
    lay(plan, f, u0 + half, v0 - g + 1, 0, 1, 2 * g - 1, through(main), 0);

    out.g = g;
    out.green = block(
      plan,
      f,
      u0 - half + 1,
      u0 + half - 1,
      v0 - g + 1,
      v0 + g - 1,
      "green",
    );
  } else {
    lay(plan, f, u0, v0, 1, 0, 9999, through(main), 0);
    lay(plan, f, u0 - 1, v0, -1, 0, 9999, through(main), 0);
  }

  var cross = main === "asphalt" && random.chance(0.5) ? "asphalt" : "gravel",
    sv = random.chance(0.5) ? 1 : -1;

  if (layout === "crossroads") {
    lay(plan, f, u0, v0 + 1, 0, 1, 9999, through(cross), 1);
    lay(plan, f, u0, v0 - 1, 0, -1, 9999, through(cross), 1);
  } else if (layout === "tee") {
    var n = random.int(8, 15);

    if (
      lay(plan, f, u0, v0 + sv, 0, sv, n, through(cross), 1) === n &&
      random.chance(0.5)
    )
      lay(plan, f, u0, v0 + sv * (n + 1), 0, sv, 9999, through("gravel"), 1);
  }

  if (layout === "street" && random.chance(0.65)) {
    var k = random.int(5, 7),
      a = random.int(4, 8),
      b = random.int(4, 8),
      middle = a >= 5 && b >= 5 && random.chance(0.5);

    lay(plan, f, u0 - a, v0 + sv * k, 1, 0, a + b + 1, lane, 2);
    lay(plan, f, u0 - a, v0 + sv, 0, sv, k - 1, lane, 2);
    lay(plan, f, u0 + b, v0 + sv, 0, sv, k - 1, lane, 2);

    if (middle) {
      lay(plan, f, u0, v0 + sv, 0, sv, k - 1, lane, 2);
      block(plan, f, u0 - a + 1, u0 - 1, v0 + sv, v0 + sv * (k - 1), "centre");
      block(plan, f, u0 + 1, u0 + b - 1, v0 + sv, v0 + sv * (k - 1), "centre");
    } else
      block(
        plan,
        f,
        u0 - a + 1,
        u0 + b - 1,
        v0 + sv,
        v0 + sv * (k - 1),
        "centre",
      );
  } else if (
    (layout === "crossroads" || layout === "tee") &&
    random.chance(0.55)
  ) {
    var su = random.chance(0.5) ? 1 : -1,
      kk = random.int(5, 7),
      m = random.int(5, 8);

    lay(plan, f, u0 + su, v0 + sv * kk, su, 0, m, lane, 2);
    lay(plan, f, u0 + su * m, v0 + sv, 0, sv, kk - 1, lane, 2);
    block(
      plan,
      f,
      u0 + su,
      u0 + su * (m - 1),
      v0 + sv,
      v0 + sv * (kk - 1),
      "centre",
    );
  }

  keepJoined(plan);

  return out;
}

function squareSpot(plan, f, w, d, towards) {
  var offsets = [1, -w, 2, -w - 1, 3, -w - 2, 0, -w + 1];

  for (var i = 0; i < offsets.length; i++) {
    var ua = f.u0 + offsets[i],
      ok = true,
      cells = [];

    for (var du = 0; du < w && ok; du++)
      for (var dv = 1; dv <= d && ok; dv++) {
        var t = f.xy(ua + du, f.v0 + towards * dv);

        if (!plan.free(t[0], t[1], 1, 1)) ok = false;
        else cells.push(t);
      }

    for (du = 0; du < w && ok; du++) {
      var r = f.xy(ua + du, f.v0);

      if (!plan.isRoad(r[0], r[1])) ok = false;
    }

    if (ok) return { u: ua, cells: cells };
  }

  return null;
}

function centre(plan, random, how) {
  var f = how.frame,
    u0 = f.u0,
    v0 = f.v0,
    squareCode = codesOf("square", 1, 1)[0],
    built = {
      townHall: null,
      church: null,
      square: [f.xy(u0, v0)[0], f.xy(u0, v0)[1]],
    };

  function face(kind, shapes, road, towards, lo, hi) {
    return placeFacing(
      plan,
      random,
      kind,
      shapes,
      f.side(0, -towards),
      road + towards,
      lo,
      hi,
    );
  }

  if (how.green) {
    var g = how.green,
      lo = f.alongX ? g.x0 : g.y0,
      hi = f.alongX ? g.x1 : g.y1,
      vLo = f.alongX ? g.y0 : g.x0,
      vHi = (f.alongX ? g.y1 : g.x1) - 1;

    built.church = placeFacing(
      plan,
      random,
      "church",
      [[1, 2]],
      f.side(0, -1),
      vLo,
      u0 - 2,
      hi,
    );

    for (var u = u0 - 1; u <= u0 + 1; u++)
      for (var dv = 0; dv < 2; dv++) {
        var t = f.xy(u, vHi - dv);

        if (plan.free(t[0], t[1], 1, 1))
          plan.build(squareCode, t[0], t[1], 1, 1, 0, { zone: "square" });
      }

    built.square = f.xy(u0, vHi);

    parkUp(plan, random, freeCells(plan, g));

    if (random.chance(0.5))
      built.townHall = face(
        "townhall",
        [
          [2, 1],
          [1, 2],
        ],
        v0 - how.g,
        -1,
        u0 - 3,
        u0 + 4,
      );

    face(
      "market",
      [
        [2, 2],
        [1, 2],
        [2, 1],
      ],
      v0 + how.g,
      1,
      lo,
      hi,
    );

    return built;
  }

  var sides = random.shuffle([-1, 1]),
    w = random.int(2, 3),
    spot = null,
    towards = 1;

  for (var i = 0; i < sides.length && spot === null; i++) {
    towards = sides[i];
    spot = squareSpot(plan, f, w, 2, towards);
  }

  if (spot !== null) {
    spot.cells.forEach(function (c) {
      plan.build(squareCode, c[0], c[1], 1, 1, 0, { zone: "square" });
    });
    built.square = spot.cells[0];

    built.church =
      face("church", [[1, 2]], v0, towards, spot.u + w, spot.u + w + 4) ||
      face("church", [[1, 2]], v0, towards, spot.u - 4, spot.u);
  }

  if (random.chance(0.6))
    built.townHall = face(
      "townhall",
      [
        [2, 1],
        [1, 2],
      ],
      v0,
      -towards,
      u0 - 3,
      u0 + 5,
    );

  face(
    "market",
    [
      [2, 2],
      [1, 2],
      [2, 1],
      [2, 3],
    ],
    v0,
    -towards,
    u0 - 6,
    u0 + 7,
  );

  return built;
}

function runsOf(plan) {
  var runs = [];

  [true, false].forEach(function (alongX) {
    var lines = alongX ? plan.h : plan.w,
      length = alongX ? plan.w : plan.h;

    for (var at = 0; at < lines; at++) {
      var from = -1;

      for (var i = 0; i <= length; i++) {
        var road =
          i < length && (alongX ? plan.isRoad(i, at) : plan.isRoad(at, i));

        if (road && from < 0) from = i;
        else if (!road && from >= 0) {
          if (i - from >= 2)
            runs.push({ alongX: alongX, at: at, from: from, to: i - 1 });
          from = -1;
        }
      }
    }
  });

  return runs;
}

export function buildVillage(plan, random, how) {
  var built = centre(plan, random, how),
    length = how.length;

  plan.blocks.forEach(function (b) {
    if (!b.urban || b.zone !== "centre") return;

    stripsOf(plan, b).forEach(function (strip) {
      fillStrip(plan, random, strip, PALETTES.centre, {
        zone: "centre",
        parks: 0.05,
      });
    });

    parkUp(plan, random, freeCells(plan, b), 2);
  });

  var runs = runsOf(plan),
    far = function (x, y) {
      return Math.max(Math.abs(x - plan.cx), Math.abs(y - plan.cy));
    };

  [
    ["centre", 0, CENTRE + 1, { zone: "centre", parks: 0.04 }],
    ["edge", CENTRE + 2, CENTRE + 1 + EDGE, { zone: "village", parks: 0.03 }],
    [
      "village",
      CENTRE + 2 + EDGE,
      length,
      { zone: "village", parks: 0.03, gaps: 0.3 },
    ],
  ].forEach(function (part) {
    runs.forEach(function (run) {
      [-1, 1].forEach(function (across) {
        var s = run.alongX ? (across < 0 ? 3 : 1) : across < 0 ? 2 : 0,
          edge = run.at + across,
          from = -1;

        for (var i = run.from; i <= run.to + 1; i++) {
          var x = run.alongX ? i : run.at,
            y = run.alongX ? run.at : i,
            d = far(x, y),
            here = i <= run.to && d >= part[1] && d <= part[2];

          if (here && from < 0) from = i;
          else if (!here && from >= 0) {
            fillStrip(
              plan,
              random,
              { s: s, depth: 3, edge: edge, from: from, to: i },
              PALETTES[part[0]],
              part[3],
            );
            from = -1;
          }
        }
      });
    });
  });

  farms(plan, random);

  built.at = built.square;

  return built;
}
