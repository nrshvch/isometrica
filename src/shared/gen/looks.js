/**
 * What the painters that do not paint out of boxes (shared/gen/terrain,
 * trees, vehicles) share for painting a picture the ways the light is worked
 * out from as it is drawn - as shared/gen/isobox setMode has them:
 * "deferred", its colours with no light on them and which way every pixel of
 * it looks, side by side (DEFERRED); and "night", what of it shines with the
 * first of its lights on and with more of them, one way and another, the
 * whole of it in black, the light it throws round it, how high every pixel
 * of it is and the whole of it in white, side by side (NIGHT).
 */

//how many pictures side by side the night is painted in: what shines with
//the first lights on and with more of them, one way and another, the whole
//of it in black, the light it throws round it each of those ways, how high
//every pixel of it is, and the whole of it in white (see shared/gen/isobox
//NIGHT) - and which of them the height is
export var NIGHT = 11,
  HEIGHT = 9;

//how many it is painted in to be lit as it is drawn: its colours with no
//light on them, and which way every pixel of it looks (normal)
export var DEFERRED = 2;

//a height as the height picture has it, in the red, a pixel a unit
export function height1(z) {
  return [Math.max(0, Math.min(255, Math.round(z))), 0, 0];
}

/**
 * Which way a pixel looks, as the picture of that has it: x, y, z from
 * -1..1 to 0..255 in the red, the green and the blue - black for straight
 * up (isobox normalOf).
 */
export function normal(n) {
  var l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;

  if (n[2] / l > 0.999) return [0, 0, 0];

  return [
    Math.round(((n[0] / l) * 0.5 + 0.5) * 255),
    Math.round(((n[1] / l) * 0.5 + 0.5) * 255),
    Math.round(((n[2] / l) * 0.5 + 0.5) * 255),
  ];
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
 * To be lit as it is drawn, a picture that looks up all over: its colours
 * as they are, and black for the way it looks (normal).
 */
export function deferred(image) {
  var w = image.width,
    out = blank(w, image.height, DEFERRED);

  for (var j = 0; j < image.height; j++)
    for (var i = 0; i < w; i++) {
      var o = (j * w + i) * 4,
        a = image.data[o + 3];

      if (a === 0) continue;
      put(
        out,
        w,
        0,
        i,
        j,
        [image.data[o], image.data[o + 1], image.data[o + 2]],
        a,
      );
      put(out, w, 1, i, j, [0, 0, 0], a);
    }

  return out;
}

/**
 * At night: nothing of a picture shines, and the whole of it is black, as
 * see-through as it is, on the ground (height nought) - for whatever has no
 * light of its own and stands no higher than the ground.
 */
export function night(image) {
  var w = image.width,
    out = blank(w, image.height, NIGHT);

  for (var j = 0; j < image.height; j++)
    for (var i = 0; i < w; i++) {
      var a = image.data[(j * w + i) * 4 + 3];

      if (a === 0) continue;
      for (var k = 0; k < NIGHT; k++)
        put(out, w, k, i, j, k === NIGHT - 1 ? [255, 255, 255] : [0, 0, 0], a);
    }

  return out;
}
