/**
 * Paints scenes made of boxes the way the game sees the world, for the
 * generators that paint buildings (shared/gen/flats).
 *
 * One ray per pixel goes straight into the scene; the pixel is the colour of
 * the first box it hits, shaded by which way the face it hits looks. Every
 * face looking the same way is the same flat colour - so everything painted
 * here is lit alike, the same as the vehicles - unless its box has a finish:
 * a faint grain over it, or the sky reflected in it, for glass (see finish).
 *
 * Units: one along the ground is one pixel across the screen - a tile is 32 of
 * them each way. Heights are in pixels. +x runs up and to the right on the
 * screen, +y up and to the left; only faces looking up, towards -x (down and
 * to the left) and towards -y (down and to the right) are ever seen.
 */

var TILE = 32,
  TILE_W = 64,
  TILE_H = 32;

function mix(c, to, k) {
  return [
    c[0] + (to[0] - c[0]) * k,
    c[1] + (to[1] - c[1]) * k,
    c[2] + (to[2] - c[2]) * k,
  ];
}

function lighter(c, k) {
  return mix(c, [255, 255, 255], k);
}

function darker(c, k) {
  return mix(c, [0, 0, 0], k);
}

/**
 * @param [finish] {Object} what its surface is like, see finish - a box
 *        without one is flat colour
 */
function box(x0, x1, y0, y1, z0, z1, color, finish) {
  return {
    finish: finish,
    x0: Math.min(x0, x1),
    x1: Math.max(x0, x1),
    y0: Math.min(y0, y1),
    y1: Math.max(y0, y1),
    z0: Math.min(z0, z1),
    z1: Math.max(z0, z1),
    color: color,
  };
}

/**
 * The boxes of something standing on sizeX by sizeY tiles, turned a quarter
 * turn at a time on the spot. Whatever looked towards -y looks, after one
 * turn, towards -x, after two towards +y and after three towards +x. Turned
 * an odd number of times its footprint is sizeY by sizeX.
 */
function rotate(boxes, sizeX, sizeY, turns) {
  var X = sizeX * TILE,
    Y = sizeY * TILE;

  function turn(x, y) {
    switch (turns % 4) {
      case 1:
        return [y, X - x];
      case 2:
        return [X - x, Y - y];
      case 3:
        return [Y - y, x];
      default:
        return [x, y];
    }
  }

  return boxes.map(function (b) {
    var p = turn(b.x0, b.y0),
      q = turn(b.x1, b.y1);
    var r = box(p[0], q[0], p[1], q[1], b.z0, b.z1, b.color, b.finish);

    r.group = b.group;

    return r;
  });
}

//where a point in the world lands on the screen, the origin at 0, 0
function project(x, y, z) {
  return [x - y, -(x + y) / 2 - z];
}

//how a face is lit: one looking up lighter than its colour, one looking down
//and to the left (-x) darker, down and to the right (-y) darker still - with
//as much between them as the hand-drawn buildings have, near enough
var SHADE = { up: 0.16, left: 0.15, right: 0.375 };

function shade(color, face) {
  if (face === 2) return lighter(color, SHADE.up);
  else if (face === 0) return darker(color, SHADE.left);
  else return darker(color, SHADE.right);
}

function screenBounds(b) {
  var corners = [
      [b.x0, b.y0, b.z0],
      [b.x1, b.y0, b.z0],
      [b.x0, b.y1, b.z0],
      [b.x1, b.y1, b.z0],
      [b.x0, b.y0, b.z1],
      [b.x1, b.y0, b.z1],
      [b.x0, b.y1, b.z1],
      [b.x1, b.y1, b.z1],
    ],
    r = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };

  corners.forEach(function (c) {
    var p = project(c[0], c[1], c[2]);
    r.minX = Math.min(r.minX, p[0]);
    r.maxX = Math.max(r.maxX, p[0]);
    r.minY = Math.min(r.minY, p[1]);
    r.maxY = Math.max(r.maxY, p[1]);
  });

  return r;
}

/**
 * The first box a ray through that point on the screen hits, shaded. The ray
 * comes from in front, above, and goes along (1, 1, -1), which is what every
 * point that lands on the same pixel lies on. Of two boxes hit at the same
 * spot the one listed later wins, so details go after what they sit on.
 */
function cast(boxes, sx, sy, at) {
  var y = -1000,
    x = y + sx,
    z = -(x + y) / 2 - sy,
    best = Infinity,
    hit = null,
    face = -1,
    i,
    b,
    tin,
    tout,
    f,
    t;

  for (i = 0; i < boxes.length; i++) {
    b = boxes[i];
    if (sx < b.sMinX || sx > b.sMaxX || sy < b.sMinY || sy > b.sMaxY) continue;

    tin = b.x0 - x;
    f = 0;
    t = b.y0 - y;
    if (t > tin) {
      tin = t;
      f = 1;
    }
    //z goes down along the ray
    t = z - b.z1;
    if (t > tin) {
      tin = t;
      f = 2;
    }
    tout = Math.min(b.x1 - x, b.y1 - y, z - b.z0);

    if (tin < tout && tin <= best) {
      best = tin;
      hit = b;
      face = f;
    }
  }

  if (hit === null) return null;

  //how far along the ray, and where, for the outline (see outline)
  if (at !== undefined) {
    at.t = best;
    at.x = x + best;
    at.y = y + best;
    at.z = z - best;
  }

  //a box lit already is its own colour on every face
  if (hit.finish !== undefined && hit.finish.lit) return hit.color;

  var color = shade(hit.color, face);

  if (
    hit.finish !== undefined &&
    hit.finish.shadow &&
    shadowed(boxes, hit, x + best, y + best, z - best)
  )
    color = darker(color, SHADOW);

  return hit.finish === undefined
    ? color
    : finish(color, face, hit.finish, x + best, y + best, z - best);
}

//where the sun is, the way shade lights the faces: high, and over to the
//side the faces looking towards -x are on - as shared/gen/blocks has it
var SUN = (function () {
  var l = [-0.45, 0.35, 1],
    n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);

  return [l[0] / n, l[1] / n, l[2] / n];
})();

//how much darker a spot in another box's shadow is
var SHADOW = 0.32;

/**
 * Whether the sun is kept off that point of box `hit` by another box of the
 * same group that casts a shadow (finish.shadow) - a strut of a lattice
 * falling across the next one. Only a box's own group shades it, so a part
 * comes out the same alone as laid with others (see compose).
 */
function shadowed(boxes, hit, px, py, pz) {
  var e = 0.05,
    ox = px + SUN[0] * e,
    oy = py + SUN[1] * e,
    oz = pz + SUN[2] * e;

  for (var i = 0; i < boxes.length; i++) {
    var b = boxes[i];

    if (
      b === hit ||
      b.group !== hit.group ||
      b.finish === undefined ||
      !b.finish.shadow
    )
      continue;

    var t0 = 0,
      t1 = Infinity,
      lo = [b.x0, b.y0, b.z0],
      hi = [b.x1, b.y1, b.z1],
      o = [ox, oy, oz],
      k;

    for (k = 0; k < 3 && t0 <= t1; k++) {
      if (Math.abs(SUN[k]) < 1e-9) {
        if (o[k] < lo[k] || o[k] > hi[k]) t0 = Infinity;
        continue;
      }

      var a = (lo[k] - o[k]) / SUN[k],
        c = (hi[k] - o[k]) / SUN[k];

      t0 = Math.max(t0, Math.min(a, c));
      t1 = Math.min(t1, Math.max(a, c));
    }

    if (t0 <= t1) return true;
  }

  return false;
}

//a little lighter or darker by k, -1..1 of it
function tint(c, k) {
  return k > 0 ? lighter(c, k) : darker(c, -k);
}

/**
 * A material on a surface at lx, ly, lz on its tile and storey:
 *
 *   - panels: precast concrete, a joint between one panel and the next every
 *     eight along a wall and at every floor, each panel a shade of its own;
 *   - bricks: courses half a brick apart, the mortar lighter, each brick a
 *     shade of its own;
 *   - slabs: paving, a joint every four each way on top, each slab a shade of
 *     its own;
 *   - gravel: speckled, a pebble here and there lighter or darker.
 *
 * Walls go by the way along them and up, tops by both ways along the ground.
 */
function pattern(c, face, kind, lx, ly, lz) {
  var u = face === 1 ? lx : ly,
    v = face === 2 ? lx : lz,
    r;

  if (kind === "panels") {
    if (face === 2) return c;
    if (mod(u, 8) < 0.55 || lz < 0.55) return darker(c, 0.16);

    return tint(c, (hash(Math.floor(u / 8), face, 3) - 0.5) * 0.08);
  }

  if (kind === "bricks") {
    if (face === 2) return c;

    var row = Math.floor(lz / 1.5),
      along = u + (row % 2 ? 1.5 : 0);

    if (mod(lz, 1.5) < 0.35 || mod(along, 3) < 0.35) return lighter(c, 0.2);

    return tint(c, (hash(Math.floor(along / 3), row, 5) - 0.5) * 0.16);
  }

  if (kind === "slabs") {
    if (face !== 2) return c;
    if (mod(lx, 4) < 0.4 || mod(ly, 4) < 0.4) return darker(c, 0.14);

    return tint(
      c,
      (hash(Math.floor(lx / 4), Math.floor(ly / 4), 7) - 0.5) * 0.1,
    );
  }

  if (kind === "gravel") {
    r = hash(Math.floor(u * 2), Math.floor(v * 2), face + 11);

    if (r > 0.94) return lighter(c, 0.22);
    if (r < 0.06) return darker(c, 0.28);

    return tint(c, (r - 0.5) * 0.12);
  }

  return c;
}

//what comes out of a hash of whole numbers: 0..1, the same every time
function hash(i, j, k) {
  var h =
    Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791);

  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);

  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function mod(v, n) {
  return ((v % n) + n) % n;
}

/**
 * The colour of a point of a box with a finish, shaded already: x, y, z where
 * the ray hit it.
 *
 * It goes by where the point is on its own tile and its own storey - x and y
 * from the tile's corner, z from the floor of the storey it is on - so a part
 * painted on a tile of its own comes out the same as it does in a whole
 * building put together out of it, whichever tile and storey it is laid on.
 *
 * A finish with a pattern is a material, laid out the same way (see
 * pattern): concrete panels, brick, paving slabs, gravel.
 *
 * A finish with shadow set has the shadows of the other boxes of its group
 * with shadow set fall on it (see shadowed) - the members of a steel
 * lattice shading each other.
 *
 * A finish with lit set instead is a box whose colour has had the light on
 * it worked out already - a little column of something round, shaded by
 * which way its surface faces there rather than by the faces of the column -
 * and is painted that colour as it is.
 *
 * @param f {{noise: number, sheen: boolean, base: number, storey: number}}
 *        noise, how far each speck of it is lighter or darker, 0..1; sheen,
 *        for glass, the sky in it - brighter towards the top of a storey,
 *        with a streak of light across it; base, how high the floor of the
 *        first storey is, and storey, how high a storey
 */
function finish(color, face, f, x, y, z) {
  var lx = mod(x, TILE),
    ly = mod(y, TILE),
    lz = mod(z - f.base, f.storey),
    c = color;

  if (f.sheen && face !== 2) {
    //along the face, and a streak running up across it
    var u = face === 1 ? lx : ly,
      s = mod(u + lz * 0.9, 9);

    c = lighter(c, 0.04 + (0.12 * lz) / f.storey);
    if (s < 1.4) c = lighter(c, 0.2);
    else if (s < 2.4) c = lighter(c, 0.09);
  }

  if (f.pattern !== undefined) c = pattern(c, face, f.pattern, lx, ly, lz);

  if (f.noise) {
    var n =
      (hash(Math.floor(lx * 2), Math.floor(ly * 2), Math.floor(lz * 2)) - 0.5) *
      2 *
      f.noise;

    c = n > 0 ? lighter(c, n) : darker(c, -n);
  }

  return c;
}

/**
 * Where the picture of the boxes would be, without painting it: its size, and
 * pivotX/pivotY, where the world's origin lands in it - as render has them.
 */
function measure(boxes) {
  var minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  boxes.forEach(function (b) {
    var r = screenBounds(b);

    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minY = Math.min(minY, r.minY);
    maxY = Math.max(maxY, r.maxY);
  });

  minX = Math.floor(minX);
  minY = Math.floor(minY);

  return {
    w: Math.ceil(maxX) - minX,
    h: Math.ceil(maxY) - minY,
    pivotX: -minX,
    pivotY: -minY,
  };
}

//how much darker the outline is: round the edge of what is painted, and
//where something stands well in front of what is behind it
var OUTLINE = 0.42,
  CONTOUR = 0.25,
  //how much further away what is behind has to be for a contour
  CONTOUR_DEPTH = 4;

/**
 * Darkens the pixels round the edge of the picture - next to one with
 * nothing in it - and those in front of something much further away,
 * the way the hand-drawn buildings are outlined.
 *
 * Not where the edge is not the edge of the thing but of the picture of it:
 * where the tile it is cut to ends (clip x0, x1, y0, y1), for the tile next
 * to it carries on from there; and at the foot of a part laid on another
 * (clip base, over the ground), which stands on what is under it.
 *
 * @param at {Object[]} for each pixel with anything in it, {t, x, y, z}:
 *        how far along the ray it was hit, and where
 * @param [clip] {{x0, x1, y0, y1, base}} what the picture was cut to
 */
function outline(pixels, at, w, h, clip) {
  var dark = new Float32Array(w * h),
    i,
    j,
    k;

  function seam(p) {
    if (clip === undefined) return false;

    return (
      p.x - clip.x0 < 1 ||
      clip.x1 - p.x < 1 ||
      p.y - clip.y0 < 1 ||
      clip.y1 - p.y < 1 ||
      (clip.base > 1 && p.z - clip.base < 1)
    );
  }

  for (j = 0; j < h; j++)
    for (i = 0; i < w; i++) {
      k = j * w + i;

      var p = at[k];

      if (p === null) continue;

      var near = [
          i > 0 ? at[k - 1] : null,
          i < w - 1 ? at[k + 1] : null,
          j > 0 ? at[k - w] : null,
          j < h - 1 ? at[k + w] : null,
        ],
        edge = false,
        behind = false;

      for (var n = 0; n < 4; n++) {
        if (near[n] === null) edge = true;
        else if (near[n].t - p.t > CONTOUR_DEPTH) behind = true;
      }

      if (edge && !seam(p)) dark[k] = OUTLINE;
      else if (behind) dark[k] = CONTOUR;
    }

  for (k = 0; k < pixels.length; k++)
    if (dark[k] > 0) pixels[k] = darker(pixels[k], dark[k]);
}

//whether pictures are outlined - off only to check that the parts of a
//building lay together exactly as the whole of it (see shared/gen/compose)
var outlining = true;

function setOutlining(on) {
  outlining = on;
}

/**
 * The picture of the boxes, with pivotX/pivotY where the world's origin lands
 * in it - outlined (see outline).
 *
 * @param [clip] {Object} what the boxes were cut to, see outline
 */
function render(boxes, clip) {
  var minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity,
    i,
    j,
    w,
    h,
    pixels;

  boxes = boxes.map(function (b) {
    var r = screenBounds(b);
    minX = Math.min(minX, r.minX);
    maxX = Math.max(maxX, r.maxX);
    minY = Math.min(minY, r.minY);
    maxY = Math.max(maxY, r.maxY);

    return {
      x0: b.x0,
      x1: b.x1,
      y0: b.y0,
      y1: b.y1,
      z0: b.z0,
      z1: b.z1,
      color: b.color,
      finish: b.finish,
      group: b.group,
      sMinX: r.minX,
      sMaxX: r.maxX,
      sMinY: r.minY,
      sMaxY: r.maxY,
    };
  });

  minX = Math.floor(minX);
  minY = Math.floor(minY);
  w = Math.ceil(maxX) - minX;
  h = Math.ceil(maxY) - minY;
  pixels = [];

  var at = [];

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++) {
      var p = {},
        c = cast(boxes, minX + i + 0.5, minY + j + 0.5, p);

      pixels.push(c);
      at.push(c === null ? null : p);
    }
  }

  if (outlining) outline(pixels, at, w, h, clip);

  return { w: w, h: h, pixels: pixels, pivotX: -minX, pivotY: -minY };
}

/**
 * One picture per tile of something standing on sizeX by sizeY tiles, each
 * painted from only what stands on that tile - every box clipped to the tile's
 * footprint - so no piece carries a bit of its neighbour: the renderer sorts
 * the pieces tile by tile and they cover each other the way the things on
 * them would. Whatever sticks out past its tile is cut off, so every piece of
 * a building has to be built to stay on its own tile.
 *
 * Every piece's pivot is the middle of its tile, on the ground. A tile with
 * nothing on it gets no piece.
 */
function paintTiles(boxes, sizeX, sizeY) {
  var pieces = [],
    i,
    j;

  for (i = 0; i < sizeX; i++) {
    for (j = 0; j < sizeY; j++) {
      var x0 = i * TILE,
        x1 = x0 + TILE,
        y0 = j * TILE,
        y1 = y0 + TILE,
        clipped = [],
        picture,
        middle;

      boxes.forEach(function (b) {
        var c = {
          x0: Math.max(b.x0, x0),
          x1: Math.min(b.x1, x1),
          y0: Math.max(b.y0, y0),
          y1: Math.min(b.y1, y1),
          z0: b.z0,
          z1: b.z1,
          color: b.color,
          finish: b.finish,
          group: b.group,
        };

        if (c.x0 < c.x1 && c.y0 < c.y1) clipped.push(c);
      });

      if (clipped.length === 0) continue;

      picture = render(clipped, {
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        base: Math.min.apply(
          null,
          clipped.map(function (c) {
            return c.z0;
          }),
        ),
      });
      middle = project(x0 + TILE / 2, y0 + TILE / 2, 0);

      pieces.push({
        x: i,
        y: j,
        w: picture.w,
        h: picture.h,
        pixels: picture.pixels,
        pivotX: picture.pivotX + middle[0],
        pivotY: picture.pivotY + middle[1],
      });
    }
  }

  return pieces;
}

//rounded to 16 bit colour, 5 bits of red, 6 of green, 5 of blue
function to16(c) {
  return [
    Math.round((Math.round((c[0] * 31) / 255) * 255) / 31),
    Math.round((Math.round((c[1] * 63) / 255) * 255) / 63),
    Math.round((Math.round((c[2] * 31) / 255) * 255) / 31),
  ];
}

/**
 * A painted picture as RGBA pixels, {width, height, data}, in 16 bit colour.
 */
function toImage(picture) {
  var data = new Uint8ClampedArray(picture.w * picture.h * 4),
    c,
    k;

  for (var i = 0; i < picture.pixels.length; i++) {
    c = picture.pixels[i];
    if (c === null) continue;

    c = to16(c);
    k = i * 4;
    data[k] = c[0];
    data[k + 1] = c[1];
    data[k + 2] = c[2];
    data[k + 3] = 255;
  }

  return { width: picture.w, height: picture.h, data: data };
}

//the pixels written into a PNG's data at x, y
function blit(png, picture, x, y) {
  var i, j, c, k;

  for (j = 0; j < picture.h; j++) {
    for (i = 0; i < picture.w; i++) {
      c = picture.pixels[j * picture.w + i];
      if (
        c === null ||
        x + i < 0 ||
        y + j < 0 ||
        x + i >= png.width ||
        y + j >= png.height
      )
        continue;

      c = to16(c);
      k = ((y + j) * png.width + x + i) * 4;
      png.data[k] = c[0];
      png.data[k + 1] = c[1];
      png.data[k + 2] = c[2];
      png.data[k + 3] = 255;
    }
  }
}

export {
  setOutlining,
  SHADE,
  TILE,
  TILE_W,
  TILE_H,
  mix,
  lighter,
  darker,
  box,
  rotate,
  project,
  measure,
  render,
  paintTiles,
  toImage,
  blit,
};
