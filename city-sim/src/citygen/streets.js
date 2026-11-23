/**
 * A town's streets, laid out the way a town grows when it is planned at all:
 * two main roads through its middle - the old ways in and out of it, going
 * on into the country to wherever they lead - and the land between them cut
 * into blocks by streets, again and again, each block cut across its longer
 * side, a little off its middle, till it is the size a block is where it
 * stands: small downtown, where the land is dear, longer out in the
 * suburbs, big fields in the country (recursive subdivision, the way
 * Parish and Mueller's city generator lays its lots out, and most others
 * since). Each street only runs as far as the block it cuts, so they meet
 * the street beyond it end on, and the cross streets of two blocks side by
 * side do not line up: T-junctions, staggered, the way real towns have
 * them - and the traffic too, a junction of three taken turn about rather
 * than a crossroads of four.
 *
 * Then what the town is: the blocks inside its outline - round its middle,
 * reaching further one way than another - on dry land it can build on, and
 * the streets round them; the main roads on out into the country, lanes off
 * them to the farms. And what a town of any size has: a main street down
 * its middle, divided - a one-way road each way, a boulevard - a roundabout
 * where a main road comes into town, a square at its heart.
 *
 * No street runs any way but along x or along y: the world's roads are laid
 * a tile at a time, on its grid.
 */
import { ROAD, WATER, KEPT, SIDES } from "./plan";

//what a block is cut down to, by how far out it is (Plan#reach): its
//shorter side at most `short` tiles across, its longer `long` - between the
//streets round it, which take a tile each. Six across is two rows of lots
//three deep, back to back; four, two of two
export var DISTRICTS = [
  { name: "core", upTo: 0.34, short: 6, long: 9, least: 4 },
  { name: "inner", upTo: 0.64, short: 6, long: 12, least: 4 },
  { name: "suburb", upTo: 0.98, short: 6, long: 15, least: 4 },
  { name: "edge", upTo: 1.3, short: 7, long: 20, least: 4 },
  { name: "rural", upTo: Infinity, short: 40, long: 60, least: 10 },
];

export function districtOf(reach) {
  for (var i = 0; i < DISTRICTS.length; i++)
    if (reach < DISTRICTS[i].upTo) return DISTRICTS[i];

  return DISTRICTS[DISTRICTS.length - 1];
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/**
 * Where across a block of extent tiles to cut it - how many tiles of it go
 * to the first part, the street on the next - or -1 for nowhere: both parts
 * at least `least` across. Cutting its longer side, a little off the middle;
 * cutting the shorter, so that both parts are as deep as two rows of lots
 * back to back want, five or six, if they can be.
 */
function cutAt(random, extent, cuttingLong, d) {
  var least = d.least,
    hi = extent - 1 - least,
    good = [],
    p;

  if (hi < least) return -1;

  if (!cuttingLong) {
    for (p = least; p <= hi; p++)
      if (p <= d.short && extent - 1 - p <= d.short)
        good.push(p, p, p >= 5 ? p : -1, extent - 1 - p >= 5 ? p : -1);

    good = good.filter(function (q) {
      return q >= 0;
    });

    if (good.length > 0) return random.pick(good);
  }

  p = Math.round((extent - 1) / 2 + random.range(-0.18, 0.18) * extent);

  return clamp(p, least, hi);
}

/**
 * Cuts the window into blocks, the main roads through the middle first.
 *
 * @returns {{segments: Object[], blocks: Object[]}} the streets, each along x
 *          or y on one line of tiles from one tile to another, and how deep
 *          in the cutting it was cut (level - 0 for the main roads); and the
 *          blocks between them, x0, y0 to x1, y1 not taking in the last
 */
function subdivide(plan, random) {
  var segments = [],
    blocks = [],
    cx = plan.cx,
    cy = plan.cy;

  segments.push({ along: "y", at: cx, from: 0, to: plan.h - 1, level: 0 });
  segments.push({ along: "x", at: cy, from: 0, to: plan.w - 1, level: 0 });

  function cut(b, level) {
    var bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;

    if (bw < 1 || bh < 1) return;

    //cut down to what the part of it nearest the middle of the town wants
    var d = districtOf(
        plan.reach(clamp(cx, b.x0, b.x1 - 1), clamp(cy, b.y0, b.y1 - 1)),
      ),
      long = Math.max(bw, bh),
      short = Math.min(bw, bh);

    if (long <= d.long && short <= d.short) {
      blocks.push(b);
      return;
    }

    var cuttingLong = long > d.long,
      //which way it is cut: across x, a street along y
      acrossX = cuttingLong ? bw >= bh : bw < bh,
      p = cutAt(random, acrossX ? bw : bh, cuttingLong, d);

    if (p < 0) {
      blocks.push(b);
      return;
    }

    if (acrossX) {
      segments.push({
        along: "y",
        at: b.x0 + p,
        from: b.y0,
        to: b.y1 - 1,
        level: level,
      });
      cut({ x0: b.x0, y0: b.y0, x1: b.x0 + p, y1: b.y1 }, level + 1);
      cut({ x0: b.x0 + p + 1, y0: b.y0, x1: b.x1, y1: b.y1 }, level + 1);
    } else {
      segments.push({
        along: "x",
        at: b.y0 + p,
        from: b.x0,
        to: b.x1 - 1,
        level: level,
      });
      cut({ x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y0 + p }, level + 1);
      cut({ x0: b.x0, y0: b.y0 + p + 1, x1: b.x1, y1: b.y1 }, level + 1);
    }
  }

  cut({ x0: 0, y0: 0, x1: cx, y1: cy }, 1);
  cut({ x0: cx + 1, y0: 0, x1: plan.w, y1: cy }, 1);
  cut({ x0: 0, y0: cy + 1, x1: cx, y1: plan.h }, 1);
  cut({ x0: cx + 1, y0: cy + 1, x1: plan.w, y1: plan.h }, 1);

  return { segments: segments, blocks: blocks };
}

//the tiles of a street, in order along it
function tilesOf(seg) {
  var out = [];

  for (var i = seg.from; i <= seg.to; i++)
    out.push(seg.along === "x" ? [i, seg.at] : [seg.at, i]);

  return out;
}

/**
 * What of a block the town is: inside its outline, and dry land it can build
 * on - most of it.
 */
function sizeUp(plan, b) {
  var cells = 0,
    good = 0,
    x,
    y;

  for (y = b.y0; y < b.y1; y++)
    for (x = b.x0; x < b.x1; x++) {
      cells++;
      if (
        plan.at(x, y) !== WATER &&
        plan.ground.fits(plan.wx(x), plan.wy(y), 1, 1)
      )
        good++;
    }

  b.cells = cells;
  b.good = cells > 0 ? good / cells : 0;
  b.reach = plan.reach((b.x0 + b.x1 - 1) / 2, (b.y0 + b.y1 - 1) / 2);
  b.district = districtOf(b.reach).name;
  b.urban = b.reach <= 1 && b.good >= 0.55 && cells >= 6;
}

//whether a tile next to x, y, corners too, is the ground of a block of the
//town
function byTown(plan, x, y) {
  for (var dy = -1; dy <= 1; dy++)
    for (var dx = -1; dx <= 1; dx++) {
      if (!plan.inside(x + dx, y + dy)) continue;

      var id = plan.blockOf[plan.index(x + dx, y + dy)];

      if (id >= 0 && plan.blocks[id].urban) return true;
    }

  return false;
}

//what a street is laid in: the main roads asphalt, and downtown; cobbles in
//town; gravel out in the country
function materialFor(plan, x, y, level) {
  var reach = plan.reach(x, y);

  if (level === 0) return "asphalt";
  if (reach < DISTRICTS[0].upTo) return "asphalt";
  if (level === 1 && reach < 0.8) return "asphalt";
  if (byTown(plan, x, y)) return "cobble";

  return "gravel";
}

/**
 * The main road from the middle of the town out to the edge of the window
 * one way along a segment, the country road it goes on as - as far as the
 * land goes: it stops at the water.
 */
function countryRoad(plan, seg, fromMiddle, dir) {
  var x = seg.along === "x" ? fromMiddle : seg.at,
    y = seg.along === "x" ? seg.at : fromMiddle;

  while (plan.inside(x, y)) {
    if (plan.at(x, y) === WATER) break;

    plan.setRoad(x, y, "asphalt", 0);

    if (seg.along === "x") x += dir;
    else y += dir;
  }
}

/**
 * Lays the streets out on the plan, and marks the town's blocks.
 *
 * @returns {Object} what was laid: {segments}
 */
export function layStreets(plan, random) {
  //the town's outline: round, but bulging out one way and pulled in another
  plan.lobes = [
    { n: 2, amp: random.range(0.04, 0.12), phase: random.range(0, 6.3) },
    { n: 3, amp: random.range(0.03, 0.09), phase: random.range(0, 6.3) },
    { n: 5, amp: random.range(0.01, 0.05), phase: random.range(0, 6.3) },
  ];

  var cut = subdivide(plan, random),
    segments = cut.segments;

  plan.blocks = cut.blocks;
  plan.blocks.forEach(function (b, id) {
    b.id = id;

    for (var y = b.y0; y < b.y1; y++)
      for (var x = b.x0; x < b.x1; x++) plan.blockOf[plan.index(x, y)] = id;

    sizeUp(plan, b);
  });

  //the streets round the town's blocks
  segments.forEach(function (seg) {
    tilesOf(seg).forEach(function (t) {
      if (plan.at(t[0], t[1]) === WATER || !byTown(plan, t[0], t[1])) return;

      plan.setRoad(
        t[0],
        t[1],
        materialFor(plan, t[0], t[1], seg.level),
        seg.level,
      );
    });
  });

  //the main roads on out of town, as far as the land goes
  segments.slice(0, 2).forEach(function (seg) {
    var middle = seg.along === "x" ? plan.cx : plan.cy;

    countryRoad(plan, seg, middle, 1);
    countryRoad(plan, seg, middle, -1);
  });

  farmLanes(plan, random, segments);
  keepJoined(plan);

  return { segments: segments };
}

/**
 * Lanes off the town into the country, to the farms - the streets of the
 * first cuts, on past the town's last block, some of them, a way.
 */
function farmLanes(plan, random, segments) {
  segments.forEach(function (seg) {
    if (seg.level === 0 || seg.level > 3) return;

    var tiles = tilesOf(seg),
      on = tiles.map(function (t) {
        return plan.isRoad(t[0], t[1]);
      });

    if (on.indexOf(true) === -1) return;

    //from either end of what is laid of it, on out
    [
      [on.indexOf(true), -1],
      [on.lastIndexOf(true), 1],
    ].forEach(function (end) {
      if (!random.chance(0.45)) return;

      var length = random.int(5, 14);

      for (
        var i = end[0] + end[1], n = 0;
        i >= 0 && i < tiles.length;
        i += end[1]
      ) {
        var t = tiles[i];

        if (n++ >= length || plan.at(t[0], t[1]) === WATER) break;
        //into another road: it joins it there
        if (plan.isRoad(t[0], t[1])) break;

        plan.setRoad(t[0], t[1], "gravel", 9);
      }
    });
  });
}

/**
 * Only the roads joined up to the middle of the town are kept - a street cut
 * off from it by the water is not one of its own - and a block with none of
 * them round it is no part of it either.
 */
export function keepJoined(plan) {
  var seen = new Uint8Array(plan.w * plan.h),
    queue = [],
    k;

  if (plan.isRoad(plan.cx, plan.cy)) {
    queue.push([plan.cx, plan.cy]);
    seen[plan.index(plan.cx, plan.cy)] = 1;
  }

  while (queue.length > 0) {
    var t = queue.pop();

    for (var s = 0; s < 4; s++) {
      var x = t[0] + SIDES[s][0],
        y = t[1] + SIDES[s][1];

      if (!plan.isRoad(x, y) || seen[plan.index(x, y)]) continue;

      seen[plan.index(x, y)] = 1;
      queue.push([x, y]);
    }
  }

  for (k in plan.roads)
    if (!seen[k]) plan.clearRoad(plan.roads[k].x, plan.roads[k].y);

  plan.blocks.forEach(function (b) {
    if (!b.urban) return;

    for (var x = b.x0 - 1; x <= b.x1; x++)
      for (var y = b.y0 - 1; y <= b.y1; y++)
        if (
          (x === b.x0 - 1 || x === b.x1 || y === b.y0 - 1 || y === b.y1) &&
          plan.isRoad(x, y)
        )
          return;

    b.urban = false;
  });
}

/**
 * A stretch of one of the main roads through downtown divided: a boulevard.
 * The road there goes one way, and a second road two tiles beside it, +y of
 * one along x or +x of one along y, the other way - the traffic keeping to
 * the right: along x, -x on the road and +x on the one beside it; along y,
 * +y on the road and -y beside it - with a strip of park between them,
 * crossed only where a street comes into it from either side, and at its
 * ends, where it is the main road again, both ways. Two one-way roads side
 * by side with nothing between would be a junction every tile of the way.
 *
 * @param axis {string} "x" or "y": which of the main roads
 * @returns {{axis: string, at: number, from: number, to: number,
 *          median: number[][]}|null} where it runs - the main road's line,
 *          and from and to along it - and the tiles of its middle strip,
 *          each [x, y]
 */
export function boulevard(plan, random, axis) {
  //u along it, v across: the main road on v0, the strip on v0 + 1 and the
  //road beside it on v0 + 2
  var alongX = axis !== "y",
    v0 = alongX ? plan.cy : plan.cx,
    reachOut = 0.3 + random.range(0, 0.12),
    us = alongX ? plan.cx : plan.cy,
    ue = us,
    median = [],
    //the ways the two go: on the main road, and on the one beside it
    ways = alongX ? [0, 2] : [3, 1],
    u;

  function xy(u, v) {
    return alongX ? [u, v] : [v, u];
  }

  function at(u, v) {
    var t = xy(u, v);

    return plan.at(t[0], t[1]);
  }

  function road(u, v) {
    var t = xy(u, v);

    return plan.road(t[0], t[1]);
  }

  function fits(u, v) {
    var t = xy(u, v);

    return plan.ground.fits(plan.wx(t[0]), plan.wy(t[1]), 1, 1);
  }

  //as far either way as it is downtown, and dry land under it all
  function ok(u) {
    var t = xy(u, v0);

    if (plan.reach(t[0], t[1]) >= reachOut || road(u, v0) === null)
      return false;

    for (var dv = 1; dv <= 2; dv++)
      if (
        at(u, v0 + dv) === WATER ||
        at(u, v0 + dv) === KEPT ||
        (road(u, v0 + dv) !== null && road(u, v0 + dv).way !== -1) ||
        !fits(u, v0 + dv)
      )
        return false;

    return true;
  }

  //just past an end, and a street comes in there from the far side: it
  //ends there, on it, rather than leave the two side by side
  function ok2(u) {
    return road(u, v0) !== null && at(u, v0 + 2) !== WATER && fits(u, v0 + 2);
  }

  while (ok(us - 1)) us--;
  while (ok(ue + 1)) ue++;

  if (road(us - 1, v0 + 1) !== null && ok2(us - 1)) us--;
  if (road(ue + 1, v0 + 1) !== null && ok2(ue + 1)) ue++;

  if (ue - us < 10) return null;

  //where it is crossed: its ends, and wherever a street comes into it -
  //onto the main road from its other side, or from beyond the road beside
  //it, onto what was the first row of the blocks there
  var crossed = [];

  for (u = us; u <= ue; u++)
    crossed[u] =
      u === us ||
      u === ue ||
      road(u, v0 - 1) !== null ||
      road(u, v0 + 1) !== null;

  for (u = us; u <= ue; u++) {
    var main = xy(u, v0),
      strip = xy(u, v0 + 1),
      beside = xy(u, v0 + 2);

    plan.setRoad(beside[0], beside[1], "asphalt", 0);
    plan.roads[plan.index(beside[0], beside[1])].way = ways[1];
    plan.blockOf[plan.index(beside[0], beside[1])] = -1;
    plan.blockOf[plan.index(strip[0], strip[1])] = -1;

    if (crossed[u]) plan.setRoad(strip[0], strip[1], "asphalt", 0);
    else {
      plan.clearRoad(strip[0], strip[1]);
      plan.what[plan.index(strip[0], strip[1])] = KEPT;
      median.push(strip);
    }

    if (u > us && u < ue)
      plan.roads[plan.index(main[0], main[1])].way = ways[0];
  }

  return { axis: alongX ? "x" : "y", at: v0, from: us, to: ue, median: median };
}

/**
 * Which side of the boulevard - or of the main road along x, with none -
 * tiles x0..x1, y0..y1 are on: -1 the side away from the road beside it,
 * 1 its side, 0 across it.
 */
export function sideOf(plan, x0, y0, x1, y1) {
  var alongY = plan.boulevard && plan.boulevard.axis === "y",
    v0 = alongY ? plan.cx : plan.cy,
    lo = alongY ? x0 : y0,
    hi = alongY ? x1 : y1;

  return hi < v0 ? -1 : lo > v0 ? 1 : 0;
}

/**
 * A roundabout where a main road comes into town: a ring of one-way road
 * round a junction of it - eight tiles round, a small one, round a little
 * park - going round the way the game's own does (data/initialcity): +x
 * along its -y side, +y down its +x side, -x along its +y side and -y up
 * its -x side.
 *
 * @returns {Object[]} the islands in the middle of each, {x, y}
 */
export function roundabouts(plan, random, most) {
  var found = [],
    candidates = [];

  for (var k in plan.roads) {
    var r = plan.roads[k];

    if (r.level !== 0 || r.way !== -1) continue;

    var reach = plan.reach(r.x, r.y);

    if (reach < 0.42 || reach > 1.02) continue;
    if (plan.roadSides(r.x, r.y).length < 3) continue;
    if (!ringFits(plan, r.x, r.y)) continue;

    candidates.push(r);
  }

  random.shuffle(candidates);

  for (var i = 0; i < candidates.length && found.length < most; i++) {
    var c = candidates[i];

    //one a way out of town at most, and well apart
    if (
      found.some(function (f) {
        return Math.abs(f.x - c.x) + Math.abs(f.y - c.y) < 16;
      })
    )
      continue;

    if (!ringFits(plan, c.x, c.y)) continue;

    ring(plan, c.x, c.y);
    found.push({ x: c.x, y: c.y });
  }

  return found;
}

//the ring round x, y, from its -x, -y corner round, and the way each of
//its tiles goes: +x along the top, +y down the right, -x along the bottom,
//-y up the left - each corner the way it is left by
var RING = [
  [-1, -1, 2],
  [0, -1, 2],
  [1, -1, 3],
  [1, 0, 3],
  [1, 1, 0],
  [0, 1, 0],
  [-1, 1, 1],
  [-1, 0, 1],
];

function ringFits(plan, x, y) {
  for (var i = 0; i < RING.length; i++) {
    var rx = x + RING[i][0],
      ry = y + RING[i][1],
      corner = RING[i][0] !== 0 && RING[i][1] !== 0,
      what = plan.at(rx, ry);

    if (!plan.inside(rx, ry) || what === WATER || what === KEPT) return false;
    if (corner && what === ROAD) return false;
    if (!plan.ground.fits(plan.wx(rx), plan.wy(ry), 1, 1)) return false;

    //nothing else comes onto the ring but the roads into it, at the middle
    //of each side
    for (var s = 0; s < 4; s++) {
      var nx = rx + SIDES[s][0],
        ny = ry + SIDES[s][1];

      if (Math.abs(nx - x) <= 1 && Math.abs(ny - y) <= 1) continue;
      if (!plan.isRoad(nx, ny)) continue;
      if (corner) return false;
      //a middle tile: only straight on out
      if (nx - rx !== RING[i][0] || ny - ry !== RING[i][1]) return false;
    }

    //and its ground no block's that is too small to lose a corner
    var id = plan.blockOf[plan.index(rx, ry)];

    if (corner && id >= 0 && plan.blocks[id].cells < 12) return false;
  }

  return true;
}

function ring(plan, x, y) {
  RING.forEach(function (t) {
    var rx = x + t[0],
      ry = y + t[1];

    plan.setRoad(rx, ry, "asphalt", 0);
    plan.roads[plan.index(rx, ry)].way = t[2];
    plan.roads[plan.index(rx, ry)].ring = true;
    plan.blockOf[plan.index(rx, ry)] = -1;
  });

  //the junction is the island now
  plan.clearRoad(x, y);
  plan.what[plan.index(x, y)] = KEPT;
}

/**
 * The town's square: a block next to the middle of the town, where its main
 * roads cross - one the boulevard does not run along, if it can - not too
 * big, all of it dry land.
 *
 * @returns {Object|null} the block
 */
export function pickSquare(plan, random) {
  var best = null,
    bestScore = -Infinity;

  plan.blocks.forEach(function (b) {
    if (!b.urban || b.good < 1) return;

    var bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;

    if (bw < 3 || bh < 3 || bw * bh > 42) return;

    //how far its nearest corner is from where the main roads cross
    var dx = Math.max(b.x0 - plan.cx, plan.cx - (b.x1 - 1), 0),
      dy = Math.max(b.y0 - plan.cy, plan.cy - (b.y1 - 1), 0),
      score = -(dx + dy) * 2 - Math.abs(bw * bh - 25) * 0.1;

    //the boulevard's other road runs beside the main road: the side away
    //from it is quieter
    if (sideOf(plan, b.x0, b.y0, b.x1 - 1, b.y1 - 1) > 0) score -= 3;

    score += random.range(0, 1.5);

    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  });

  return best;
}
