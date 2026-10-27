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

import engine from "engine";

var Stats = engine.Stats;

//for a debug panel (engine Stats): the draw calls made - counted with the
//rest of the frame's (client/glview) - and the shapes, lines and words drawn,
//and their corners
var DRAWS = Stats.counter("draw calls"),
  OPS = Stats.counter("overlay ops"),
  CORNERS = Stats.counter("overlay corners");

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
//glowing as bright as its colours, whatever the light (client/glview GLOW)
uniform float glow;
//how high in the world it stands, a pixel a unit, to be hidden behind
//whatever stands nearer the eye - or below -999 for over everything
uniform float standsAt;
uniform vec2 size;
vec4 whole(vec4 c) {
  return vec4(c.rgb, step(0.5, c.a));
}
float depthOf(float y, float z) {
  return clamp(0.5 - (2.0 * y + 3.0 * z) / 16384.0, 0.0, 1.0);
}
void main() {
  vec4 c = colour();
  if (c.a <= 0.0) discard;
  gl_FragDepth = standsAt > -999.0
    ? depthOf(size.y - gl_FragCoord.y, standsAt)
    : gl_FragCoord.z;
  out0 = c;
  out1 = whole(vec4(0.0, 0.0, 0.0, c.a));
  out2 = whole(vec4(0.0, 0.0, glow, c.a));
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

  //where each program's uniforms are, asked for once
  this.shapeUniforms = this.shapes.map(function (p) {
    return {
      size: gl.getUniformLocation(p, "size"),
      glow: gl.getUniformLocation(p, "glow"),
      standsAt: gl.getUniformLocation(p, "standsAt"),
    };
  });
  this.wordsUniforms = this.words.map(function (p) {
    return {
      size: gl.getUniformLocation(p, "size"),
      alpha: gl.getUniformLocation(p, "alpha"),
      picture: gl.getUniformLocation(p, "picture"),
    };
  });
  //the lit city's three pictures, drawn into at once
  this.three = [
    gl.COLOR_ATTACHMENT0,
    gl.COLOR_ATTACHMENT1,
    gl.COLOR_ATTACHMENT2,
  ];

  //what is to be drawn this layer, in order (see draw): so many of the ops
  //kept, each filled in afresh (op) - made once, drawn again and again
  this.ops = [];
  this.opCount = 0;
  //the corners of the shapes of it, and of the words
  this.data = new Float32Array(SHAPE_FLOATS * 3 * 256);
  this.used = 0;

  //words written, by how they are written - their picture and how big
  this.written = new Map();
  this.frame = 0;

  //for the colours, as the canvas has them - and the one asked for last,
  //as see-through as it is drawn (colour)
  this.parsed = new Map();
  this.parser = null;
  this.rgba = [0, 0, 0, 0];

  //the path, as flat as it goes: every point of it, x and y after x and y
  //(points, so many of them used); where each piece of it starts among them
  //and whether it is closed (starts, closed, pieces); whether there is a
  //piece going on now (open); and the piece it starts at (from) - a
  //rectangle filled or drawn round has a path of its own after it, gone
  //again once it is (fillRect)
  this.points = new Float64Array(256);
  this.pointsUsed = 0;
  this.starts = new Int32Array(32);
  this.closed = new Uint8Array(32);
  this.pieces = 0;
  this.from = 0;
  this.open = false;

  //where the corners being written go next in the data (begin)
  this.writing = 0;

  //the states saved, kept to be saved into again (save), and how many of
  //them are saved now
  this.saved = [];
  this.depth = 0;

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
  this.dash = NO_DASH;
  //drawn glowing in the lit city, as bright as its colours whatever the
  //light - not a canvas's own (client/glview GLOW)
  this.glow = false;
  //how high in the world what is drawn stands, a pixel a unit, for it to be
  //hidden behind whatever stands nearer the eye (client/glview depthOf) -
  //null for over everything; not a canvas's own either
  this.standsAt = null;
  //drawn even when the city is drawn bare, as part of the ground - the grid
  //over it (client/glview bare); not a canvas's own either
  this.ground = false;
  this.depth = 0;
  this.beginPath();
};

//no dash at all, a solid line - shared, never changed
var NO_DASH = [];

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
  "glow",
  "standsAt",
  "ground",
];

p.save = function () {
  var s = this.saved[this.depth];

  if (s === undefined) s = this.saved[this.depth] = {};
  for (var i = 0; i < STATE.length; i++) s[STATE[i]] = this[STATE[i]];
  this.depth++;
};

p.restore = function () {
  if (this.depth === 0) return;

  var s = this.saved[--this.depth];

  for (var i = 0; i < STATE.length; i++) this[STATE[i]] = s[STATE[i]];
};

p.setLineDash = function (dash) {
  var sum = 0,
    i;

  for (i = 0; i < dash.length; i++) sum += Math.max(0, dash[i]);

  //nothing but gaps of nothing is a solid line, as the canvas has it; an
  //odd number of them is gone through twice
  if (!(sum > 0)) this.dash = NO_DASH;
  //the same as it is, as it mostly is - a renderer sets its dash every
  //time it draws: kept, not made again (a saved state may hold the one
  //there is, so it is never changed, only put in the place of)
  else if (!sameDash(this.dash, dash))
    this.dash = dash.length % 2 === 1 ? dash.concat(dash) : dash.slice();
};

//whether dash is was, as setLineDash has it - gone through twice, if odd
function sameDash(was, dash) {
  var n = dash.length,
    i;

  if (was.length !== (n % 2 === 1 ? 2 * n : n)) return false;
  for (i = 0; i < was.length; i++) if (was[i] !== dash[i % n]) return false;

  return true;
}

p.getLineDash = function () {
  return this.dash.slice();
};

//nothing to clear: what is drawn is drawn into the frame, once
p.clearRect = function () {};

p.beginPath = function () {
  this.pointsUsed = 0;
  this.pieces = 0;
  this.from = 0;
  this.open = false;
};

p.moveTo = function (x, y) {
  if (this.pieces === this.starts.length) {
    this.starts = grown(this.starts, this.pieces * 2);
    this.closed = grown(this.closed, this.pieces * 2);
  }

  this.starts[this.pieces] = this.pointsUsed;
  this.closed[this.pieces] = 0;
  this.pieces++;
  this.open = true;
  point(this, x, y);
};

p.lineTo = function (x, y) {
  if (!this.open) this.moveTo(x, y);
  else point(this, x, y);
};

p.closePath = function () {
  if (!this.open) return;

  var at = this.starts[this.pieces - 1];

  this.closed[this.pieces - 1] = 1;
  //and goes on from where it started
  this.moveTo(this.points[at], this.points[at + 1]);
};

p.rect = function (x, y, w, h) {
  this.moveTo(x, y);
  this.lineTo(x + w, y);
  this.lineTo(x + w, y + h);
  this.lineTo(x, y + h);
  this.closePath();
};

/**
 * Round from angle a0 to a1 about x, y, r out - the other way round if
 * anticlockwise - joined on from where the path is, as the canvas does: in
 * short straight steps, about two pixels each.
 */
p.arc = function (x, y, r, a0, a1, anticlockwise) {
  var full = Math.PI * 2,
    //a whole turn and more is round once; anything less goes the short way
    //on from a0 that the direction says, as the canvas has it
    sweep = anticlockwise
      ? a0 - a1 >= full
        ? -full
        : -((((a0 - a1) % full) + full) % full)
      : a1 - a0 >= full
        ? full
        : (((a1 - a0) % full) + full) % full;

  var n = Math.max(8, Math.ceil((Math.abs(sweep) * r) / 2));

  for (var i = 0; i <= n; i++) {
    var a = a0 + (sweep * i) / n,
      px = x + Math.cos(a) * r,
      py = y + Math.sin(a) * r;

    if (i === 0 && !this.open) this.moveTo(px, py);
    else this.lineTo(px, py);
  }
};

//a rectangle filled, or its outline drawn, on a path of its own after the
//one there is - which is left as it was
p.fillRect = function (x, y, w, h) {
  var from = this.from,
    pieces = this.pieces,
    used = this.pointsUsed,
    open = this.open;

  this.from = pieces;
  this.open = false;
  this.rect(x, y, w, h);
  this.fill();
  this.from = from;
  this.pieces = pieces;
  this.pointsUsed = used;
  this.open = open;
};

p.strokeRect = function (x, y, w, h) {
  var from = this.from,
    pieces = this.pieces,
    used = this.pointsUsed,
    open = this.open;

  this.from = pieces;
  this.open = false;
  this.rect(x, y, w, h);
  this.stroke();
  this.from = from;
  this.pieces = pieces;
  this.pointsUsed = used;
  this.open = open;
};

//draws on a path of its own, the path as it was kept for after
p.alone = function (draw) {
  var from = this.from,
    pieces = this.pieces,
    used = this.pointsUsed,
    open = this.open;

  this.from = pieces;
  this.open = false;
  draw.call(this);
  this.from = from;
  this.pieces = pieces;
  this.pointsUsed = used;
  this.open = open;
};

//a point onto the path's points
function point(self, x, y) {
  if (self.pointsUsed + 2 > self.points.length)
    self.points = grown(self.points, self.points.length * 2);

  self.points[self.pointsUsed++] = x;
  self.points[self.pointsUsed++] = y;
}

//where piece i of the path ends among its points
function pieceEnd(self, i) {
  return i + 1 < self.pieces ? self.starts[i + 1] : self.pointsUsed;
}

//a typed array as long as n, what was in it kept
function grown(a, n) {
  var more = new a.constructor(n);

  more.set(a);

  return more;
}

/* --- Filling ----------------------------------------------------------- */

p.fill = function () {
  var c = this.colour(this.fillStyle),
    first = -1,
    count = 0,
    i;

  if (c === null) return;

  //of a shape at all: three points and more
  for (i = this.from; i < this.pieces; i++)
    if (pieceEnd(this, i) - this.starts[i] >= 6) {
      if (first === -1) first = i;
      count++;
    }

  if (count === 0) return;

  var points = this.points,
    at,
    n,
    o;

  //one that bulges out everywhere covers every pixel in it once, as a fan
  if (
    count === 1 &&
    convex(points, this.starts[first], pieceEnd(this, first))
  ) {
    at = begin(this, SHAPE_FLOATS);
    fan(this, this.starts[first], pieceEnd(this, first), c);
    this.shape("plain", c, at, finish(this, at, SHAPE_FLOATS));
    return;
  }

  var x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity,
    j,
    end;

  at = begin(this, SHAPE_FLOATS);
  for (i = first; i < this.pieces; i++) {
    end = pieceEnd(this, i);
    if (end - this.starts[i] < 6) continue;

    fan(this, this.starts[i], end, c);
    for (j = this.starts[i]; j < end; j += 2) {
      x0 = Math.min(x0, points[j]);
      y0 = Math.min(y0, points[j + 1]);
      x1 = Math.max(x1, points[j]);
      y1 = Math.max(y1, points[j + 1]);
    }
  }
  n = finish(this, at, SHAPE_FLOATS);
  o = nextOp(this, "count");
  o.at = at;
  o.n = n;

  //and a rectangle round all of it, to cover what is not at nothing
  x0 -= 1;
  y0 -= 1;
  x1 += 1;
  y1 += 1;
  at = begin(this, SHAPE_FLOATS);
  vertex(this, x0, y0, c);
  vertex(this, x1, y0, c);
  vertex(this, x0, y1, c);
  vertex(this, x0, y1, c);
  vertex(this, x1, y0, c);
  vertex(this, x1, y1, c);
  o = nextOp(this, "cover");
  o.at = at;
  o.n = finish(this, at, SHAPE_FLOATS);
  o.glow = this.glow;
  o.z = this.standsAt;
};

/* --- Lines ------------------------------------------------------------- */

p.stroke = function () {
  var c = this.colour(this.strokeStyle),
    w = this.lineWidth,
    at,
    n,
    i;

  if (c === null || w <= 0) return;

  //a pixel wide or so, drawn as lines
  var hair = w <= 1.5;

  at = begin(this, SHAPE_FLOATS);
  for (i = this.from; i < this.pieces; i++) line(this, i, w, hair, c);
  n = finish(this, at, SHAPE_FLOATS);

  if (n > 0) this.shape(hair ? "hair" : "line", c, at, n);
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
    key =
      (stroked ? "s" : "f") +
      "|" +
      this.font +
      "|" +
      style +
      "|" +
      (stroked ? this.lineWidth + this.lineJoin : "") +
      "|" +
      this.textAlign +
      "|" +
      this.textBaseline +
      "|" +
      text,
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
    y1 = y0 + w.h,
    at = begin(this, WORDS_FLOATS);

  corner(this, x0, y0, 0, 0);
  corner(this, x1, y0, 1, 0);
  corner(this, x0, y1, 0, 1);
  corner(this, x0, y1, 0, 1);
  corner(this, x1, y0, 1, 0);
  corner(this, x1, y1, 1, 1);

  var o = nextOp(this, "words");

  o.tex = w.tex;
  o.alpha = this.globalAlpha;
  o.at = at;
  o.n = finish(this, at, WORDS_FLOATS);
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
 * The same array every time, filled in afresh: for what is drawn there and
 * then, not to be kept.
 */
p.colour = function (style) {
  var c = this.parsed.get(style),
    out = this.rgba;

  if (c === undefined) {
    c = parse(this.scratch(), style);
    this.parsed.set(style, c);
  }

  var a = c[3] * this.globalAlpha;

  if (!(a > 0)) return null;

  out[0] = c[0];
  out[1] = c[1];
  out[2] = c[2];
  out[3] = a;

  return out;
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
 * The n corners written from at on (begin), of triangles of a shape filled in
 * colour c: drawn as they are ("plain"), or every pixel of them once however
 * they cross ("line") - or the ends of lines a pixel wide, every pixel of
 * them once too ("hair").
 */
p.shape = function (kind, c, at, n) {
  var last = this.opCount > 0 ? this.ops[this.opCount - 1] : null,
    o;

  //run on with the shapes just before it that are drawn the same way
  if (
    kind === "plain" &&
    last !== null &&
    last.kind === "plain" &&
    last.glow === this.glow &&
    last.z === this.standsAt &&
    last.ground === this.ground
  )
    last.n += n;
  else {
    o = nextOp(this, kind);
    o.at = at;
    o.n = n;
    o.glow = this.glow;
    o.z = this.standsAt;
    o.ground = this.ground;
  }
};

/**
 * The next op of the layer, of kind: the corners it draws from at, n of
 * them; glowing, how high it stands (null for over everything) and whether
 * it is part of the ground; and for words, their picture and how see-through
 * they are. Made once, and filled in afresh every time it is used again.
 */
function nextOp(self, kind) {
  var o = self.ops[self.opCount];

  if (o === undefined)
    o = self.ops[self.opCount] = {
      kind: "",
      at: 0,
      n: 0,
      glow: false,
      z: null,
      ground: false,
      tex: null,
      alpha: 1,
    };

  self.opCount++;
  o.kind = kind;
  o.glow = false;
  o.z = null;
  o.ground = false;
  o.tex = null;
  o.alpha = 1;

  return o;
}

/**
 * Corners are written straight into the data, one after another: from where
 * begin says - on a whole corner of their own kind, the two kinds sharing
 * the data - till finish, which says how many there were. A line over the
 * whole screen has thousands, and none of them go anywhere else first.
 */
function begin(self, per) {
  self.writing = Math.ceil(self.used / per) * per;

  return self.writing;
}

function finish(self, at, per) {
  //nothing written takes up nothing, not even the room to start on a whole
  //corner
  if (self.writing > at) self.used = self.writing;

  return (self.writing - at) / per;
}

//room for count more floats where the corners are being written
function room(self, count) {
  var need = self.writing + count;

  if (need > self.data.length) {
    var more = new Float32Array(Math.max(need, self.data.length * 2));

    more.set(self.data.subarray(0, self.writing));
    self.data = more;
  }
}

//a corner of a shape - or an end of a line - at x, y in colour c
function vertex(self, x, y, c) {
  room(self, SHAPE_FLOATS);

  var d = self.data,
    o = self.writing;

  d[o] = x;
  d[o + 1] = y;
  d[o + 2] = c[0];
  d[o + 3] = c[1];
  d[o + 4] = c[2];
  d[o + 5] = c[3];
  self.writing = o + SHAPE_FLOATS;
}

//a corner of words at x, y, and where it is on their picture, u, v
function corner(self, x, y, u, v) {
  room(self, WORDS_FLOATS);

  var d = self.data,
    o = self.writing;

  d[o] = x;
  d[o + 1] = y;
  d[o + 2] = u;
  d[o + 3] = v;
  self.writing = o + WORDS_FLOATS;
}

//whether there is anything drawn this layer
p.any = function () {
  return this.opCount > 0;
};

//what was drawn this layer, let go of undrawn (client/glview overlayShown)
p.discard = function () {
  this.opCount = 0;
  this.used = 0;
};

/**
 * Draws what was drawn this layer into frame - the pictures of the lit city
 * (lit), or the screen - over what is there, and starts over. Of a city
 * drawn bare, only what is drawn as part of the ground (ground).
 */
p.draw = function (frame, lit, bare) {
  var gl = this.gl,
    ops = this.ops,
    count = this.opCount,
    view = this.view,
    k = lit ? 1 : 0,
    ids = 0;

  this.canvas.width = view.width;
  this.canvas.height = view.height;

  if (count === 0) return;

  Stats.count(OPS, count);
  gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
  if (lit) gl.drawBuffers(this.three);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
  //as much of the data as is used, no view made of it
  gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STREAM_DRAW, 0, this.used);

  gl.clearStencil(0);
  gl.stencilMask(0xff);
  gl.clear(gl.STENCIL_BUFFER_BIT);
  gl.enable(gl.STENCIL_TEST);

  for (var i = 0; i < count; i++) {
    var op = ops[i],
      first = op.at / (op.kind === "words" ? WORDS_FLOATS : SHAPE_FLOATS),
      n = op.n;

    if (bare && !op.ground) continue;

    if (op.kind === "words") {
      var wu = this.wordsUniforms[k];

      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(this.words[k]);
      gl.bindVertexArray(this.wordsVaos[k]);
      gl.uniform2f(wu.size, view.width, view.height);
      gl.uniform1f(wu.alpha, op.alpha);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, op.tex);
      gl.uniform1i(wu.picture, 0);
      gl.stencilFunc(gl.ALWAYS, 0, 0xff);
      gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
      gl.drawArrays(gl.TRIANGLES, first, n);
      Stats.count(DRAWS, 1);
      Stats.count(CORNERS, n);
      continue;
    }

    var su = this.shapeUniforms[k];

    gl.useProgram(this.shapes[k]);
    gl.bindVertexArray(this.shapeVaos[k]);
    gl.uniform2f(su.size, view.width, view.height);
    if (lit) {
      gl.uniform1f(su.glow, op.glow ? 1 : 0);
      //hidden behind whatever stands nearer, if it says how high it stands
      gl.uniform1f(
        su.standsAt,
        op.z === null || op.z === undefined ? -1000 : op.z,
      );
      if (op.z === null || op.z === undefined) gl.disable(gl.DEPTH_TEST);
      else {
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.depthMask(false);
      }
    }

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
      Stats.count(DRAWS, 1);
      Stats.count(CORNERS, n);
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
    Stats.count(DRAWS, 1);
    Stats.count(CORNERS, n);
    if (op.kind === "count") gl.colorMask(true, true, true, true);
  }

  gl.disable(gl.STENCIL_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.bindVertexArray(null);

  this.opCount = 0;
  this.used = 0;
};

/**
 * A frame starts: from nothing drawn, and words not drawn for a while are
 * put away.
 */
p.begin = function () {
  var frame = ++this.frame,
    gl = this.gl;

  //nothing left over from a frame that broke off half way, to turn up in
  //the wrong layer of this one
  this.opCount = 0;
  this.used = 0;
  this.reset();

  if (frame % WORDS_SWEEP !== 0) return;

  this.written.forEach(function (w, key, map) {
    if (frame - w.seen < WORDS_KEPT) return;
    if (w.tex !== null) gl.deleteTexture(w.tex);
    map.delete(key);
  });
};

/* --- Geometry ---------------------------------------------------------- */

//whether a closed outline, the points from start to end, x, y after x, y,
//bulges out everywhere
function convex(points, start, end) {
  var n = (end - start) / 2,
    sign = 0;

  for (var i = 0; i < n; i++) {
    var a = start + i * 2,
      b = start + ((i + 1) % n) * 2,
      c = start + ((i + 2) % n) * 2,
      cross =
        (points[b] - points[a]) * (points[c + 1] - points[b + 1]) -
        (points[b + 1] - points[a + 1]) * (points[c] - points[b]);

    if (cross === 0) continue;
    if (sign === 0) sign = cross > 0 ? 1 : -1;
    else if ((cross > 0 ? 1 : -1) !== sign) return false;
  }

  return true;
}

//triangles from the first of the points from start to end to every edge
//after it, in colour c
function fan(self, start, end, c) {
  var points = self.points;

  for (var i = start + 2; i + 3 < end; i += 2) {
    vertex(self, points[start], points[start + 1], c);
    vertex(self, points[i], points[i + 1], c);
    vertex(self, points[i + 2], points[i + 3], c);
  }
}

/**
 * Piece i of the path drawn as a line w wide in colour c - dashed as the
 * canvas dashes it, the dash going on round the corners, and back to its
 * start, if it is closed. A line a pixel wide or so (hair) is drawn as the
 * ends of its stretches, a pixel for every step along them with none
 * missed, as a strip that thin would on a slope; any other as a strip along
 * each stretch, running on past either end of an edge by half its width so
 * that the corners are filled.
 */
function line(self, i, w, hair, c) {
  var view = self.view,
    //what of it is off the frame, by more than it is wide and then some,
    //is not drawn: the dash goes on along it all the same, so what is on
    //the frame is dashed as it was
    pad = w + 2,
    right = view.width + pad,
    bottom = view.height + pad,
    points = self.points,
    start = self.starts[i],
    count = (pieceEnd(self, i) - start) / 2,
    //and the first again, at the end of one that is closed
    m = count + (self.closed[i] === 1 ? 1 : 0),
    dash = self.dash,
    h = w / 2,
    k = 0,
    left = dash.length > 0 ? dash[0] : Infinity,
    on = true,
    j,
    x0,
    y0,
    xa,
    ya,
    xb,
    yb,
    o,
    dx,
    dy,
    len,
    ux,
    uy,
    t,
    step;

  for (j = 0; j + 1 < m; j++) {
    x0 = points[start + j * 2];
    y0 = points[start + j * 2 + 1];
    o = j + 1 < count ? start + j * 2 + 2 : start;
    dx = points[o] - x0;
    dy = points[o + 1] - y0;
    len = Math.sqrt(dx * dx + dy * dy);

    if (len === 0) continue;

    ux = dx / len;
    uy = dy / len;
    t = 0;

    //along the edge, a dash or a gap at a time
    while (t < len) {
      step = Math.min(left, len - t);

      xa = x0 + ux * t;
      ya = y0 + uy * t;
      xb = x0 + ux * (t + step);
      yb = y0 + uy * (t + step);

      if (
        on &&
        !(
          (xa < -pad && xb < -pad) ||
          (xa > right && xb > right) ||
          (ya < -pad && yb < -pad) ||
          (ya > bottom && yb > bottom)
        )
      ) {
        if (hair) {
          vertex(self, xa, ya, c);
          vertex(self, xb, yb, c);
        } else
          quad(
            self,
            x0,
            y0,
            ux,
            uy,
            t === 0 ? t - h : t,
            t + step >= len ? t + step + h : t + step,
            h,
            c,
          );
      }

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

//a strip h either side of the line from x, y along ux, uy, from a to b on
//it, in colour c
function quad(self, x, y, ux, uy, a, b, h, c) {
  var nx = -uy * h,
    ny = ux * h,
    ax = x + ux * a,
    ay = y + uy * a,
    bx = x + ux * b,
    by = y + uy * b;

  vertex(self, ax + nx, ay + ny, c);
  vertex(self, bx + nx, by + ny, c);
  vertex(self, ax - nx, ay - ny, c);
  vertex(self, ax - nx, ay - ny, c);
  vertex(self, bx + nx, by + ny, c);
  vertex(self, bx - nx, by - ny, c);
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
