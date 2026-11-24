/**
 * Picks a site about a spot: dry, level land, by the water for most towns,
 * never across the y seam. See isometrica/.claude/skills/citygen/engine.md (tiles and the seam).
 */
var TRIES = 90;
var SPREADS = [900, 3000, 9000];

var STEP = 3;

function stepFor(rx, ry) {
  return Math.max(STEP, Math.round(Math.sqrt(rx * ry) / 7));
}

function survey(ground, cx, cy, rx, ry) {
  var land = 0,
    steep = 0,
    total = 0,
    water = 0,
    ring = 0,
    heights = [],
    middle = 0,
    middleLand = 0,
    x,
    y,
    dx,
    dy,
    d,
    g,
    lo,
    hi;

  var step = stepFor(rx, ry);

  for (y = Math.round(cy - ry * 1.6); y <= cy + ry * 1.6; y += step)
    for (x = Math.round(cx - rx * 1.6); x <= cx + rx * 1.6; x += step) {
      dx = (x - cx) / rx;
      dy = (y - cy) / ry;
      d = dx * dx + dy * dy;

      if (d > 1.6 * 1.6) continue;

      var wet = ground.isWater(x, y);

      if (d <= 1.1 * 1.1) {
        total++;

        if (wet) water++;
        else {
          g = ground.corners(x, y);
          lo = Math.min(g[0], g[1], g[2], g[3]);
          hi = Math.max(g[0], g[1], g[2], g[3]);

          if (hi - lo > 1) steep++;
          else {
            land++;
            heights.push(hi);
          }
        }

        if (d <= 0.3 * 0.3) {
          middle++;
          if (!wet && ground.fits(x, y, 1, 1)) middleLand++;
        }
      } else {
        ring++;
        if (wet) water++;
      }
    }

  heights.sort(function (a, b) {
    return a - b;
  });

  return {
    land: total > 0 ? land / total : 0,
    steep: total > 0 ? steep / total : 1,
    water: total + ring > 0 ? water / (total + ring) : 0,
    middle: middle > 0 ? middleLand / middle : 0,
    relief:
      heights.length > 0
        ? heights[Math.floor(heights.length * 0.9)] -
          heights[Math.floor(heights.length * 0.1)]
        : 99,
  };
}

//tile indices change sign at y 32768: never span it (engine.md)
var SEAM = 32768;

function clearOfSeam(cy, ry, margin) {
  var half = Math.ceil(ry * margin) + 4;

  return cy + half < SEAM || cy - half >= SEAM;
}

export default function pickSite(ground, random, near, size) {
  var wantsWater = random.chance(0.75),
    best = null,
    bestScore = -Infinity,
    i;

  for (var k = 0; k < SPREADS.length && best === null; k++) {
    var spread = SPREADS[k];

    for (i = 0; i < TRIES; i++) {
      var cx = Math.round(near[0] + random.range(-spread, spread)),
        cy = Math.round(near[1] + random.range(-spread, spread)),
        across = random.chance(0.5),
        rx = across ? size.ry : size.rx,
        ry = across ? size.rx : size.ry,
        s;

      if (!clearOfSeam(cy, ry, size.margin)) continue;

      s = survey(ground, cx, cy, rx, ry);

      if (s.middle < 0.9 || s.land < 0.5) continue;

      var score =
        s.land * 3 -
        s.steep * 4 -
        Math.max(0, s.relief - 1) * 0.35 +
        (wantsWater && s.water > 0.04 && s.water < 0.45 ? 1 : 0) -
        (s.water > 0.55 ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        best = { x: cx, y: cy, rx: rx, ry: ry, survey: s };
      }
    }
  }

  if (best === null) {
    var y = Math.round(near[1]),
      half = Math.ceil(size.ry * size.margin) + 4;

    if (!clearOfSeam(y, size.ry, size.margin))
      y = y < SEAM ? SEAM - half - 1 : SEAM + half;

    best = {
      x: Math.round(near[0]),
      y: y,
      rx: size.rx,
      ry: size.ry,
      survey: survey(ground, near[0], y, size.rx, size.ry),
    };
  }

  best.coastal = best.survey.water > 0.04;

  return best;
}
