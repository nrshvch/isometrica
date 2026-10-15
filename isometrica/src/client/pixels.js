//Pictures as plain pixels - {width, height, data}, data RGBA, not
//premultiplied, the way the generators paint them - and putting them
//together the way a 2d canvas would, without one.
//
//A canvas would keep them on the GPU, and every picture put together on one
//would have to be read back off it to be handed over to a page of the canvas
//cache (client/canvascache) - a wait for the GPU on the main thread, every
//time. Kept as pixels, they never leave the CPU until they are uploaded.
//
//Every function puts w by h of src, from sx, sy, at dx, dy of dst - pixels dw
//wide - whatever of it falls outside dst left out.

/**
 * As drawImage would, source-over.
 */
function over(dst, dw, src, sx, sy, w, h, dx, dy) {
  put(dst, dw, src, sx, sy, w, h, dx, dy, OVER, 0, 0, 0, 0);
}

/**
 * The shape of it, all in one colour, source-over - what is behind it hidden
 * as much as it is there.
 */
function silhouette(dst, dw, src, sx, sy, w, h, dx, dy, r, g, b) {
  put(dst, dw, src, sx, sy, w, h, dx, dy, SHAPE, r, g, b, 0);
}

/**
 * The shape of it in white, as much as amount 0..1 of it, added onto what is
 * there ("lighter").
 */
function lighten(dst, dw, src, sx, sy, w, h, dx, dy, amount) {
  put(dst, dw, src, sx, sy, w, h, dx, dy, LIGHTER, 0, 0, 0, amount);
}

var OVER = 0,
  SHAPE = 1,
  LIGHTER = 2;

function put(dst, dw, src, sx, sy, w, h, dx, dy, how, r, g, b, amount) {
  var dh = dst.length / (dw * 4),
    sw = src.width,
    sd = src.data,
    i,
    j;

  //to the nearest whole pixel - a picture put half a pixel over, as a
  //parked car may be, lands on the pixel its middle is nearest, never
  //between rows of the pixels
  dx = Math.floor(dx + 0.5);
  dy = Math.floor(dy + 0.5);
  sx = Math.floor(sx + 0.5);
  sy = Math.floor(sy + 0.5);
  w = Math.floor(w + 0.5);
  h = Math.floor(h + 0.5);

  //what falls outside either picture left out
  if (dx < 0) {
    sx -= dx;
    w += dx;
    dx = 0;
  }
  if (dy < 0) {
    sy -= dy;
    h += dy;
    dy = 0;
  }
  w = Math.min(w, dw - dx, sw - sx);
  h = Math.min(h, dh - dy, src.height - sy);

  for (j = 0; j < h; j++) {
    var s = ((sy + j) * sw + sx) * 4,
      d = ((dy + j) * dw + dx) * 4;

    for (i = 0; i < w; i++, s += 4, d += 4) {
      var sa = sd[s + 3];

      if (sa === 0) continue;

      if (how === LIGHTER) {
        add(dst, d, sa * amount);
        continue;
      }

      var sr = how === SHAPE ? r : sd[s],
        sg = how === SHAPE ? g : sd[s + 1],
        sb = how === SHAPE ? b : sd[s + 2];

      if (sa === 255) {
        dst[d] = sr;
        dst[d + 1] = sg;
        dst[d + 2] = sb;
        dst[d + 3] = 255;
        continue;
      }

      //over what is there, as much as it is there
      var da = dst[d + 3] * (255 - sa),
        oa = sa * 255 + da;

      dst[d] = (sr * sa * 255 + dst[d] * da) / oa;
      dst[d + 1] = (sg * sa * 255 + dst[d + 1] * da) / oa;
      dst[d + 2] = (sb * sa * 255 + dst[d + 2] * da) / oa;
      dst[d + 3] = oa / 255;
    }
  }
}

//white, as much as a of 255 of it, added onto the pixel at d - premultiplied,
//as a canvas adds, and back again
function add(dst, d, a) {
  var da = dst[d + 3],
    oa = Math.min(255, da + a);

  if (oa === 0) return;

  var k = 255 / oa,
    f = da / 255;

  dst[d] = (dst[d] * f + a) * k;
  dst[d + 1] = (dst[d + 1] * f + a) * k;
  dst[d + 2] = (dst[d + 2] * f + a) * k;
  dst[d + 3] = oa;
}

/**
 * The pixels of a picture the browser decoded - an ImageBitmap, an image.
 */
function fromImage(image) {
  var w = image.width,
    h = image.height,
    canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : Object.assign(document.createElement("canvas"), {
            width: w,
            height: h,
          }),
    ctx = canvas.getContext("2d", { willReadFrequently: true });

  ctx.drawImage(image, 0, 0);

  return { width: w, height: h, data: ctx.getImageData(0, 0, w, h).data };
}

export default {
  over: over,
  silhouette: silhouette,
  lighten: lighten,
  fromImage: fromImage,
};
