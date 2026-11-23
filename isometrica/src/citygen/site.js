/**
 * Where a generated town goes up: somewhere about the spot asked for, the
 * way people settle - on dry land that is fairly level, with room round it
 * for the town to grow into, and gladly by the water: a coast, a lake. Of
 * the spots tried, the one that does all that best, and which way the town
 * is longer, along x or along y, the way the land lies.
 */

//how many spots are tried, and how far about the one asked for, in tiles -
//and if none of them will do, out at sea, further and further out
var TRIES = 90;
var SPREADS = [900, 3000, 9000];

//every STEPth tile is looked at in sizing a spot up - enough to tell land
//from sea and a slope from a plain, at a ninth of the work - and for a big
//city's, as many tiles looked at as for a town's, further apart
var STEP = 3;

function stepFor(rx, ry) {
  return Math.max(STEP, Math.round(Math.sqrt(rx * ry) / 7));
}

/**
 * How good a spot is for a town rx by ry about cx, cy: what of it is dry,
 * level land, what is too steep to build on, how far the ground rises and
 * falls over it, and the water by it.
 */
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

      //the town's own ground
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
      }
      //and round it, where the water it is by would be
      else {
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
    //how far the ground rises over most of it, in steps
    relief:
      heights.length > 0
        ? heights[Math.floor(heights.length * 0.9)] -
          heights[Math.floor(heights.length * 0.1)]
        : 99,
  };
}

//the world's tiles are numbered (y << 16) ^ x, 32 bits with a sign: from
//y 32768 on, the numbers are below zero, and nothing that runs across from
//one side of that to the other is ever got to the end of (core/tileiterator).
//A town is kept to one side of it, a few tiles clear
var SEAM = 32768;

function clearOfSeam(cy, ry, margin) {
  var half = Math.ceil(ry * margin) + 4;

  return cy + half < SEAM || cy - half >= SEAM;
}

/**
 * @param ground {Ground}
 * @param random {Object} (random.js)
 * @param near {number[]} the tile x, y about which it is looked for
 * @param size {{rx: number, ry: number, margin: number}} how far the town
 *        reaches each way from its middle, in tiles, the longer way along x -
 *        and how far round it its country does, a share of that
 * @returns {{x: number, y: number, rx: number, ry: number, coastal: boolean,
 *          survey: Object}}
 */
export default function pickSite(ground, random, near, size) {
  //some towns are by the water, more of them than chance would have it -
  //how much this one wants to be is its own
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

      //a town needs its middle on dry, level land, and room round it
      if (s.middle < 0.9 || s.land < 0.5) continue;

      var score =
        s.land * 3 -
        s.steep * 4 -
        Math.max(0, s.relief - 1) * 0.35 +
        //water on a side of it, not all round
        (wantsWater && s.water > 0.04 && s.water < 0.45 ? 1 : 0) -
        (s.water > 0.55 ? 1 : 0);

      if (score > bestScore) {
        bestScore = score;
        best = { x: cx, y: cy, rx: rx, ry: ry, survey: s };
      }
    }
  }

  //nothing would do: out at sea, say - the spot asked for, as it is, and
  //the town will be what the land there has room for
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
