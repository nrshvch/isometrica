/**
 * Light thrown on the ground at night: the pool under a street light, the
 * beams of a car's headlights. Each is a picture painted here once, crisp -
 * the light falling off in a few steps, dithered between them the way the
 * rest of the pixel art is - and drawn only with what shines at night
 * (client/lighting): in the light's other passes, and with the light off
 * (?light=0), not at all. Drawn among the buildings at the depth of what
 * casts it, so whatever stands in front of the light hides it.
 */
import Lighting from "./lighting";

//the dither the steps of light are broken up with, 4x4
var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * A picture of light that shines, and nothing else (see client/cachedsprite
 * lightPass): drawn in the pass of what shines while what casts it is on
 * (Lighting shines), and in no other, never otherwise.
 */
function Glow(canvas, pivotX, pivotY) {
  this.sourceImage = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.offsetX = 0;
  this.offsetY = 0;
  this.pivotX = pivotX;
  this.pivotY = pivotY;
}

Glow.prototype.acquire = function () {
  return false;
};

Glow.prototype.lightPass = function (pass, flat, renderer) {
  return pass === Lighting.SHINE && Lighting.shines(renderer) ? this : null;
};

/**
 * Paints light over the ground round 0, 0 - k(x, y) how bright, 0..1, at a
 * point on the ground, color at its brightest - stepped and dithered.
 */
function paint(reach, k, color) {
  //a point of the ground x, y is x - y across the screen from 0, 0 and
  //(x + y) / 2 up it (shared/gen/isobox project)
  var w = Math.ceil(reach * 4) + 2,
    h = Math.ceil(w / 2) + 2,
    canvas = document.createElement("canvas"),
    ctx,
    img,
    i,
    j;

  canvas.width = w;
  canvas.height = h;
  ctx = canvas.getContext("2d");
  img = ctx.createImageData(w, h);

  for (j = 0; j < h; j++)
    for (i = 0; i < w; i++) {
      //the point on the ground the pixel is of: project inverted, z 0
      var sx = i - w / 2 + 0.5,
        sy = j - h / 2 + 0.5,
        gx = sx / 2 - sy,
        gy = -sx / 2 - sy,
        v = k(gx, gy);

      if (v <= 0) continue;

      //three steps of light, dithered between
      var level = v * 3,
        step = Math.floor(level),
        up = level - step > (BAYER[(j % 4) * 4 + (i % 4)] + 0.5) / 16 ? 1 : 0,
        s = Math.min(3, step + up) / 3,
        o = (j * w + i) * 4;

      if (s === 0) continue;

      img.data[o] = color[0] * s;
      img.data[o + 1] = color[1] * s;
      img.data[o + 2] = color[2] * s;
      img.data[o + 3] = 255;
    }

  ctx.putImageData(img, 0, 0);

  return new Glow(canvas, w / 2, h / 2);
}

var pool = null,
  beams = {};

/**
 * The pool of light on the ground under a street light, its middle where
 * the lamp is.
 */
function lampPool() {
  if (pool === null)
    pool = paint(
      13,
      function (x, y) {
        var d = Math.sqrt(x * x + y * y) / 13;

        return d < 1 ? 0.55 * (1 - d * d) : 0;
      },
      [255, 190, 110],
    );

  return pool;
}

/**
 * The beams of a car's headlights going heading as it is seen ("x+", "y-"
 * - see client/view heading), from length/2 ahead of the car's middle: two
 * cones of light spreading out on the road in front of it.
 */
function headlights(heading, length) {
  var key = heading + "/" + length;

  if (beams[key] === undefined) {
    var along = heading[0] === "x",
      sign = heading[1] === "+" ? 1 : -1,
      start = length / 2,
      far = 16;

    beams[key] = paint(
      start + far,
      function (x, y) {
        var a = (along ? x : y) * sign - start,
          c = along ? y : x;

        if (a < 0 || a > far) return 0;

        var spread = 1.2 + a * 0.35;

        return Math.abs(c) < spread ? 0.6 * (1 - a / far) : 0;
      },
      [255, 244, 210],
    );
  }

  return beams[key];
}

export default { Glow: Glow, lampPool: lampPool, headlights: headlights };
