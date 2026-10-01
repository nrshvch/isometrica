/**
 * Paints scenes made of boxes the way the game sees the world, for the
 * generators that paint buildings (shared/gen/flats).
 *
 * One ray per pixel goes straight into the scene; the pixel is the colour of
 * the first box it hits, shaded by which way the face it hits looks. Every
 * face looking the same way is the same flat colour - no gradients, no noise -
 * so everything painted here is lit alike, the same as the vehicles.
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

function box(x0, x1, y0, y1, z0, z1, color) {
  return {
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
    return box(p[0], q[0], p[1], q[1], b.z0, b.z1, b.color);
  });
}

//where a point in the world lands on the screen, the origin at 0, 0
function project(x, y, z) {
  return [x - y, -(x + y) / 2 - z];
}

//a face looking up is lit the most, one looking down and to the left (-x)
//less, down and to the right (-y) the least
function shade(color, face) {
  if (face === 2) return lighter(color, 0.22);
  else if (face === 0) return darker(color, 0.1);
  else return darker(color, 0.3);
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
function cast(boxes, sx, sy) {
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

  return hit === null ? null : shade(hit.color, face);
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

/**
 * The picture of the boxes, with pivotX/pivotY where the world's origin lands
 * in it.
 */
function render(boxes) {
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

  for (j = 0; j < h; j++) {
    for (i = 0; i < w; i++)
      pixels.push(cast(boxes, minX + i + 0.5, minY + j + 0.5));
  }

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
        };

        if (c.x0 < c.x1 && c.y0 < c.y1) clipped.push(c);
      });

      if (clipped.length === 0) continue;

      picture = render(clipped);
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
