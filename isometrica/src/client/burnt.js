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
 *   - "w:seed:keep", wrecked by a blast (core/city explode, a yard left as
 *     it was): whatever stood on it broken off `keep` pixels up, stumps and
 *     posts standing, the colours of it under a coat of grey dust, and the
 *     ground strewn with lumps of concrete, brick and glass;
 *   - "y:seed", all of it ground, sooted.
 *
 * And done to the whole of a picture once it is put together (wholly, the
 * colours of it as it is to be lit as well as as it is painted):
 *
 *   - "c:seed:level", a building still burning (client/fires), charred more
 *     and more as the fire goes on - level 0..100 - its walls blackened with
 *     soot in patches, the more the higher up, where the heat goes, scorched
 *     brown where it is not black yet, and the ground round it sooted a
 *     little (char);
 *   - "e:seed:sides:pivotX:pivotY", a tile of a building next to one of it
 *     that has come down (client/demolition), open on that side: the inside
 *     of it showing where the wall between them was - its floors, a storey
 *     apart, the rooms on each, papered, partitioned, furnished - as high as
 *     it stands there; sides 1 for its side to the -x of it as it is seen,
 *     2 to the -y, 3 both; pivotX, pivotY where the middle of its tile is in
 *     the picture (expose).
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

//the dust of a blast over everything, and what it strews: lumps of
//concrete, brick, timber, glass
var DUST = [164, 156, 144],
  WRECKAGE = [
    [150, 146, 138],
    [118, 114, 108],
    [140, 72, 52],
    [104, 76, 52],
    [196, 204, 206],
    [84, 80, 76],
  ];

//inside a building opened up: its floors, the walls of its rooms, what is
//in them
var SLAB = [132, 128, 122],
  UNDER = [88, 84, 80],
  PARTITION = [184, 176, 164],
  PAPER = [
    [196, 178, 140],
    [168, 184, 190],
    [204, 164, 156],
    [170, 190, 150],
    [214, 204, 172],
    [188, 168, 196],
  ],
  FURNITURE = [
    [120, 72, 48],
    [76, 92, 128],
    [156, 116, 72],
    [62, 60, 58],
    [176, 64, 52],
    [214, 210, 200],
  ];

//how high a storey is inside, pixels (shared/gen: twelve to a storey); how
//wide a room is, about
var STOREY = 12,
  ROOM = 11;

//the way a side of a tile looks, as its picture of that has it (shared/gen/
//looks normal): to the -x, and to the -y
var FACING = [
  [0, 128, 128],
  [128, 0, 128],
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
  return s.kind === "c" || s.kind === "e";
}

/**
 * Of what specs say, what is done to a part of a picture on its own (burn) -
 * and what to the whole of it (wholly), open first, then charred.
 */
function partly(specs) {
  return specs.filter(function (s) {
    return !whole(s);
  });
}

function wholly(specs) {
  return specs.filter(whole).sort(function (a, b) {
    return (a.kind === "e" ? 0 : 1) - (b.kind === "e" ? 0 : 1);
  });
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

//a ruin, a wreck, the ground (r, w, y)
function broken(pixels, w, h, s, height) {
  var seed = s.seed,
    wreck = s.kind === "w",
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
        s.kind !== "y" && hash(i, 11, seed) < (wreck ? 0.08 : 0.12)
          ? cut + 4 + (wreck ? 6 : 14) * hash(i, 13, seed)
          : -1;

    for (j = 0; j < h; j++) {
      var o = (j * w + i) * 4;

      if (pixels[o + 3] === 0) continue;

      var z = s.kind === "y" ? 0 : height ? height(i, j) : null;

      //not known: as high as it is up the picture from its foot, a guess
      if (z === null) z = Math.max(0, (h - 1 - j) * 0.6 - 4);

      if (z <= GROUND) {
        if (wreck) dusty(pixels, o, i, j, seed);
        else ground(pixels, o, i, j, seed);
        continue;
      }

      //broken off: gone - but for a post, as far as it went
      if (z > cut) {
        if (post > 0 && z <= post) {
          var p = wreck
            ? WRECKAGE[z > post - 1.5 ? 5 : 3]
            : CHAR[z > post - 1.5 ? 2 : 0];

          pixels[o] = p[0];
          pixels[o + 1] = p[1];
          pixels[o + 2] = p[2];
        } else pixels[o + 3] = 0;
        continue;
      }

      if (wreck) dusted(pixels, o, i, j, seed, cut - z < 1.5);
      else wall(pixels, o, i, j, seed, cut - z < 1.5);
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

//a pixel of the ground of a yard wrecked by a blast: grey with its dust in
//drifts, and lumps of what was blown over it strewn about
function dusty(pixels, o, i, j, seed) {
  var r = hash(i, j, seed + 3);

  if (r < 0.09 || (r < 0.13 && hash(i - 1, j, seed + 3) < 0.09)) {
    var d = WRECKAGE[Math.floor(hash(i, j, seed + 5) * WRECKAGE.length)];

    pixels[o] = d[0];
    pixels[o + 1] = d[1];
    pixels[o + 2] = d[2];
    return;
  }

  var a = 0.25 + 0.5 * patch(i / 6, j / 4, seed + 29),
    dark = 0.85 + 0.15 * hash(i, j, seed + 31);

  for (var k = 0; k < 3; k++)
    pixels[o + k] = (pixels[o + k] * (1 - a) + DUST[k] * a) * dark;
}

//a pixel of what stood on a wrecked yard, left standing: its own colours
//under the dust, broken and paler where it broke off
function dusted(pixels, o, i, j, seed, edge) {
  var a = edge ? 0.6 : 0.3 + 0.25 * patch(i / 3, j / 4, seed + 37);

  for (var k = 0; k < 3; k++)
    pixels[o + k] = pixels[o + k] * (1 - a) + DUST[k] * a * 0.9;
}

/**
 * Does what specs say to the whole of a picture once it is put together
 * (wholly: c, e) - the w by h of it at x0, y0 of pixels stride wide, height
 * (i, j) how high its pixel i, j stands, or null. And where the picture is
 * one to be lit (lit: the pictures side by side, the colours at x0 and
 * normal, height their x off that), what it opens up has which way it
 * looks and how high it stands too.
 *
 * @param [lit] {{normal: number, high: number}}
 */
function wholeOf(pixels, stride, x0, y0, w, h, specs, height, lit) {
  wholly(Array.isArray(specs) ? specs : [specs]).forEach(function (s) {
    if (s.kind === "e") expose(pixels, stride, x0, y0, w, h, s, height, lit);
    else char(pixels, stride, x0, y0, w, h, s, height);
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

/**
 * Opens up the sides of a tile's picture "e:seed:sides:pivotX:pivotY" says
 * (s): on each, the inside of it as high as it stands there - how high
 * that is, along the side, by the highest of it near it (its profile) -
 * every storey's floor, the rooms on it, what is in them, painted over
 * whatever was there, the wall or nothing. Nothing where it stands no
 * higher than a garden does.
 *
 * Along the ground, as it is seen (shared/gen: x - y across, -(x + y) / 2
 * down, 32 to a tile), its side to the -x is where x is 16 short of its
 * middle, the one to the -y where y is: a pixel i, j standing z high is
 * over the ground where i, j + z is on the picture.
 */
function expose(pixels, stride, x0, y0, w, h, s, height, lit) {
  var seed = s.seed,
    sides = s.args[1] | 0,
    px = s.args[2],
    py = s.args[3],
    side,
    i,
    j;

  if (!height || !(sides > 0) || !isFinite(px) || !isFinite(py)) return;

  for (side = 0; side < 2; side++) {
    if ((sides & (1 << side)) === 0) continue;

    //how high it stands near its side, along it
    var profile = new Float32Array(33);

    for (j = 0; j < h; j++)
      for (i = 0; i < w; i++) {
        var z = height(i, j);

        if (z === null) continue;

        var sx = i - px,
          sy = j - py + z,
          gx = (sx - 2 * sy) / 2,
          gy = (-sx - 2 * sy) / 2,
          across = side === 0 ? gx : gy,
          along = (side === 0 ? gy : gx) + 16;

        if (across < -16.5 || across > -12 || along < 0 || along > 32) continue;

        var u = Math.round(along);

        if (z > profile[u]) profile[u] = z;
      }

    //along it, a column of the picture at a time: its floors and rooms
    //from the ground up, short of its top
    for (var u2 = 0; u2 <= 32; u2++) {
      var top = profile[u2];

      if (top < 8) continue;

      var ci = Math.round(px + (side === 0 ? -u2 : u2)),
        foot = py + 16 - u2 / 2;

      if (ci < 0 || ci >= w) continue;

      for (var zz = 1; zz < top - 1; zz++) {
        var cj = Math.round(foot - zz);

        if (cj < 0 || cj >= h) continue;

        var o = ((y0 + cj) * stride + x0 + ci) * 4,
          c = inside(u2, zz, seed + side * 101);

        pixels[o] = c[0];
        pixels[o + 1] = c[1];
        pixels[o + 2] = c[2];
        pixels[o + 3] = 255;

        if (lit) {
          var n = ((y0 + cj) * stride + x0 + lit.normal + ci) * 4,
            hi = ((y0 + cj) * stride + x0 + lit.high + ci) * 4,
            f = FACING[side];

          pixels[n] = f[0];
          pixels[n + 1] = f[1];
          pixels[n + 2] = f[2];
          pixels[n + 3] = 255;
          pixels[hi] = Math.min(255, zz);
          pixels[hi + 3] = 255;
        }
      }
    }
  }
}

//the colour of the inside of a building opened up, u along its side and z
//up from the ground: a floor, a wall between rooms, what is in a room, its
//walls - in the shade of the floor over it
function inside(u, z, seed) {
  var level = Math.floor(z / STOREY),
    f = z - level * STOREY,
    shift = Math.floor(hash(level, 1, seed) * ROOM),
    room = Math.floor((u + shift) / ROOM),
    ru = (u + shift) % ROOM,
    out;

  //the floor, and the underside of the one over it
  if (f < 1.5) return f < 0.75 ? SLAB : UNDER;

  //a wall between rooms
  if (ru < 1) out = PARTITION;
  else {
    //what is in it: a sofa, a bed, a table, a wardrobe - against its back
    //wall, on its floor
    var has = hash(level, room, seed + 3),
      from = 2 + Math.floor(hash(level, room, seed + 5) * 4),
      wide = 3 + Math.floor(hash(level, room, seed + 7) * 4),
      high = 2 + Math.floor(hash(level, room, seed + 9) * (has > 0.8 ? 6 : 3));

    if (has > 0.25 && ru >= from && ru < from + wide && f < 1.5 + high)
      out =
        FURNITURE[Math.floor(hash(level, room, seed + 11) * FURNITURE.length)];
    else out = PAPER[Math.floor(hash(level, room, seed + 13) * PAPER.length)];
  }

  //the further up the room, the deeper in the shade of the floor over it
  var shade = (0.86 - 0.3 * (f / STOREY)) * (0.92 + 0.08 * hash(u, z, seed));

  return [out[0] * shade, out[1] * shade, out[2] * shade];
}

export default {
  spec: spec,
  partly: partly,
  wholly: wholly,
  burn: burn,
  whole: wholeOf,
  char: char,
};
