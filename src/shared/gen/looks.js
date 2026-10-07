/**
 * What the painters that do not paint out of boxes (shared/gen/terrain,
 * trees, vehicles) share for painting a picture the ways the light is worked
 * out from as it is drawn - as shared/gen/isobox setMode has them: "faces",
 * what of it looks towards -x, -y and up side by side, black where a pixel
 * looks another way, adding up to its colours with no light on them; and
 * "night", what of it shines and the whole of it in black, side by side.
 */

/**
 * How much of a surface looking along n - x, y and up as the boxes have
 * them - looks towards -x, -y and up, adding up to one.
 */
export function weights(n) {
  var l = Math.max(0, -n[0]),
    r = Math.max(0, -n[1]),
    u = Math.max(0, n[2]),
    all = l + r + u;

  return all > 0 ? [l / all, r / all, u / all] : [0, 0, 1];
}

/**
 * A picture n of w by h side by side, every pixel see-through.
 */
export function blank(w, h, n) {
  return {
    width: w * n,
    height: h,
    data: new Uint8ClampedArray(w * n * h * 4),
  };
}

/**
 * Pixel i, j of the k-th of the pictures side by side in image, each w
 * across - colour c, alpha a (opaque unless given).
 */
export function put(image, w, k, i, j, c, a) {
  var o = (j * image.width + k * w + i) * 4;

  image.data[o] = Math.max(0, Math.min(255, Math.round(c[0])));
  image.data[o + 1] = Math.max(0, Math.min(255, Math.round(c[1])));
  image.data[o + 2] = Math.max(0, Math.min(255, Math.round(c[2])));
  image.data[o + 3] = a === undefined ? 255 : a;
}

/**
 * At night: nothing of a picture shines, and the whole of it is black,
 * as see-through as it is - for whatever has no light of its own.
 */
export function night(image) {
  var w = image.width,
    out = blank(w, image.height, 2);

  for (var j = 0; j < image.height; j++)
    for (var i = 0; i < w; i++) {
      var a = image.data[(j * w + i) * 4 + 3];

      if (a === 0) continue;
      put(out, w, 0, i, j, [0, 0, 0], a);
      put(out, w, 1, i, j, [0, 0, 0], a);
    }

  return out;
}
