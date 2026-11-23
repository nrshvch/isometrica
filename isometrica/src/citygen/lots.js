/**
 * Builds the blocks up: zones, palettes, strips of lots facing their streets,
 * civic buildings round the squares, farms. See .claude/skills/citygen/layouts.md.
 */
import { FREE, WATER } from "./plan";
import { sideOf } from "./streets";
import { codesOf, widthsOf, info } from "./catalogue";
import * as RoadRules from "../core/roadrules";

//rotation of a building whose street is on side s (engine.md: buildings)
var FACING = [1, 0, 3, 2];

//what each zone is built of; <zone>High along main roads
export var PALETTES = {
  core: { office: 3, flats: 3, store: 2, shop: 1 },
  coreHigh: { office: 3, store: 3, shop: 2, flats: 1.2 },
  oldtown: { oldtown: 6, house: 2, shop: 0.5 },
  inner: { flats: 4, house: 3, shop: 0.8, store: 0.3, office: 0.3 },
  innerHigh: { shop: 3, store: 1.5, flats: 3, office: 1 },
  suburb: { house: 6, villa: 1.2, flats: 0.5, shop: 0.25 },
  suburbHigh: { shop: 1.5, store: 0.6, house: 4, flats: 1 },
  edge: { house: 3, villa: 2.5, village: 1.2 },
  edgeHigh: { house: 3, villa: 1, shop: 0.6, village: 0.8 },
};

var PARK_CHANCE = { inner: 0.05, suburb: 0.06, edge: 0.05 };

//builds if free, it fits, and its front has a road of what it needs
function tryPlace(plan, code, x, y, w, d, s, extra) {
  var ex = s === 0 || s === 2 ? d : w,
    ey = s === 0 || s === 2 ? w : d,
    want = info(code);

  if (!plan.free(x, y, ex, ey)) return null;

  if (want.road !== null && !fronted(plan, x, y, ex, ey, s, want.road))
    return null;

  return plan.build(code, x, y, ex, ey, FACING[s], extra);
}

function fronted(plan, x, y, ex, ey, s, least) {
  var i, r;

  for (i = 0; i < (s === 0 || s === 2 ? ey : ex); i++) {
    r =
      s === 0
        ? plan.road(x - 1, y + i)
        : s === 1
          ? plan.road(x + i, y - 1)
          : s === 2
            ? plan.road(x + ex, y + i)
            : plan.road(x + i, y + ey);

    if (r !== null && RoadRules.serves(r.material, least)) return true;
  }

  return false;
}

function lotCorner(s, edge, along, d) {
  if (s === 1) return [along, edge];
  if (s === 3) return [along, edge - d + 1];
  if (s === 0) return [edge, along];

  return [edge - d + 1, along];
}

//a strip a street's kind at a time; opts.gaps for village plots
export function fillStrip(plan, random, strip, palette, opts) {
  var primary = random.weighted(palette),
    primaryW = null,
    pos = strip.from,
    built = [];

  while (pos < strip.to) {
    var room = strip.to - pos,
      kinds = [],
      placed = null,
      k;

    if (opts.parks && random.chance(opts.parks)) kinds.push("park");

    if (random.chance(0.75)) kinds.push(primary);

    var rest = Object.assign({}, palette);

    while (Object.keys(rest).length > 0) {
      k = random.weighted(rest);
      delete rest[k];
      if (kinds.indexOf(k) < 0) kinds.push(k);
    }

    for (var ki = 0; ki < kinds.length && placed === null; ki++) {
      var kind = kinds[ki];

      for (var d = strip.depth; d >= 1 && placed === null; d--) {
        if (d < strip.depth && d < 2 && kind !== "park" && kind !== "shop")
          continue;

        var widths = widthsOf(kind, d).filter(function (w) {
          return w <= room;
        });

        if (widths.length === 0) continue;

        random.shuffle(widths);

        if (kind === primary && primaryW !== null) {
          var at = widths.indexOf(primaryW);

          if (at > 0) widths.unshift(widths.splice(at, 1)[0]);
        }

        for (var wi = 0; wi < widths.length && placed === null; wi++) {
          var w = widths[wi],
            codes = codesOf(kind, w, d),
            corner = lotCorner(strip.s, strip.edge, pos, d),
            code = random.pick(codes);

          placed = tryPlace(plan, code, corner[0], corner[1], w, d, strip.s, {
            zone: opts.zone,
          });

          if (placed !== null) {
            if (kind === primary) primaryW = w;
            pos += w;
            built.push(placed);

            if (opts.gaps && random.chance(opts.gaps)) pos += random.int(1, 3);
          }
        }
      }
    }

    if (placed === null) pos++;
  }

  return built;
}

function sideRoad(plan, b, s) {
  var n = 0,
    roads = 0,
    level = 9,
    x,
    y;

  if (s === 1 || s === 3) {
    y = s === 1 ? b.y0 - 1 : b.y1;

    for (x = b.x0; x < b.x1; x++) {
      n++;
      if (plan.isRoad(x, y)) {
        roads++;
        level = Math.min(level, plan.road(x, y).level);
      }
    }
  } else {
    x = s === 0 ? b.x0 - 1 : b.x1;

    for (y = b.y0; y < b.y1; y++) {
      n++;
      if (plan.isRoad(x, y)) {
        roads++;
        level = Math.min(level, plan.road(x, y).level);
      }
    }
  }

  return { share: n > 0 ? roads / n : 0, level: level };
}

//two long sides, half the depth each (3 at most); ends where a middle
//is left
export function stripsOf(plan, b) {
  var bw = b.x1 - b.x0,
    bh = b.y1 - b.y0,
    roads = [0, 1, 2, 3].map(function (s) {
      return sideRoad(plan, b, s);
    }),
    has = roads.map(function (r) {
      return r.share >= 0.4;
    }),
    pairs = bw >= bh ? [1, 3, 0, 2] : [0, 2, 1, 3],
    a = pairs[0],
    c = pairs[1];

  if (!has[a] && !has[c]) {
    a = pairs[2];
    c = pairs[3];
  }

  var across = a === 1 || a === 3 ? bh : bw,
    da = 0,
    dc = 0;

  if (has[a] && has[c]) {
    da = Math.min(3, Math.ceil(across / 2));
    dc = Math.min(3, across - da);
  } else if (has[a]) da = Math.min(3, across);
  else if (has[c]) dc = Math.min(3, across);

  var strips = [];

  [
    [a, da],
    [c, dc],
  ].forEach(function (sd) {
    var s = sd[0],
      d = sd[1];

    if (d <= 0) return;

    strips.push({
      s: s,
      depth: d,
      edge: s === 1 ? b.y0 : s === 3 ? b.y1 - 1 : s === 0 ? b.x0 : b.x1 - 1,
      from: s === 1 || s === 3 ? b.x0 : b.y0,
      to: s === 1 || s === 3 ? b.x1 : b.y1,
      high: roads[s].level <= 1,
    });
  });

  var mid = across - da - dc;

  if (mid > 0)
    pairs
      .filter(function (s) {
        return s !== a && s !== c && has[s];
      })
      .forEach(function (s) {
        var lo = a === 0 || a === 1 ? da : dc;

        strips.push({
          s: s,
          depth: Math.min(3, a === 1 || a === 3 ? bw : bh),
          edge: s === 1 ? b.y0 : s === 3 ? b.y1 - 1 : s === 0 ? b.x0 : b.x1 - 1,
          from: (s === 1 || s === 3 ? b.x0 : b.y0) + lo,
          to: (s === 1 || s === 3 ? b.x0 : b.y0) + lo + mid,
          high: roads[s].level <= 1,
          end: true,
        });
      });

  return strips;
}

export function freeCells(plan, b) {
  var out = [];

  for (var y = b.y0; y < b.y1; y++)
    for (var x = b.x0; x < b.x1; x++)
      if (plan.at(x, y) === FREE) out.push([x, y]);

  return out;
}

export function parkUp(plan, random, cells, smallest) {
  var sizes = [
    [3, 3],
    [2, 3],
    [3, 2],
    [2, 2],
    [1, 3],
    [3, 1],
    [1, 2],
    [2, 1],
    [1, 1],
  ].filter(function (s) {
    return s[0] * s[1] >= (smallest || 1);
  });

  cells.forEach(function (c) {
    if (plan.at(c[0], c[1]) !== FREE) return;

    for (var i = 0; i < sizes.length; i++) {
      var ex = sizes[i][0],
        ey = sizes[i][1],
        turned = ex > ey,
        codes = codesOf("park", turned ? ey : ex, turned ? ex : ey);

      if (codes.length === 0 || !plan.free(c[0], c[1], ex, ey)) continue;

      plan.build(random.pick(codes), c[0], c[1], ex, ey, turned ? 1 : 0, {
        zone: "park",
      });
      return;
    }
  });
}

function nearWater(plan, x, y, most) {
  for (var r = 1; r <= most; r++)
    for (var dy = -r; dy <= r; dy++)
      for (var dx = -r; dx <= r; dx++)
        if (
          (Math.abs(dx) === r || Math.abs(dy) === r) &&
          plan.at(x + dx, y + dy) === WATER
        )
          return r;

  return Infinity;
}

//square, old town, parks, district squares, waterside, hills
function zone(plan, random) {
  var urban = plan.blocks.filter(function (b) {
      return b.urban;
    }),
    square = plan.square,
    heights = [];

  urban.forEach(function (b) {
    var cx = Math.round((b.x0 + b.x1 - 1) / 2),
      cy = Math.round((b.y0 + b.y1 - 1) / 2);

    b.height = plan.ground.height(plan.wx(cx), plan.wy(cy));
    b.waterside = nearWater(plan, cx, cy, Math.max(b.x1 - b.x0, b.y1 - b.y0));
    heights.push(b.height);
    b.zone = b.district;
  });

  heights.sort(function (a, b) {
    return a - b;
  });

  var median = heights[heights.length >> 1] || 0;

  urban.forEach(function (b) {
    b.hill = b.height >= median + 2;
  });

  if (square) square.zone = "square";

  urban.forEach(function (b) {
    if (b.park) b.zone = "park";
  });

  if (square) {
    var side = sideOf(plan, square.x0, square.y0, square.x1 - 1, square.y1 - 1);

    urban
      .filter(function (b) {
        return (
          b !== square &&
          b.reach < 0.45 &&
          sideOf(plan, b.x0, b.y0, b.x1 - 1, b.y1 - 1) === side
        );
      })
      .sort(function (a, b) {
        return gap(a, square) - gap(b, square);
      })
      .slice(0, random.int(2, 3))
      .forEach(function (b) {
        b.zone = "oldtown";
      });
  }

  var size = plan.size || {};

  plan.squares = square ? [square] : [];

  if (size.districts) {
    var quarters = {};

    urban
      .filter(function (b) {
        return (
          b.zone === b.district &&
          b.good >= 1 &&
          b.reach > 0.5 &&
          b.reach < 0.85 &&
          b.cells >= 9 &&
          b.cells <= 42
        );
      })
      .sort(function (a, b) {
        return Math.abs(a.reach - 0.65) - Math.abs(b.reach - 0.65);
      })
      .forEach(function (b) {
        var q =
          (b.x0 + b.x1 > 2 * plan.cx ? "e" : "w") +
          (b.y0 + b.y1 > 2 * plan.cy ? "s" : "n");

        if (quarters[q] || plan.squares.length > size.districts) return;

        if (
          plan.squares.some(function (o) {
            return gap(o, b) < 12;
          })
        )
          return;

        quarters[q] = b;
        b.zone = "square";
        plan.squares.push(b);

        var oldest = urban
          .filter(function (o) {
            return o.zone === o.district && gap(o, b) <= 1;
          })
          .sort(function (o1, o2) {
            return gap(o1, b) - gap(o2, b);
          })[0];

        if (oldest) oldest.zone = "oldtown";
      });
  }

  var parks = urban.filter(function (b) {
    return (
      b.zone === b.district &&
      b.reach > 0.25 &&
      b.reach < (size.parks ? 0.95 : 0.75) &&
      b.cells >= 16 &&
      b.cells <= 72
    );
  });

  parks.sort(function (a, b) {
    return (
      (a.waterside < 4 ? -10 : 0) +
      Math.abs(a.reach - 0.45) * 10 -
      ((b.waterside < 4 ? -10 : 0) + Math.abs(b.reach - 0.45) * 10)
    );
  });

  for (var n = 0; n < (size.parks || 1) && parks.length > 0; n++) {
    var park = parks.splice(random.int(0, Math.min(2, parks.length - 1)), 1)[0];

    park.zone = "park";
    parks = parks.filter(function (b) {
      return gap(b, park) > 6;
    });
  }

  return urban;
}

function gap(a, b) {
  var dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0),
    dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);

  return dx + dy;
}

function paletteFor(plan, b, strip) {
  var name = b.zone,
    own = (plan.size && plan.size.palettes) || {},
    palettes = Object.assign({}, PALETTES, own);

  if (strip.high && palettes[name + "High"]) name += "High";

  var palette = Object.assign({}, palettes[name] || palettes.suburb);

  if (b.zone === "suburb" || b.zone === "edge") {
    if (b.waterside <= 3) palette.villa = (palette.villa || 0) + 3;
    if (b.hill) palette.villa = (palette.villa || 0) + 2;
  }

  return palette;
}

export function placeFacing(plan, random, kind, shapes, s, edge, lo, hi) {
  for (var f = 0; f < shapes.length; f++) {
    var w = shapes[f][0],
      d = shapes[f][1],
      codes = codesOf(kind, w, d);

    if (codes.length === 0) continue;

    for (var along = lo; along + w <= hi; along++) {
      var corner = lotCorner(s, edge, along, d),
        placed = tryPlace(
          plan,
          random.pick(codes),
          corner[0],
          corner[1],
          w,
          d,
          s,
          {
            zone: "civic",
          },
        );

      if (placed !== null) return placed;
    }
  }

  return null;
}

function civic(plan, random) {
  var squares = plan.squares || (plan.square ? [plan.square] : []),
    built = {};

  squares.forEach(function (sq, i) {
    var mine = around(plan, random, sq, i === 0 ? MAIN : DISTRICT);

    if (i === 0) built = mine;
  });

  return built;
}

var MAIN = [
    [
      "townhall",
      [
        [2, 1],
        [1, 2],
      ],
    ],
    ["church", [[1, 2]]],
    [
      "market",
      [
        [2, 3],
        [2, 2],
        [3, 2],
        [1, 2],
        [2, 1],
      ],
    ],
  ],
  DISTRICT = MAIN.slice(1);

//civic buildings facing a square across its streets
function around(plan, random, sq, wants) {
  var built = {};

  freeCells(plan, sq).forEach(function (c) {
    if (plan.free(c[0], c[1], 1, 1))
      plan.build(codesOf("square", 1, 1)[0], c[0], c[1], 1, 1, 0, {
        zone: "square",
      });
  });

  var spots = [];

  [0, 1, 2, 3].forEach(function (s) {
    var x = s === 0 ? sq.x0 - 2 : s === 2 ? sq.x1 + 1 : (sq.x0 + sq.x1) >> 1,
      y = s === 1 ? sq.y0 - 2 : s === 3 ? sq.y1 + 1 : (sq.y0 + sq.y1) >> 1;

    if (!plan.inside(x, y)) return;

    var id = plan.blockOf[plan.index(x, y)];

    if (id < 0 || !plan.blocks[id].urban || plan.blocks[id] === sq) return;

    spots.push({ s: (s + 2) % 4, block: plan.blocks[id] });
  });

  random.shuffle(spots);

  wants.forEach(function (want) {
    for (var i = 0; i < spots.length; i++) {
      var b = spots[i].block,
        s = spots[i].s,
        lo =
          s === 1 || s === 3
            ? Math.max(b.x0, sq.x0 - 1)
            : Math.max(b.y0, sq.y0 - 1),
        hi =
          s === 1 || s === 3
            ? Math.min(b.x1, sq.x1 + 1)
            : Math.min(b.y1, sq.y1 + 1),
        edge = s === 1 ? b.y0 : s === 3 ? b.y1 - 1 : s === 0 ? b.x0 : b.x1 - 1,
        placed = placeFacing(plan, random, want[0], want[1], s, edge, lo, hi);

      if (placed !== null) {
        built[want[0]] = placed;
        spots.splice(i, 1);
        return;
      }
    }
  });

  return built;
}

export function buildUp(plan, random) {
  var urban = zone(plan, random),
    civics = civic(plan, random);

  (plan.islands || []).forEach(function (c) {
    plan.what[plan.index(c.x, c.y)] = FREE;
    parkUp(plan, random, [[c.x, c.y]]);
  });

  (plan.boulevards || [plan.boulevard]).forEach(function (boulevard) {
    if (!boulevard) return;

    boulevard.median.forEach(function (c) {
      plan.what[plan.index(c[0], c[1])] = FREE;
    });
    var alongY = boulevard.axis === "y";

    boulevard.median.forEach(function (c) {
      if (plan.at(c[0], c[1]) !== FREE) return;

      for (var len = 3; len >= 1; len--) {
        var codes = codesOf("park", 1, len);

        var ex = alongY ? 1 : len,
          ey = alongY ? len : 1;

        if (codes.length > 0 && plan.free(c[0], c[1], ex, ey)) {
          plan.build(
            random.pick(codes),
            c[0],
            c[1],
            ex,
            ey,
            alongY || len === 1 ? 0 : 1,
            {
              zone: "park",
            },
          );
          return;
        }
      }
    });
  });

  urban.sort(function (a, b) {
    return a.reach - b.reach;
  });

  urban.forEach(function (b) {
    if (b.zone === "square") return;

    if (b.zone === "park") {
      parkUp(plan, random, freeCells(plan, b));
      return;
    }

    stripsOf(plan, b).forEach(function (strip) {
      fillStrip(plan, random, strip, paletteFor(plan, b, strip), {
        zone: b.zone,
        parks: strip.high ? 0 : PARK_CHANCE[b.zone] || 0,
      });
    });

    if (b.zone === "core" || b.zone === "inner" || b.zone === "oldtown")
      parkUp(plan, random, freeCells(plan, b), 2);
  });

  farms(plan, random);

  return { townHall: civics.townhall || null, church: civics.church || null };
}

//farms along roads outside the blocks, spaced
export function farms(plan, random) {
  var keys = Object.keys(plan.roads),
    taken = Object.create(null);

  random.shuffle(keys);

  keys.forEach(function (k) {
    var r = plan.roads[k];

    if (r.way !== -1 || plan.reach(r.x, r.y) > 1.7) return;

    for (var dy = -2; dy <= 2; dy++)
      for (var dx = -2; dx <= 2; dx++) {
        var id = plan.inside(r.x + dx, r.y + dy)
          ? plan.blockOf[plan.index(r.x + dx, r.y + dy)]
          : -1;

        if (id >= 0 && plan.blocks[id].urban) return;
      }

    if (!random.chance(0.22)) return;

    var alongX = plan.isRoad(r.x - 1, r.y) || plan.isRoad(r.x + 1, r.y),
      sides = alongX ? [1, 3] : [0, 2];

    random.shuffle(sides);

    for (var i = 0; i < sides.length; i++) {
      var s = (sides[i] + 2) % 4,
        edge = alongX
          ? r.y + (sides[i] === 1 ? -1 : 1)
          : r.x + (sides[i] === 0 ? -1 : 1);

      if (tryFarm(plan, random, r, s, edge, alongX, taken)) return;
    }
  });
}

function tryFarm(plan, random, r, s, edge, alongX, taken) {
  var shapes = random.shuffle([
    [2, 2],
    [3, 2],
    [2, 3],
    [1, 2],
    [1, 3],
    [2, 1],
    [3, 1],
  ]);

  for (var i = 0; i < shapes.length; i++) {
    var w = shapes[i][0],
      d = shapes[i][1],
      codes = codesOf("village", w, d);

    if (codes.length === 0) continue;

    for (var off = 0; off < w; off++) {
      var along = (alongX ? r.x : r.y) - off,
        corner = lotCorner(s, edge, along, d),
        ex = alongX ? w : d,
        ey = alongX ? d : w;

      if (!roomAround(plan, corner[0], corner[1], ex, ey, taken)) continue;

      var placed = tryPlace(
        plan,
        random.pick(codes),
        corner[0],
        corner[1],
        w,
        d,
        s,
        { zone: "farm" },
      );

      if (placed !== null) {
        for (var x = corner[0] - 2; x < corner[0] + ex + 2; x++)
          for (var y = corner[1] - 2; y < corner[1] + ey + 2; y++)
            taken[x + "," + y] = true;

        return true;
      }
    }
  }

  return false;
}

function roomAround(plan, x0, y0, ex, ey, taken) {
  for (var x = x0; x < x0 + ex; x++)
    for (var y = y0; y < y0 + ey; y++) {
      if (taken[x + "," + y]) return false;

      var id = plan.inside(x, y) ? plan.blockOf[plan.index(x, y)] : -1;

      if (id >= 0 && plan.blocks[id].urban) return false;
    }

  return true;
}
