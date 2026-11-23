/**
 * A small town: a village grown into a town, mostly the country still -
 * one road, two or three, and the town along them - the way villages are laid
 * out where they grew up by themselves (a street village, a crossroads
 * village, a village at a fork, a green village):
 *
 *  - "street": along one road through it, its houses either side - and a
 *    back lane behind them at the middle, round a block or two;
 *  - "crossroads": where two roads cross, the town round the crossing and
 *    out along all four of them - and a lane round a block in one corner;
 *  - "tee": a road through it and a road off it, the town where they meet
 *    and along both;
 *  - "green": the road through it parted round a long green in its middle -
 *    the church on it, the square, a park and its pond - and the town round
 *    the green, facing it.
 *
 * Its middle is a little town: a square by the road, the church, the town
 * hall now and then, a market, the old town, shops, town houses - on cobbled
 * streets with water, as they want. Out along the roads, a village's houses
 * and farms, a gap between some of them; further out, farms, their fields
 * round them. No flats, no offices: a small town has neither.
 *
 * u runs along the road through it, v across: along x or along y, whichever
 * way the town is longer (site.js).
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

//how likely each way of laying a village out is
export var LAYOUTS = { street: 3, crossroads: 3, tee: 2, green: 2 };

//what the middle of a small town is built of, and what out along its roads
export var PALETTES = {
  centre: { oldtown: 3, house: 3, shop: 2, market: 1, village: 1 },
  village: { village: 8, house: 0.6, villa: 0.25 },
};

//what a small town may have built in it at all (balance.js)
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

//how far out its middle reaches from where its roads meet, in tiles
var CENTRE = 6;

/**
 * The way the town lies on the window: u along its road, v across.
 */
function frameOf(plan) {
  var alongX = plan.rx >= plan.ry;

  return {
    alongX: alongX,
    u0: alongX ? plan.cx : plan.cy,
    v0: alongX ? plan.cy : plan.cx,
    xy: function (u, v) {
      return alongX ? [u, v] : [v, u];
    },
    //the side of a lot a road is on, -x, -y, +x, +y as the plan has them:
    //towards -u, -v, +u, +v
    side: function (du, dv) {
      if (alongX) return du < 0 ? 0 : du > 0 ? 2 : dv < 0 ? 1 : 3;

      return dv < 0 ? 0 : dv > 0 ? 2 : du < 0 ? 1 : 3;
    },
  };
}

/**
 * Lays a road from u, v a tile at a time along du, dv - n tiles, or to the
 * edge of the window, or the water, whichever comes first.
 *
 * @returns {number} how many tiles it laid
 */
function lay(plan, f, u, v, du, dv, n, material, level) {
  for (var i = 0; i < n; i++, u += du, v += dv) {
    var t = f.xy(u, v);

    if (!plan.inside(t[0], t[1]) || plan.at(t[0], t[1]) === WATER) return i;

    plan.setRoad(t[0], t[1], material(u, v), level);
  }

  return n;
}

/**
 * A block of the town's middle, between lanes: tiles u0..u1, v0..v1 of it,
 * taking both in.
 */
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

/**
 * Lays the small town's roads out on the plan, one of the LAYOUTS.
 *
 * @returns {Object} how: {layout, frame, length, green}
 */
export function layVillage(plan, random) {
  var f = frameOf(plan),
    u0 = f.u0,
    v0 = f.v0,
    layout = random.weighted(LAYOUTS),
    //the road through it: asphalt, or an old gravel road - cobbled in the
    //middle of town either way, where the town houses and the shops are
    main = random.chance(0.55) ? "asphalt" : "gravel",
    //how far along its roads the town goes from its middle
    length = Math.round(Math.max(plan.rx, plan.ry) * 0.85),
    out = { layout: layout, frame: f, length: length, green: null };

  plan.lobes = null;

  //what a road is laid in where it is: the town's middle cobbled, unless
  //the road through it is asphalt; gravel or asphalt out of it
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

  //the road through it, both ways out of its middle - parted round the
  //green for a green village
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

  //and the second road: across it, both ways or one
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

  //a lane behind the houses round a block or two of the town's middle
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
    //round a corner of where the two roads meet - the tee's own side of it
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

//the centre of the town, where its square goes: the tiles beside the road
//through it, a square w along it and d deep, on side `towards` of it (-1,
//1 across) - the corner nearest u0 as near as it goes
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

    //on the road: the row next to it is all road
    for (du = 0; du < w && ok; du++) {
      var r = f.xy(ua + du, f.v0);

      if (!plan.isRoad(r[0], r[1])) ok = false;
    }

    if (ok) return { u: ua, cells: cells };
  }

  return null;
}

/**
 * The town's own buildings in its middle: the square by the road - or on
 * the green - the church beside it, the town hall facing it across the road
 * now and then, a market.
 *
 * @returns {{townHall: Object|null, church: Object|null, square: number[]}}
 */
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

  //one of kind facing the road along u on line `road`, on side `towards`
  //of it (-1, 1 across), from lo to hi along it
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
      //the green's long sides, a road along each
      lo = f.alongX ? g.x0 : g.y0,
      hi = f.alongX ? g.x1 : g.y1,
      vLo = f.alongX ? g.y0 : g.x0,
      vHi = (f.alongX ? g.y1 : g.x1) - 1;

    //the church on the green, facing the road along one side of it, as near
    //its middle as it goes
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

    //and the square facing the road along the other
    for (var u = u0 - 1; u <= u0 + 1; u++)
      for (var dv = 0; dv < 2; dv++) {
        var t = f.xy(u, vHi - dv);

        if (plan.free(t[0], t[1], 1, 1))
          plan.build(squareCode, t[0], t[1], 1, 1, 0, { zone: "square" });
      }

    built.square = f.xy(u0, vHi);

    //and the rest of it a park, its pond and its paths
    parkUp(plan, random, freeCells(plan, g));

    //the town hall facing the green across the road, now and then
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

  //the square by the road, on whichever side it fits - away from the block
  //behind the street, if there is one
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

    //the church beside it, facing the road too
    built.church =
      face("church", [[1, 2]], v0, towards, spot.u + w, spot.u + w + 4) ||
      face("church", [[1, 2]], v0, towards, spot.u - 4, spot.u);
  }

  //the town hall across the road from it, now and then - a small town has
  //one once it is a town
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

  //and a market by it
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

/**
 * Every straight stretch of road of the plan, along x and along y: each
 * {along, at, from, to} - tiles from..to on line `at`.
 */
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

/**
 * Builds the small town up: its middle, its blocks, its houses along its
 * roads, the farms beyond.
 *
 * @returns {{townHall: Object|null, church: Object|null, at: number[]}}
 */
export function buildVillage(plan, random, how) {
  var built = centre(plan, random, how),
    length = how.length;

  //the blocks behind the street, the town's middle
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

  //along the roads, both sides of every stretch of them: its middle first,
  //then out of it as far as the town goes
  var runs = runsOf(plan),
    far = function (x, y) {
      return Math.max(Math.abs(x - plan.cx), Math.abs(y - plan.cy));
    };

  [
    ["centre", 0, CENTRE + 1, { zone: "centre", parks: 0.04 }],
    [
      "village",
      CENTRE + 2,
      length,
      { zone: "village", parks: 0.03, gaps: 0.3 },
    ],
  ].forEach(function (part) {
    runs.forEach(function (run) {
      [-1, 1].forEach(function (across) {
        var s = run.alongX ? (across < 0 ? 3 : 1) : across < 0 ? 2 : 0,
          edge = run.at + across,
          from = -1;

        //the stretch of it in this part of the town, a strip at a time
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
