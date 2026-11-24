/**
 * Streets of a city: main roads, recursive block subdivision (an arterial
 * grid first for Peepsopolis), boulevards, roundabouts, the square.
 * See isometrica/.claude/skills/citygen/layouts.md (city, Peepsopolis) and engine.md (roads).
 */
import { ROAD, WATER, KEPT, SIDES } from "./plan";

//largest block (short x long side, between streets) by reach
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

//Peepsopolis: grid lines every ~spacing tiles either side of the middle
function arterials(random, middle, extent, spacing) {
  var lines = [middle],
    at;

  for (at = middle + spacing; at < extent - 4; at += spacing)
    lines.push(at + random.int(-2, 2));
  for (at = middle - spacing; at > 3; at -= spacing)
    lines.push(at + random.int(-2, 2));

  return lines.sort(function (a, b) {
    return a - b;
  });
}

//each cut spans only its parent block: staggered T-junctions
function subdivide(plan, random, size) {
  var segments = [],
    blocks = [],
    cx = plan.cx,
    cy = plan.cy,
    xs = size && size.grid ? arterials(random, cx, plan.w, size.grid) : [cx],
    ys = size && size.grid ? arterials(random, cy, plan.h, size.grid) : [cy];

  segments.push({ along: "y", at: cx, from: 0, to: plan.h - 1, level: 0 });
  segments.push({ along: "x", at: cy, from: 0, to: plan.w - 1, level: 0 });

  xs.forEach(function (x) {
    if (x !== cx)
      segments.push({ along: "y", at: x, from: 0, to: plan.h - 1, level: 0 });
  });
  ys.forEach(function (y) {
    if (y !== cy)
      segments.push({ along: "x", at: y, from: 0, to: plan.w - 1, level: 0 });
  });

  function cut(b, level) {
    var bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;

    if (bw < 1 || bh < 1) return;

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

  var cells = [],
    i,
    j;

  for (j = 0; j <= ys.length; j++)
    for (i = 0; i <= xs.length; i++)
      cells.push({
        x0: i === 0 ? 0 : xs[i - 1] + 1,
        x1: i === xs.length ? plan.w : xs[i],
        y0: j === 0 ? 0 : ys[j - 1] + 1,
        y1: j === ys.length ? plan.h : ys[j],
      });

  var park = null;

  if (size && size.grid) {
    var best = Infinity;

    cells.forEach(function (c) {
      var r = plan.reach((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2),
        off = Math.abs(r - 0.42) + random.range(0, 0.08);

      if (c.x1 - c.x0 < 8 || c.y1 - c.y0 < 8 || off >= best) return;

      best = off;
      park = c;
    });
  }

  cells.forEach(function (c) {
    if (c === park) {
      c.park = true;
      blocks.push(c);
    } else cut(c, 1);
  });

  return { segments: segments, blocks: blocks };
}

function tilesOf(seg) {
  var out = [];

  for (var i = seg.from; i <= seg.to; i++)
    out.push(seg.along === "x" ? [i, seg.at] : [seg.at, i]);

  return out;
}

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

function byTown(plan, x, y) {
  for (var dy = -1; dy <= 1; dy++)
    for (var dx = -1; dx <= 1; dx++) {
      if (!plan.inside(x + dx, y + dy)) continue;

      var id = plan.blockOf[plan.index(x + dx, y + dy)];

      if (id >= 0 && plan.blocks[id].urban) return true;
    }

  return false;
}

function materialFor(plan, x, y, level) {
  var reach = plan.reach(x, y);

  if (level === 0) return "asphalt";
  if (reach < DISTRICTS[0].upTo) return "asphalt";
  if (level === 1 && reach < 0.8) return "asphalt";
  if (byTown(plan, x, y)) return "cobble";

  return "gravel";
}

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

export function layStreets(plan, random, size) {
  plan.lobes = [
    { n: 2, amp: random.range(0.04, 0.12), phase: random.range(0, 6.3) },
    { n: 3, amp: random.range(0.03, 0.09), phase: random.range(0, 6.3) },
    { n: 5, amp: random.range(0.01, 0.05), phase: random.range(0, 6.3) },
  ];

  var cut = subdivide(plan, random, size),
    segments = cut.segments;

  plan.blocks = cut.blocks;
  plan.blocks.forEach(function (b, id) {
    b.id = id;

    for (var y = b.y0; y < b.y1; y++)
      for (var x = b.x0; x < b.x1; x++) plan.blockOf[plan.index(x, y)] = id;

    sizeUp(plan, b);
  });

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

  segments.slice(0, 2).forEach(function (seg) {
    var middle = seg.along === "x" ? plan.cx : plan.cy;

    countryRoad(plan, seg, middle, 1);
    countryRoad(plan, seg, middle, -1);
  });

  farmLanes(plan, random, segments);
  keepJoined(plan);

  return { segments: segments };
}

function farmLanes(plan, random, segments) {
  segments.forEach(function (seg) {
    if (seg.level === 0 || seg.level > 3) return;

    var tiles = tilesOf(seg),
      on = tiles.map(function (t) {
        return plan.isRoad(t[0], t[1]);
      });

    if (on.indexOf(true) === -1) return;

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
        if (plan.isRoad(t[0], t[1])) break;

        plan.setRoad(t[0], t[1], "gravel", 9);
      }
    });
  });
}

//drops roads not joined to the road nearest the middle, and blocks left
//with none round them
export function keepJoined(plan) {
  var seen = new Uint8Array(plan.w * plan.h),
    queue = [],
    k;

  var start = null,
    nearest = Infinity;

  for (k in plan.roads) {
    var r = plan.roads[k],
      d = Math.abs(r.x - plan.cx) + Math.abs(r.y - plan.cy);

    if (d < nearest) {
      nearest = d;
      start = r;
    }
  }

  if (start !== null) {
    queue.push([start.x, start.y]);
    seen[plan.index(start.x, start.y)] = 1;
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

//one-way pair with a park median, crossed only at streets (engine.md:
//why the median, which way each goes)
export function boulevard(plan, random, axis, opts) {
  opts = opts || {};

  var alongX = axis !== "y",
    v0 = alongX ? plan.cy : plan.cx,
    reachOut =
      opts.reachOut !== undefined ? opts.reachOut : 0.3 + random.range(0, 0.12),
    reachIn = opts.reachIn || 0,
    us = opts.start !== undefined ? opts.start : alongX ? plan.cx : plan.cy,
    ue = us,
    median = [],
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

  function ok(u) {
    var t = xy(u, v0),
      reach = plan.reach(t[0], t[1]);

    if (reach >= reachOut || reach < reachIn || road(u, v0) === null)
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

  function ok2(u) {
    return (
      road(u, v0) !== null &&
      at(u, v0 + 2) !== WATER &&
      fits(u, v0 + 2) &&
      [0, 1, 2].every(function (dv) {
        var r = road(u, v0 + dv);

        return r === null || r.way === -1;
      })
    );
  }

  if (!ok(us)) return null;

  while (ok(us - 1)) us--;
  while (ok(ue + 1)) ue++;

  if (road(us - 1, v0 + 1) !== null && ok2(us - 1)) us--;
  if (road(ue + 1, v0 + 1) !== null && ok2(ue + 1)) ue++;

  if (ue - us < 10) return null;

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

export function sideOf(plan, x0, y0, x1, y1) {
  var alongY = plan.boulevard && plan.boulevard.axis === "y",
    v0 = alongY ? plan.cx : plan.cy,
    lo = alongY ? x0 : y0,
    hi = alongY ? x1 : y1;

  return hi < v0 ? -1 : lo > v0 ? 1 : 0;
}

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

//ring tiles round a junction and their ways, as Peepstown's roundabout
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

    for (var s = 0; s < 4; s++) {
      var nx = rx + SIDES[s][0],
        ny = ry + SIDES[s][1];

      if (Math.abs(nx - x) <= 1 && Math.abs(ny - y) <= 1) continue;
      if (!plan.isRoad(nx, ny)) continue;
      if (corner) return false;
      if (nx - rx !== RING[i][0] || ny - ry !== RING[i][1]) return false;
    }

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

  plan.clearRoad(x, y);
  plan.what[plan.index(x, y)] = KEPT;
}

export function pickSquare(plan, random) {
  var best = null,
    bestScore = -Infinity;

  plan.blocks.forEach(function (b) {
    if (!b.urban || b.good < 1) return;

    var bw = b.x1 - b.x0,
      bh = b.y1 - b.y0;

    if (bw < 3 || bh < 3 || bw * bh > 42) return;

    var dx = Math.max(b.x0 - plan.cx, plan.cx - (b.x1 - 1), 0),
      dy = Math.max(b.y0 - plan.cy, plan.cy - (b.y1 - 1), 0),
      score = -(dx + dy) * 2 - Math.abs(bw * bh - 25) * 0.1;

    if (sideOf(plan, b.x0, b.y0, b.x1 - 1, b.y1 - 1) > 0) score -= 3;

    score += random.range(0, 1.5);

    if (score > bestScore) {
      bestScore = score;
      best = b;
    }
  });

  return best;
}
