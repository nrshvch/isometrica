/**
 * A bench for lighting the city as it is drawn rather than as it is painted:
 * every sprite painted twice by the generators (shared/gen/isobox setMode) -
 * its colours with no light on them, and a map of which way each pixel looks,
 * black for -x, white for -y, grey for up - the map drawn into a canvas of its
 * own in the same order as the sprites, then turned into light for wherever
 * the sun is and multiplied over the frame. drawImage only: every flat colour
 * is a 1x1 swatch stretched over the canvas.
 *
 * Open /lab/lighting.html on the dev server (npm run dev).
 */
import * as iso from "shared/gen/isobox.js";
import * as Houses from "shared/gen/houses.js";

var TILE = iso.TILE,
  GRASS = [112, 158, 84];

/* --- Sprites ----------------------------------------------------------- */

//a picture as a canvas, every pixel as painted - no 16 bit rounding, which
//would tint a map's greys
function toCanvas(picture) {
  var c = document.createElement("canvas"),
    ctx = c.getContext("2d"),
    img = ctx.createImageData(Math.max(1, picture.w), Math.max(1, picture.h));

  c.width = img.width;
  c.height = img.height;
  picture.pixels.forEach(function (p, i) {
    if (p === null) return;
    img.data[i * 4] = p[0];
    img.data[i * 4 + 1] = p[1];
    img.data[i * 4 + 2] = p[2];
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);

  return c;
}

//the boxes painted three ways, each with the middle of its tile as the pivot
function sprite(boxes) {
  var mid = iso.project(TILE / 2, TILE / 2, 0),
    out = {};

  ["lit", "albedo", "map"].forEach(function (m) {
    iso.setMode(m);
    var pic = iso.render(boxes);

    out[m] = toCanvas(pic);
    out.pivotX = pic.pivotX + mid[0];
    out.pivotY = pic.pivotY + mid[1];
  });
  iso.setMode("lit");

  return out;
}

//the houses that stand on one tile, whole
function houses(count) {
  var parts = Object.keys(Houses.PARTS),
    has = {},
    out = [];

  parts.forEach(function (k) {
    has[k] = true;
  });
  parts.forEach(function (k) {
    if (out.length >= count || k.indexOf("houses/frame") === 0) return;
    if (!/\/0\/0$/.test(k)) return;

    var base = k.slice(0, -4);

    if (has[base + "/1/0"] || has[base + "/0/1"]) return;

    var boxes = iso
      .snapAll(Houses.partBoxes(k))
      .map(function (b) {
        return iso.clip(b, 0, TILE, 0, TILE);
      })
      .filter(Boolean);

    out.push(sprite(boxes));
  });

  return out;
}

var ground = sprite([iso.box(0, TILE, 0, TILE, -2, 0, GRASS)]),
  kinds = houses(24);

/**
 * Every sprite's three pictures packed onto one page of each kind, the way
 * the game's cache keeps them (client/canvascache) - a frame draws from three
 * images, not from a canvas per sprite. Each sprite gets sx, sy, w, h: where
 * all three of its pictures are on their pages.
 */
var pages = (function () {
  var all = [ground].concat(kinds),
    x = 0,
    y = 0,
    row = 0,
    size = 1024,
    out = {};

  all.forEach(function (s) {
    var w = s.lit.width,
      h = s.lit.height;

    if (x + w > size) {
      x = 0;
      y += row + 1;
      row = 0;
    }
    s.sx = x;
    s.sy = y;
    s.w = w;
    s.h = h;
    x += w + 1;
    row = Math.max(row, h);
  });

  ["lit", "albedo", "map"].forEach(function (kind) {
    var c = document.createElement("canvas"),
      ctx = c.getContext("2d");

    c.width = size;
    c.height = y + row + 1;
    all.forEach(function (s) {
      ctx.drawImage(s[kind], s.sx, s.sy);
    });
    out[kind] = c;
  });

  return out;
})();

/* --- Scene ------------------------------------------------------------- */

var scene = [];

function build(n) {
  var seed = 7,
    x,
    y;

  function rnd() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }

  scene = [];
  //the ground first, all of it, then what stands on it from the back
  for (x = 0; x < n; x++)
    for (y = 0; y < n; y++) scene.push({ x: x, y: y, s: ground, d: -1 });

  var stand = [];

  for (x = 0; x < n; x++)
    for (y = 0; y < n; y++)
      if (rnd() < 0.7)
        stand.push({ x: x, y: y, s: kinds[(rnd() * kinds.length) | 0] });

  stand.sort(function (a, b) {
    return b.x + b.y - (a.x + a.y);
  });
  scene = scene.concat(stand);
}

/* --- Canvases ---------------------------------------------------------- */

var frame = document.getElementById("frame"),
  fctx = frame.getContext("2d"),
  map = document.createElement("canvas"),
  mctx = map.getContext("2d"),
  //where the ops off the fast path happen, so they demote nothing else
  //(3d-with-canvas2d §6.13)
  lightA = document.createElement("canvas"),
  actx = lightA.getContext("2d"),
  lightB = document.createElement("canvas"),
  bctx = lightB.getContext("2d"),
  lightC = document.createElement("canvas"),
  cctx = lightC.getContext("2d"),
  W = 0,
  H = 0;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  [frame, map, lightA, lightB, lightC].forEach(function (c) {
    c.width = W;
    c.height = H;
    c.getContext("2d").imageSmoothingEnabled = false;
  });
}

window.addEventListener("resize", resize);
resize();

//a 1x1 canvas of one colour, stretched over a canvas to stand for a fill
function swatch() {
  var c = document.createElement("canvas");

  c.width = c.height = 1;
  c.ctx = c.getContext("2d");
  c.key = "";
  c.set = function (r, g, b) {
    var k = r + "," + g + "," + b;

    if (k === c.key) return c;
    c.key = k;
    c.ctx.clearRect(0, 0, 1, 1);
    c.ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
    c.ctx.fillRect(0, 0, 1, 1);

    return c;
  };

  return c;
}

var HALF = swatch().set(128, 128, 128),
  WHITE = swatch().set(255, 255, 255),
  swA = swatch(),
  swA1 = swatch(),
  swB = swatch(),
  swB1 = swatch(),
  swC = swatch(),
  swC1 = swatch(),
  swM = swatch();

function over(ctx, src, op) {
  ctx.globalCompositeOperation = op;
  ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, W, H);
}

/* --- Sun --------------------------------------------------------------- */

function mixc(a, b, k) {
  return [
    a[0] + (b[0] - a[0]) * k,
    a[1] + (b[1] - a[1]) * k,
    a[2] + (b[2] - a[2]) * k,
  ];
}

/**
 * The light on a top, and on the walls looking towards -x and -y, at hour h:
 * the sun comes up behind the walls looking -x, goes over the corner between
 * them at noon and down behind the ones looking -y, lower and redder towards
 * either end of the day; the shade is sky blue by day and dark blue at night.
 */
function sun(h) {
  var day = (h - 6) / 12,
    el = Math.sin(Math.PI * day),
    phi = Math.PI * (0.75 + day),
    up = Math.max(0, el) * 0.9,
    flat = Math.sqrt(1 - Math.min(1, up * up)),
    s = [Math.cos(phi) * flat, Math.sin(phi) * flat, up],
    lightness = Math.max(0, Math.min(1, el * 4)),
    color = mixc(
      [1, 0.62, 0.38],
      [1, 0.97, 0.9],
      Math.min(1, Math.max(0, el * 2)),
    ),
    amb = mixc(
      [0.1, 0.12, 0.24],
      [0.36, 0.39, 0.46],
      Math.max(0, Math.min(1, el * 3 + 0.4)),
    ),
    strength = 0.75 * lightness;

  function on(k) {
    return [0, 1, 2].map(function (c) {
      return Math.min(1, amb[c] + Math.max(0, k) * color[c] * strength);
    });
  }

  return { top: on(s[2]), left: on(-s[0]), right: on(-s[1]) };
}

/* --- Frame ------------------------------------------------------------- */

var modeSel = document.getElementById("mode"),
  showSel = document.getElementById("show"),
  sizeSel = document.getElementById("size"),
  timeIn = document.getElementById("time"),
  animate = document.getElementById("animate"),
  pan = document.getElementById("pan"),
  stats = document.getElementById("stats");

sizeSel.onchange = function () {
  build(+sizeSel.value);
};
build(+sizeSel.value);

function draw(ctx, kind, ox, oy) {
  var page = pages[kind];

  for (var i = 0; i < scene.length; i++) {
    var t = scene[i],
      s = t.s,
      p = iso.project(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, 0);

    ctx.drawImage(
      page,
      s.sx,
      s.sy,
      s.w,
      s.h,
      (ox + p[0] - s.pivotX) | 0,
      (oy + p[1] - s.pivotY) | 0,
      s.w,
      s.h,
    );
  }
}

function drawBoth(ox, oy) {
  var albedo = pages.albedo,
    maps = pages.map;

  for (var i = 0; i < scene.length; i++) {
    var t = scene[i],
      s = t.s,
      p = iso.project(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, 0),
      dx = (ox + p[0] - s.pivotX) | 0,
      dy = (oy + p[1] - s.pivotY) | 0;

    fctx.drawImage(albedo, s.sx, s.sy, s.w, s.h, dx, dy, s.w, s.h);
    mctx.drawImage(maps, s.sx, s.sy, s.w, s.h, dx, dy, s.w, s.h);
  }
}

function to255(v) {
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
}

/**
 * The map turned into light: a on what looks -x, c on tops, b on what looks
 * -y, a slope in between - each of them over M, the brightest of the three,
 * so that a wall the sun is low on can come out brighter than a roof - then
 * all of it times M.
 *
 *   A: map, darken ½, ×2 (color-dodge ½), ×(1−a), +a   ->  a | 1 | 1
 *   B: map, lighten ½, invert, ×2, ×(1−b), +b           ->  1 | 1 | b
 *   C: map, difference ½, ×2, ×(1−c), +c                ->  1 | c | 1
 *   A: darken B, darken C, × M                           ->  a·M | c·M | b·M
 */
function light(L) {
  var M = [0, 1, 2].map(function (c) {
      return Math.max(0.01, L.top[c], L.left[c], L.right[c]);
    }),
    a = [0, 1, 2].map(function (c) {
      return L.left[c] / M[c];
    }),
    b = [0, 1, 2].map(function (c) {
      return L.right[c] / M[c];
    }),
    t = [0, 1, 2].map(function (c) {
      return L.top[c] / M[c];
    });

  swA.set(to255(a[0]), to255(a[1]), to255(a[2]));
  swA1.set(to255(1 - a[0]), to255(1 - a[1]), to255(1 - a[2]));
  swB.set(to255(b[0]), to255(b[1]), to255(b[2]));
  swB1.set(to255(1 - b[0]), to255(1 - b[1]), to255(1 - b[2]));
  swC.set(to255(t[0]), to255(t[1]), to255(t[2]));
  swC1.set(to255(1 - t[0]), to255(1 - t[1]), to255(1 - t[2]));
  swM.set(to255(M[0]), to255(M[1]), to255(M[2]));

  over(actx, map, "copy");
  over(actx, HALF, "darken");
  over(actx, HALF, "color-dodge");
  over(actx, swA1, "multiply");
  over(actx, swA, "lighter");

  over(bctx, map, "copy");
  over(bctx, HALF, "lighten");
  over(bctx, WHITE, "difference");
  over(bctx, HALF, "color-dodge");
  over(bctx, swB1, "multiply");
  over(bctx, swB, "lighter");

  over(cctx, map, "copy");
  over(cctx, HALF, "difference");
  over(cctx, HALF, "color-dodge");
  over(cctx, swC1, "multiply");
  over(cctx, swC, "lighter");

  over(actx, lightB, "darken");
  over(actx, lightC, "darken");
  over(actx, swM, "multiply");
}

var times = [],
  costs = [],
  last = 0;

//what is timed starts again with whatever changes what is drawn
modeSel.addEventListener("change", function () {
  times = [];
  costs = [];
});
sizeSel.addEventListener("change", function () {
  times = [];
  costs = [];
});

function tick(now) {
  var dt = now - last;

  last = now;
  if (dt > 0 && dt < 500) times.push(dt);
  if (times.length > 120) times.shift();

  if (animate.checked)
    timeIn.value = ((+timeIn.value + dt / 1000) % 24).toFixed(2);

  var n = +sizeSel.value,
    wobble = pan.checked ? Math.sin(now / 1500) * 40 : 0,
    ox = (W / 2 + wobble) | 0,
    oy = ((H + n * TILE) / 2) | 0,
    mode = modeSel.value,
    t0 = performance.now();

  fctx.globalCompositeOperation = "source-over";
  fctx.clearRect(0, 0, W, H);

  if (mode === "lit") draw(fctx, "lit", ox, oy);
  else {
    //the map's backdrop looks up, so where nothing stands the light is T
    over(mctx, HALF, "copy");
    mctx.globalCompositeOperation = "source-over";

    if (mode === "seq") {
      draw(fctx, "albedo", ox, oy);
      draw(mctx, "map", ox, oy);
    } else drawBoth(ox, oy);

    light(sun(+timeIn.value));

    if (showSel.value === "frame") over(fctx, lightA, "multiply");
    else over(fctx, showSel.value === "map" ? map : lightA, "copy");
  }

  costs.push(performance.now() - t0);
  if (costs.length > 120) costs.shift();

  var avg = function (a) {
    return (
      a.reduce(function (s, v) {
        return s + v;
      }, 0) / Math.max(1, a.length)
    );
  };

  stats.textContent =
    "sprites  " +
    scene.length * (mode === "lit" ? 1 : 2) +
    " draws\n" +
    "frame    " +
    avg(times).toFixed(2) +
    " ms (" +
    (1000 / Math.max(1, avg(times))).toFixed(0) +
    " fps)\n" +
    "js       " +
    avg(costs).toFixed(2) +
    " ms\n" +
    "time     " +
    (+timeIn.value).toFixed(1) +
    " h";

  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
