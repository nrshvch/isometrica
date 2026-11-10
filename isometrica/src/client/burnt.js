/**
 * What is left of a building brought down, painted out of its own pictures
 * as it stood - as `burnt` says of a picture's parts (SpriteCache
 * getComposite, burnt): one or more of these, ";" between them (spec).
 *
 * Done to a part's picture on its own, before it is put together with the
 * others (client/cachedsprite paint, burn), by how high every pixel of it
 * stands over the ground (its picture of that to be lit, shared/gen/looks
 * DEFERRED) - so a wall is broken off as high at its back as at its front -
 * or, a part with no such picture, by how far up the picture it is:
 *
 *   - "r:seed:keep", burnt down (core/building ruin, client/ruin): its walls
 *     charred black and broken off any which way `keep` pixels up at most,
 *     the posts of its frame standing on up out of them, and what is on the
 *     ground round it - its yard, its car park, its garden - grey with soot
 *     and strewn with what fell, charred wood, broken brick, ash, glass;
 *   - "y:seed", all of it ground, sooted.
 *
 * And done to the whole of a picture once it is put together (wholly, the
 * colours of it as it is to be lit as well as as it is painted):
 *
 *   - "c:seed:level", a building still burning (client/fires), or blown up
 *     (client/explosion), charred more and more as the fire goes on - level
 *     0..100 - its walls blackened with soot in patches, the more the
 *     higher up, where the heat goes, scorched brown where it is not black
 *     yet, and the ground round it sooted a little (char).
 */

//charcoal, dark to less so; the brown of wood not burnt through; ash
var CHAR = [
    [22, 19, 17],
    [34, 29, 26],
    [48, 41, 36],
  ],
  SCORCHED = [70, 46, 32],
  ASH = [104, 100, 94];

//what lies strewn about: charred wood, cinders, broken brick, ash, glass
var DEBRIS = [
  [30, 26, 23],
  [46, 40, 35],
  [128, 66, 48],
  [96, 92, 86],
  [146, 142, 134],
  [64, 54, 42],
];

//how high a pixel can stand and still be the ground, pixels
var GROUND = 1.5;

//a number 0..1 for i, j and a seed, the same every time
function hash(i, j, s) {
  var h = (i * 374761393 + j * 668265263 + s * 1442695041) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

//noise along i, smooth between whole steps of it
function wave(i, s) {
  var i0 = Math.floor(i),
    f = i - i0,
    t = f * f * (3 - 2 * f);

  return hash(i0, 0, s) * (1 - t) + hash(i0 + 1, 0, s) * t;
}

//noise over i, j, smooth between whole steps
function patch(i, j, s) {
  var i0 = Math.floor(i),
    j0 = Math.floor(j),
    fi = i - i0,
    fj = j - j0,
    si = fi * fi * (3 - 2 * fi),
    sj = fj * fj * (3 - 2 * fj),
    a = hash(i0, j0, s),
    b = hash(i0 + 1, j0, s),
    c = hash(i0, j0 + 1, s),
    d = hash(i0 + 1, j0 + 1, s);

  return a + (b - a) * si + (c - a) * sj + (a - b - c + d) * si * sj;
}

/**
 * What `burnt` says of a part, made out of its words: one or more of
 * "kind:seed:..." with ";" between them - each {kind, seed, keep, args},
 * args every number after the kind.
 *
 * @returns {Object[]}
 */
function spec(words) {
  return String(words)
    .split(";")
    .filter(Boolean)
    .map(function (one) {
      var p = one.split(":"),
        args = p.slice(1).map(Number);

      return {
        kind: p[0],
        seed: args[0] || 0,
        keep: args[1] || 0,
        args: args,
      };
    });
}

//whether a kind is done to the whole of a picture (wholly), not to a part
function whole(s) {
  return s.kind === "c";
}

/**
 * Of what specs say, what is done to a part of a picture on its own (burn) -
 * and what to the whole of it (wholly).
 */
function partly(specs) {
  return specs.filter(function (s) {
    return !whole(s);
  });
}

function wholly(specs) {
  return specs.filter(whole);
}

/**
 * Burns the w by h picture of pixels (RGBA, not premultiplied) as specs say
 * - the ones done to a part (partly) - height(i, j) how high its pixel i, j
 * stands over the ground, or null where that is not known, for how far up
 * the picture it is.
 *
 * @param pixels {Uint8ClampedArray}
 * @param specs {Object[]|Object} (spec)
 * @param [height] {function(number, number): number|null}
 */
function burn(pixels, w, h, specs, height) {
  (Array.isArray(specs) ? specs : [specs]).forEach(function (s) {
    if (s.kind === "c") char(pixels, w, 0, 0, w, h, s, height);
    else if (!whole(s)) broken(pixels, w, h, s, height);
  });
}

//a ruin, the ground (r, y)
function broken(pixels, w, h, s, height) {
  var seed = s.seed,
    i,
    j;

  for (i = 0; i < w; i++) {
    //where it broke off, this column: higher and lower in runs, with gaps
    //nearly down to the ground here and there; and a post of its frame -
    //a stump, a broken pole - standing on up out of it, now and then
    var gap = hash(Math.floor(i / 3), 7, seed) < 0.15,
      cut =
        s.keep *
        (gap
          ? 0.15 + 0.2 * wave(i / 2, seed + 2)
          : 0.45 + 0.55 * wave(i / 4, seed)),
      post =
        s.kind !== "y" && hash(i, 11, seed) < 0.12
          ? cut + 4 + 14 * hash(i, 13, seed)
          : -1;

    for (j = 0; j < h; j++) {
      var o = (j * w + i) * 4;

      if (pixels[o + 3] === 0) continue;

      var z = s.kind === "y" ? 0 : height ? height(i, j) : null;

      //not known: as high as it is up the picture from its foot, a guess
      if (z === null) z = Math.max(0, (h - 1 - j) * 0.6 - 4);

      if (z <= GROUND) {
        ground(pixels, o, i, j, seed);
        continue;
      }

      //broken off: gone - but for a post, as far as it went
      if (z > cut) {
        if (post > 0 && z <= post) {
          var p = CHAR[z > post - 1.5 ? 2 : 0];

          pixels[o] = p[0];
          pixels[o + 1] = p[1];
          pixels[o + 2] = p[2];
        } else pixels[o + 3] = 0;
        continue;
      }

      wall(pixels, o, i, j, seed, cut - z < 1.5);
    }
  }
}

//a pixel of the ground round it: greyed and sooted over in patches - or
//something strewn there, lumps of it now and then
function ground(pixels, o, i, j, seed) {
  var r = hash(i, j, seed + 3);

  if (r < 0.075 || (r < 0.11 && hash(i - 1, j, seed + 3) < 0.075)) {
    var d = DEBRIS[Math.floor(hash(i, j, seed + 5) * DEBRIS.length)];

    pixels[o] = d[0];
    pixels[o + 1] = d[1];
    pixels[o + 2] = d[2];
    return;
  }

  var soot = 0.36 + 0.44 * patch(i / 7, j / 5, seed),
    grey = (pixels[o] + pixels[o + 1] + pixels[o + 2]) / 3;

  for (var k = 0; k < 3; k++)
    pixels[o + k] = (pixels[o + k] * 0.4 + grey * 0.6) * soot;
}

//a pixel of a wall left standing: charred black, a trace of what it was
//showing through - scorched brown where it broke off, ash here and there
function wall(pixels, o, i, j, seed, edge) {
  var keep = 0.08 + 0.16 * patch(i / 3, j / 4, seed + 19),
    tone = edge
      ? SCORCHED
      : hash(i, j, seed + 17) < 0.05
        ? ASH
        : CHAR[Math.floor(hash(i, j, seed + 23) * CHAR.length)];

  for (var k = 0; k < 3; k++)
    pixels[o + k] = pixels[o + k] * keep + tone[k] * (1 - keep);
}

/**
 * Does what specs say to the whole of a picture once it is put together
 * (wholly: c) - the w by h of it at x0, y0 of pixels stride wide, height
 * (i, j) how high its pixel i, j stands, or null.
 */
function wholeOf(pixels, stride, x0, y0, w, h, specs, height) {
  wholly(Array.isArray(specs) ? specs : [specs]).forEach(function (s) {
    char(pixels, stride, x0, y0, w, h, s, height);
  });
}

/**
 * Chars the w by h picture at x0, y0 of pixels stride wide (RGBA, not
 * premultiplied) as "c:seed:level" says (s) - height(i, j) how high its
 * pixel i, j stands over the ground, or null where that is not known.
 */
function char(pixels, stride, x0, y0, w, h, s, height) {
  var seed = s.seed,
    level = Math.max(0, Math.min(1, s.keep / 100)),
    i,
    j,
    k;

  if (level <= 0) return;

  for (j = 0; j < h; j++)
    for (i = 0; i < w; i++) {
      var o = ((y0 + j) * stride + x0 + i) * 4;

      if (pixels[o + 3] === 0) continue;

      var z = height ? height(i, j) : null;

      if (z === null) z = Math.max(0, (h - 1 - j) * 0.6 - 4);

      //the ground round it, sooted a little where it fell
      if (z <= GROUND) {
        var soot = 1 - level * 0.45 * patch(i / 6, j / 4, seed + 31);

        for (k = 0; k < 3; k++) pixels[o + k] *= soot;
        continue;
      }

      //how black it is here: in patches, more of it the higher up, all of
      //it in the end
      var a =
          level *
          (0.55 + 0.6 * patch(i / 5, j / 7, seed + 37)) *
          (0.65 + 0.35 * Math.min(1, z / 36)),
        tone =
          a < 0.45
            ? SCORCHED
            : CHAR[Math.floor(hash(i, j, seed + 41) * CHAR.length)];

      a = Math.min(0.94, a + (hash(i, j, seed + 43) - 0.5) * 0.12);
      if (a <= 0) continue;

      for (k = 0; k < 3; k++)
        pixels[o + k] = pixels[o + k] * (1 - a) + tone[k] * a;
    }
}

export default {
  spec: spec,
  partly: partly,
  wholly: wholly,
  burn: burn,
  whole: wholeOf,
  char: char,
};
