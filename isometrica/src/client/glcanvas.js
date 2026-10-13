/**
 * What is drawn over the city as lines, shapes and words - the line round a
 * city, a tile picked out, a price over a building - drawn in WebGL as it
 * is: the part of a canvas's 2D context those drawers use (engine Renderer
 * render), drawn with into a layer of the frame (client/glview flush) in the
 * order it is drawn in, over the pictures of the layer.
 *
 * A shape is filled as the canvas fills it - wherever its outline goes round
 * a pixel more one way than the other - by counting round every pixel in the
 * stencil, and then covering what is not left at nothing; one that bulges
 * out everywhere, as a tile does, straight away. A line is drawn as a strip
 * along each of its edges, dashed as the canvas dashes it, every pixel of it
 * once however its strips cross at the corners. Words are written on a
 * canvas once - as they are, in their own font and colours - and drawn from
 * there for as long as they are written the same.
 */

//a corner of a shape to the shader: where it is on the screen, and its
//colour (red, green, blue, how much of it)
var SHAPE_FLOATS = 6;

//a corner of words: where it is on the screen, and where on their picture
var WORDS_FLOATS = 4;

//how long words not drawn are kept written, in frames, and how often the
//ones past it are put away
var WORDS_KEPT = 120,
  WORDS_SWEEP = 60;

var SHAPE_VS = `#version 300 es
precision highp float;
in vec2 at;
in vec4 color;
uniform vec2 size;
out vec4 vColor;
void main() {
  vColor = color;
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
}
`;

var WORDS_VS = `#version 300 es
precision highp float;
in vec2 at;
in vec2 uv;
uniform vec2 size;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
}
`;

//into the pictures of the lit city as a canvas laid over it was: its
//colours, looking up and on the ground where it mostly is (see glview
//WHOLE) - or over the city as it is
function fragment(main, lit) {
  return (
    `#version 300 es
precision highp float;
` +
    main.head +
    (lit
      ? `
layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;
vec4 whole(vec4 c) {
  return vec4(c.rgb, step(0.5, c.a));
}
void main() {
  vec4 c = colour();
  if (c.a <= 0.0) discard;
  out0 = c;
  out1 = whole(vec4(0.0, 0.0, 0.0, c.a));
  out2 = whole(vec4(0.0, 0.0, 0.0, c.a));
}
`
      : `
out vec4 out0;
void main() {
  vec4 c = colour();
  if (c.a <= 0.0) discard;
  out0 = c;
}
`)
  );
}

var SHAPE_FS = {
  head: `
in vec4 vColor;
vec4 colour() {
  return vColor;
}
`,
};

var WORDS_FS = {
  head: `
uniform sampler2D picture;
uniform float alpha;
in vec2 vUv;
vec4 colour() {
  vec4 c = texture(picture, vUv);
  return vec4(c.rgb, c.a * alpha);
}
`,
};

/**
 * @param view {GLView} whose frame it draws into
 */
function GLCanvas(view) {
  var gl = view.gl;

  this.view = view;
  //whether the screen has a stencil to count round shapes on - the lit
  //city's pictures always do (client/glview resize)
  this.counts = !!gl.getContextAttributes().stencil;
  this.gl = gl;
  //as big as the frame (engine Canvas2dRenderer clears it)
  this.canvas = { width: 0, height: 0 };

  this.shapes = [false, true].map(function (lit) {
    return program(gl, SHAPE_VS, fragment(SHAPE_FS, lit));
  });
  this.words = [false, true].map(function (lit) {
    return program(gl, WORDS_VS, fragment(WORDS_FS, lit));
  });

  this.buffer = gl.createBuffer();
  this.shapeVaos = this.shapes.map(function (p) {
    return vao(gl, p, this.buffer, [
      ["at", 2, 0],
      ["color", 4, 8],
    ]);
  }, this);
  this.wordsVaos = this.words.map(function (p) {
    return vao(gl, p, this.buffer, [
      ["at", 2, 0],
      ["uv", 2, 8],
    ]);
  }, this);

  //what is to be drawn this layer, in order (see draw)
  this.ops = [];
  //the corners of the shapes of it, and of the words
  this.data = new Float32Array(SHAPE_FLOATS * 3 * 256);
  this.used = 0;

  //words written, by how they are written - their picture and how big
  this.written = new Map();
  this.frame = 0;

  //for the colours, as the canvas has them
  this.parsed = new Map();
  this.parser = null;

  this.reset();
}

var p = GLCanvas.prototype;

/* --- The context ------------------------------------------------------- */

//how it starts, as a canvas's 2D context does - each layer as one of its
//own (client/glview flush)
p.reset = function () {
  this.fillStyle = "#000";
  this.strokeStyle = "#000";
  this.lineWidth = 1;
  this.lineJoin = "miter";
  this.globalAlpha = 1;
  this.font = "10px sans-serif";
  this.textAlign = "start";
  this.textBaseline = "alphabetic";
  this.dash = [];
  this.saved = [];
  this.beginPath();
};

var STATE = [
  "fillStyle",
  "strokeStyle",
  "lineWidth",
  "lineJoin",
  "globalAlpha",
  "font",
  "textAlign",
  "textBaseline",
  "dash",
];

p.save = function () {
  var s = {};

  for (var i = 0; i < STATE.length; i++) s[STATE[i]] = this[STATE[i]];
  this.saved.push(s);
};

p.restore = function () {
  var s = this.saved.pop();

  if (s === undefined) return;
  for (var i = 0; i < STATE.length; i++) this[STATE[i]] = s[STATE[i]];
};

p.setLineDash = function (dash) {
  var sum = dash.reduce(function (a, b) {
    return a + Math.max(0, b);
  }, 0);

  //nothing but gaps of nothing is a solid line, as the canvas has it; an
  //odd number of them is gone through twice
  if (!(sum > 0)) this.dash = [];
  else this.dash = dash.length % 2 === 1 ? dash.concat(dash) : dash.slice();
};

p.getLineDash = function () {
  return this.dash.slice();
};

//nothing to clear: what is drawn is drawn into the frame, once
p.clearRect = function () {};

p.beginPath = function () {
  this.path = [];
  this.sub = null;
};

p.moveTo = function (x, y) {
  this.sub = { points: [x, y], closed: false };
  this.path.push(this.sub);
};

p.lineTo = function (x, y) {
  if (this.sub === null) this.moveTo(x, y);
  else this.sub.points.push(x, y);
};

p.closePath = function () {
  if (this.sub === null) return;

  var pts = this.sub.points;

  this.sub.closed = true;
  //and goes on from where it started
  this.moveTo(pts[0], pts[1]);
};

/* --- Filling ----------------------------------------------------------- */

p.fill = function () {
  var c = this.colour(this.fillStyle),
    path = this.path.filter(function (s) {
      return s.points.length >= 6;
    });

  if (c === null || path.length === 0) return;

  //one that bulges out everywhere covers every pixel in it once, as a fan
  if (path.length === 1 && convex(path[0].points)) {
    this.shape("plain", fan(path[0].points, []), c);
    return;
  }

  var tris = [],
    box = [Infinity, Infinity, -Infinity, -Infinity];

  path.forEach(function (s) {
    fan(s.points, tris);
    bound(s.points, box);
  });

  this.ops.push({ kind: "count", tris: this.corners(tris, c) });
  this.ops.push({ kind: "cover", tris: this.corners(rect(box), c) });
};

/* --- Lines ------------------------------------------------------------- */

p.stroke = function () {
  var c = this.colour(this.strokeStyle),
    w = this.lineWidth,
    dash = this.dash,
    tris = [];

  if (c === null || w <= 0) return;

  //a pixel wide or so, drawn as lines
  var hair = w <= 1.5;

  this.path.forEach(function (s) {
    var pts = s.points.slice();

    if (s.closed) pts.push(pts[0], pts[1]);
    if (hair) hairline(pts, dash, tris);
    else strip(pts, w, dash, tris);
  });

  if (tris.length > 0) this.shape(hair ? "hair" : "line", tris, c);
};

/* --- Words ------------------------------------------------------------- */

p.fillText = function (text, x, y) {
  this.text(text, x, y, false);
};

p.strokeText = function (text, x, y) {
  this.text(text, x, y, true);
};

p.measureText = function (text) {
  var ctx = this.scratch();

  ctx.font = this.font;
  return ctx.measureText(text);
};

p.text = function (text, x, y, stroked) {
  text = String(text);
  if (text.length === 0 || this.globalAlpha <= 0) return;

  var style = stroked ? this.strokeStyle : this.fillStyle,
    key = [
      stroked ? "s" : "f",
      this.font,
      style,
      stroked ? this.lineWidth + this.lineJoin : "",
      this.textAlign,
      this.textBaseline,
      text,
    ].join("|"),
    w = this.written.get(key);

  if (w === undefined) {
    w = this.write(text, style, stroked);
    this.written.set(key, w);
  }

  w.seen = this.frame;
  if (w.tex === null) return;

  var x0 = Math.round(x - w.ox),
    y0 = Math.round(y - w.oy),
    x1 = x0 + w.w,
    y1 = y0 + w.h;

  this.ops.push({
    kind: "words",
    tex: w.tex,
    alpha: this.globalAlpha,
    tris: this.put(
      [
        x0,
        y0,
        0,
        0,
        x1,
        y0,
        1,
        0,
        x0,
        y1,
        0,
        1,
        x0,
        y1,
        0,
        1,
        x1,
        y0,
        1,
        0,
        x1,
        y1,
        1,
        1,
      ],
      WORDS_FLOATS,
    ),
  });
};

/**
 * The picture of text written as it is to be - in the font, colour and the
 * way it lines up with where it is written as they are just now - and where
 * that spot is on it.
 */
p.write = function (text, style, stroked) {
  var ctx = this.scratch(),
    pad = 2 + (stroked ? Math.ceil(this.lineWidth) : 0);

  ctx.font = this.font;
  ctx.textAlign = this.textAlign;
  ctx.textBaseline = this.textBaseline;

  var m = ctx.measureText(text),
    left = Math.ceil(m.actualBoundingBoxLeft || 0),
    right = Math.ceil(m.actualBoundingBoxRight || m.width),
    up = Math.ceil(m.actualBoundingBoxAscent || 0),
    down = Math.ceil(m.actualBoundingBoxDescent || 0),
    w = left + right + pad * 2,
    h = up + down + pad * 2;

  if (w <= 0 || h <= 0) return { tex: null, seen: 0 };

  var canvas = document.createElement("canvas"),
    c = canvas.getContext("2d");

  canvas.width = w;
  canvas.height = h;
  c.font = this.font;
  c.textAlign = this.textAlign;
  c.textBaseline = this.textBaseline;

  if (stroked) {
    c.lineJoin = this.lineJoin;
    c.lineWidth = this.lineWidth;
    c.strokeStyle = style;
    c.strokeText(text, pad + left, pad + up);
  } else {
    c.fillStyle = style;
    c.fillText(text, pad + left, pad + up);
  }

  var gl = this.gl,
    tex = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);

  return { tex: tex, w: w, h: h, ox: pad + left, oy: pad + up, seen: 0 };
};

//a little canvas to measure words on, and to make colours out
p.scratch = function () {
  if (this.parser === null)
    this.parser = document.createElement("canvas").getContext("2d");

  return this.parser;
};

/* --- Colours ----------------------------------------------------------- */

/**
 * A canvas colour as red, green, blue and how much of it, 0..1 - as see-
 * through as globalAlpha makes it too - or null for nothing to be drawn.
 */
p.colour = function (style) {
  var c = this.parsed.get(style);

  if (c === undefined) {
    c = parse(this.scratch(), style);
    this.parsed.set(style, c);
  }

  var a = c[3] * this.globalAlpha;

  return a > 0 ? [c[0], c[1], c[2], a] : null;
};

function parse(ctx, style) {
  if (typeof style !== "string") return [0, 0, 0, 0];

  //the canvas says it back as #rrggbb, or rgba(r, g, b, a)
  ctx.fillStyle = "#000";
  ctx.fillStyle = style;

  var s = ctx.fillStyle;

  if (s.charAt(0) === "#")
    return [
      parseInt(s.substr(1, 2), 16) / 255,
      parseInt(s.substr(3, 2), 16) / 255,
      parseInt(s.substr(5, 2), 16) / 255,
      1,
    ];

  var n = s
    .replace(/[^0-9.,]/g, "")
    .split(",")
    .map(Number);

  return [n[0] / 255, n[1] / 255, n[2] / 255, n.length > 3 ? n[3] : 1];
}

/* --- Into the frame ---------------------------------------------------- */

/**
 * Triangles of a shape, filled in colour c: drawn as they are ("plain"), or
 * every pixel of them once however they cross ("line") - or the ends of
 * lines a pixel wide, every pixel of them once too ("hair").
 */
p.shape = function (kind, tris, c) {
  var last = this.ops[this.ops.length - 1],
    data = this.corners(tris, c);

  //run on with the shapes just before it that are drawn the same way
  if (kind === "plain" && last !== undefined && last.kind === "plain")
    last.tris[1] += data[1];
  else this.ops.push({ kind: kind, tris: data });
};

//the corners of triangles - or the ends of lines - each in colour c, into
//the data
p.corners = function (tris, c) {
  var out = [];

  for (var i = 0; i < tris.length; i += 2)
    out.push(tris[i], tris[i + 1], c[0], c[1], c[2], c[3]);

  return this.put(out, SHAPE_FLOATS);
};

//floats, so many a corner, into the data: where they start, how many corners
p.put = function (floats, per) {
  //on a whole corner of its own kind, the two kinds sharing the data
  var at = Math.ceil(this.used / per) * per,
    need = at + floats.length;

  if (need > this.data.length) {
    var more = new Float32Array(Math.max(need, this.data.length * 2));

    more.set(this.data.subarray(0, this.used));
    this.data = more;
  }

  this.data.set(floats, at);
  this.used = need;

  return [at, floats.length / per];
};

//whether there is anything drawn this layer
p.any = function () {
  return this.ops.length > 0;
};

/**
 * Draws what was drawn this layer into frame - the pictures of the lit city
 * (lit), or the screen - over what is there, and starts over.
 */
p.draw = function (frame, lit) {
  var gl = this.gl,
    ops = this.ops,
    view = this.view,
    k = lit ? 1 : 0,
    ids = 0;

  this.canvas.width = view.width;
  this.canvas.height = view.height;

  if (ops.length === 0) return;

  gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
  if (lit)
    gl.drawBuffers([
      gl.COLOR_ATTACHMENT0,
      gl.COLOR_ATTACHMENT1,
      gl.COLOR_ATTACHMENT2,
    ]);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    this.data.subarray(0, this.used),
    gl.STREAM_DRAW,
  );

  gl.clearStencil(0);
  gl.stencilMask(0xff);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.STENCIL_TEST);

  for (var i = 0; i < ops.length; i++) {
    var op = ops[i],
      first = op.tris[0] / (op.kind === "words" ? WORDS_FLOATS : SHAPE_FLOATS),
      n = op.tris[1];

    if (op.kind === "words") {
      var w = this.words[k];

      gl.useProgram(w);
      gl.bindVertexArray(this.wordsVaos[k]);
      gl.uniform2f(gl.getUniformLocation(w, "size"), view.width, view.height);
      gl.uniform1f(gl.getUniformLocation(w, "alpha"), op.alpha);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, op.tex);
      gl.uniform1i(gl.getUniformLocation(w, "picture"), 0);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.drawArrays(gl.TRIANGLES, first, n);
      continue;
    }

    var s = this.shapes[k];

    gl.useProgram(s);
    gl.bindVertexArray(this.shapeVaos[k]);
    gl.uniform2f(gl.getUniformLocation(s, "size"), view.width, view.height);

    if (op.kind === "plain") {
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
    } else if (op.kind === "line" || op.kind === "hair") {
      //every pixel of it once: where it is not yet, and marked as it is -
      //each line by a number of its own, so they need no clearing between
      if (ids === 255) {
        gl.clear(gl.STENCIL_BUFFER_BIT);
        ids = 0;
      }
      ids++;
      gl.stencilFunc(gl.NOTEQUAL, ids, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
    } else if (!lit && !this.counts) {
      //nothing to count round it on: its outline filled as it goes,
      //holes and all, and nothing more to cover
      if (op.kind === "cover") continue;
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.drawArrays(gl.TRIANGLES, first, n);
      continue;
    } else if (op.kind === "count") {
      //how many times its outline goes round each pixel, one way or the
      //other - on a stencil cleared of the lines
      gl.clear(gl.STENCIL_BUFFER_BIT);
      ids = 0;
      gl.colorMask(false, false, false, false);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOpSeparate(gl.FRONT, gl.KEEP, gl.KEEP, gl.INCR_WRAP);
      gl.stencilOpSeparate(gl.BACK, gl.KEEP, gl.KEEP, gl.DECR_WRAP);
    } else {
      //covered where it is not at nothing, and the count put back to it
      gl.stencilFunc(gl.NOTEQUAL, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.ZERO);
    }

    gl.drawArrays(op.kind === "hair" ? gl.LINES : gl.TRIANGLES, first, n);
    if (op.kind === "count") gl.colorMask(true, true, true, true);
  }

  gl.disable(gl.STENCIL_TEST);
  gl.bindVertexArray(null);

  ops.length = 0;
  this.used = 0;
};

/**
 * A frame starts: words not drawn for a while are put away.
 */
p.begin = function () {
  var frame = ++this.frame,
    gl = this.gl;

  if (frame % WORDS_SWEEP !== 0) return;

  this.written.forEach(function (w, key, map) {
    if (frame - w.seen < WORDS_KEPT) return;
    if (w.tex !== null) gl.deleteTexture(w.tex);
    map.delete(key);
  });
};

/* --- Geometry ---------------------------------------------------------- */

//whether a closed outline, x, y after x, y, bulges out everywhere
function convex(pts) {
  var n = pts.length / 2,
    sign = 0;

  for (var i = 0; i < n; i++) {
    var a = i * 2,
      b = ((i + 1) % n) * 2,
      c = ((i + 2) % n) * 2,
      cross =
        (pts[b] - pts[a]) * (pts[c + 1] - pts[b + 1]) -
        (pts[b + 1] - pts[a + 1]) * (pts[c] - pts[b]);

    if (cross === 0) continue;
    if (sign === 0) sign = cross > 0 ? 1 : -1;
    else if ((cross > 0 ? 1 : -1) !== sign) return false;
  }

  return true;
}

//triangles from the first point to every edge after it, onto out
function fan(pts, out) {
  for (var i = 2; i + 3 < pts.length; i += 2)
    out.push(pts[0], pts[1], pts[i], pts[i + 1], pts[i + 2], pts[i + 3]);

  return out;
}

function bound(pts, box) {
  for (var i = 0; i < pts.length; i += 2) {
    box[0] = Math.min(box[0], pts[i]);
    box[1] = Math.min(box[1], pts[i + 1]);
    box[2] = Math.max(box[2], pts[i]);
    box[3] = Math.max(box[3], pts[i + 1]);
  }
}

function rect(box) {
  var x0 = box[0] - 1,
    y0 = box[1] - 1,
    x1 = box[2] + 1,
    y1 = box[3] + 1;

  return [x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1];
}

/**
 * The dashes of a line along pts, as the canvas dashes it - the dash going
 * on round the corners: each(x, y, ux, uy, a, b, start, end) for every
 * stretch of it drawn, from a to b along the edge from x, y going ux, uy -
 * start and end, whether it starts or ends where the edge does.
 */
function dashes(pts, dash, each) {
  var k = 0,
    left = dash.length > 0 ? dash[0] : Infinity,
    on = true;

  for (var i = 0; i + 3 < pts.length; i += 2) {
    var x0 = pts[i],
      y0 = pts[i + 1],
      dx = pts[i + 2] - x0,
      dy = pts[i + 3] - y0,
      len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) continue;

    var ux = dx / len,
      uy = dy / len,
      t = 0;

    //along the edge, a dash or a gap at a time
    while (t < len) {
      var step = Math.min(left, len - t);

      if (on) each(x0, y0, ux, uy, t, t + step, t === 0, t + step >= len);

      t += step;
      left -= step;

      if (left <= 0) {
        k = (k + 1) % dash.length;
        left = dash[k];
        on = !on;
      }
    }
  }
}

/**
 * A line w wide along pts as triangles onto out: a strip along each edge,
 * running on past either end of it by half its width so that the corners
 * are filled.
 */
function strip(pts, w, dash, out) {
  var h = w / 2;

  dashes(pts, dash, function (x, y, ux, uy, a, b, start, end) {
    quad(x, y, ux, uy, start ? a - h : a, end ? b + h : b, h, out);
  });
}

/**
 * A line a pixel wide along pts as the ends of its stretches onto out - to
 * be drawn as lines, a pixel for every step along them with none missed, as
 * a strip that thin would on a slope.
 */
function hairline(pts, dash, out) {
  dashes(pts, dash, function (x, y, ux, uy, a, b) {
    out.push(x + ux * a, y + uy * a, x + ux * b, y + uy * b);
  });
}

//a strip h either side of the line from x, y along ux, uy, from a to b on it
function quad(x, y, ux, uy, a, b, h, out) {
  var nx = -uy * h,
    ny = ux * h,
    ax = x + ux * a,
    ay = y + uy * a,
    bx = x + ux * b,
    by = y + uy * b;

  out.push(
    ax + nx,
    ay + ny,
    bx + nx,
    by + ny,
    ax - nx,
    ay - ny,
    ax - nx,
    ay - ny,
    bx + nx,
    by + ny,
    bx - nx,
    by - ny,
  );
}

/* --- WebGL ------------------------------------------------------------- */

function program(gl, vs, fs) {
  var p = gl.createProgram();

  [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ].forEach(function (s) {
    var sh = gl.createShader(s[0]);

    gl.shaderSource(sh, s[1]);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
      throw new Error(gl.getShaderInfoLog(sh));
    gl.attachShader(p, sh);
  });

  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p));

  return p;
}

//the corners of the shapes, or the words, to program p from buffer
function vao(gl, p, buffer, attrs) {
  var v = gl.createVertexArray(),
    stride = attrs.reduce(function (s, a) {
      return s + a[1] * 4;
    }, 0);

  gl.bindVertexArray(v);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  attrs.forEach(function (a) {
    var at = gl.getAttribLocation(p, a[0]);

    if (at < 0) return;
    gl.enableVertexAttribArray(at);
    gl.vertexAttribPointer(at, a[1], gl.FLOAT, false, stride, a[2]);
  });
  gl.bindVertexArray(null);

  return v;
}

export default GLCanvas;
