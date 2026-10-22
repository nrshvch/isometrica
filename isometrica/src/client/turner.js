/**
 * Turning the camera round the city, between one side of the world and the
 * next, shown as one smooth turn about a spot on the ground - the middle of
 * the screen, for a key or a finger dragged in from the edge of it (client/
 * cameracontrol) - though the city is only ever drawn from its four sides.
 *
 * For the while, a picture of the city is laid over the game, the game
 * going on under it unseen: the side the camera is on, and the sides it
 * turns to, each drawn - OVER more of it than the screen shows, bare: no
 * rain, no lightning, nothing drawn over the city (the grid, the names,
 * the signs) - and kept, with the picture of how high each pixel
 * of it stands. Each is laid over a mesh, every point of it lifted as high
 * as what is there stands, and turned about the up axis through that spot
 * on the ground, as the world would be, and drawn from where the camera
 * looks, in a WebGL canvas of its own: what stands up stays upright and
 * swings round where it stands, further the taller. The one goes over into
 * the other halfway - where one has nothing, the other shows, and past the
 * edges of both their edges are drawn out - blurred the more the further
 * from either side, so that what the pictures cannot show, what was behind
 * something, goes unseen.
 *
 * Done, the camera is put where the turn ended - on that side, the spot it
 * turned about where it was on the screen - and the picture goes, showing
 * the game drawn from there.
 *
 * Nothing else of the game knows about it but that it is told when a frame
 * has been drawn, can have the city drawn bare for a frame, and hands it
 * the picture of how high things stand (client/lighting onFrame, calm,
 * client/glview readHeights), and that the camera control drives it
 * (client/cameracontrol).
 */
import View from "./view";
import Carman from "./carman";
import Config from "./config";

//how much more of the city each picture of it takes in than the screen
//shows, across and down
var OVER = 1.5;

//how long a turn from Q or E takes, ms - quick at first, easing out as it
//comes round (a key pressed meanwhile turning it on from wherever it is,
//as long again); how long a turn takes to settle on the nearest side once
//the finger lets go, and how long the picture takes to fade into the game
var TURN_MS = 600,
  //how far round a turn dragged has to go, degrees, to land on the next
  //side once the finger lets go - short of that, back on the one it set
  //off from
  COMMIT = 30,
  SETTLE_MS = 300,
  FADE_MS = 120;

//how many frames the game is let draw after it turns, or zooms out, before
//a picture is taken - no time to wait for whatever it has still to paint:
//each side's picture is taken once, as it is then
var WAIT = 2;

//how blurred the picture is halfway between two sides, page pixels
var BLUR = 6;

//how many pixels of a picture apart the points of the mesh it is laid over
//are; and how far past its edges the flat ground drawn out from them goes,
//as a share of it
var GRID = 2,
  SKIRT = 0.5;

//how sure a side's picture is of what it shows, for the two to be mixed by
//(MIX_FS weight): of anything standing; of the ground; of its edge drawn
//out past it, only where neither has anything else. How few pixels of the
//picture to a pixel of the screen, across and down - two unturned - the
//mesh is taken to be drawn out between something and what is behind it -
//and how blurred the edge drawn out is, as a level of its mipmaps
var THING = "1.0",
  GROUND = "0.7",
  EDGE = "0.3",
  STRETCH = "1.0",
  EDGE_BLUR = 5;

//how many pixels of a picture apart how high the ground is under it is
//looked up (elevations) - in between, it goes from one to the next
var ELEV_STEP = 16;

//every point of the mesh: where it is on its picture, from the top left,
//lifted as high as what is there stands, and the ground it stands on over
//the sea - from the ground as low as the sea under it, turned about the up
//axis through that under the spot it turns about, back up and onto the
//screen - as near the eye as it is from there. The skirt, flat, past the
//edges
var MESH_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 at;

//how high each pixel stands over what it stands on, its rows from the
//bottom up (GLView readHeights); how high the ground is over the sea where
//the ground as low as the sea is seen, every ELEV_STEP pixels (elevations)
uniform sampler2D heights;
uniform sampler2D elevs;
uniform vec2 picture;
//the cosine and sine of how far it is turned; and about what: where that is
//on the screen as it is when it starts, page pixels, and on this picture
uniform vec2 turn;
uniform vec2 spot;
uniform vec2 under;
//the screen, page pixels; how many of them a pixel of the world takes up;
//and how much bigger it is shown, about where
uniform vec2 screen;
uniform float zoom;
uniform float grow;
uniform vec2 pivot;
uniform bool skirt;

out vec2 vUv;

float elevAt(vec2 p) {
  return texture(elevs, (p / ${ELEV_STEP}.0 + 0.5) / vec2(textureSize(elevs, 0))).r;
}

void main() {
  float h = 0.0;

  if (!skirt) {
    ivec2 t = clamp(ivec2(int(at.x), int(picture.y - 1.0 - at.y)), ivec2(0),
      ivec2(picture) - 1);
    vec4 hv = texelFetch(heights, t, 0);
    h = hv.a > 0.5 ? hv.r * 255.0 : 0.0;
  }

  //and the ground it stands on, over the sea: where that is depends on how
  //high it is - a few goes round settle it
  float e = 0.0;

  for (int k = 0; k < 3; k++) e = elevAt(vec2(at.x, at.y + h + e));
  h += e;

  //the ground under it, from the ground under the spot: along the world's
  //x and y - across the screen x - y, down it (x + y) / 2
  vec2 d = vec2(at.x, at.y + h) - under;
  vec2 g = vec2(d.y + d.x * 0.5, d.y - d.x * 0.5);

  g = vec2(g.x * turn.x - g.y * turn.y, g.x * turn.y + g.y * turn.x);

  vec2 q = vec2(g.x - g.y, (g.x + g.y) * 0.5 - h);
  vec2 s = pivot + (spot + q * zoom - pivot) * grow;
  float depth = skirt ? 0.999 : clamp(0.5 - (2.0 * q.y + 3.0 * h) / 16384.0, 0.0, 0.99);

  gl_Position = vec4(s.x / screen.x * 2.0 - 1.0, 1.0 - s.y / screen.y * 2.0,
    depth * 2.0 - 1.0, 1.0);
  vUv = (at + 0.5) / picture;
}
`;

//its colours, and how sure of them it is in the alpha (MIX_FS weight): sure
//of anything standing (THING), less of the ground (GROUND) - and nothing
//where the mesh is drawn out between the top of something and the ground
//behind it, steeper than STRETCH, which the other side's picture may have.
//Past its edges, the skirt: the edge drawn out, all blurred (EDGE)
var MESH_FS = `#version 300 es
precision highp float;

uniform sampler2D colours;
uniform sampler2D heights;
uniform bool skirt;
uniform vec2 picture;
uniform float zoom;
uniform float grow;

in vec2 vUv;
out vec4 color;

void main() {
  vec2 uv = clamp(vUv, 0.0, 1.0);

  if (skirt) {
    color = vec4(textureLod(colours, uv, ${EDGE_BLUR}.0).rgb, ${EDGE});
    return;
  }

  //drawn out: much more of the screen than of the picture to the pixel -
  //from the top of something to the ground behind it, turned
  vec2 step = fwidth(vUv * picture) * zoom * grow;

  if (step.x + step.y < ${STRETCH}) discard;

  float there = texture(heights, vec2(uv.x, 1.0 - uv.y)).a;

  color = vec4(textureLod(colours, uv, 0.0).rgb, there > 0.5 ? ${THING} : ${GROUND});
}
`;

var FULL_VS = `#version 300 es
precision highp float;

layout(location = 0) in vec2 corner;
out vec2 vUv;

void main() {
  vUv = corner;
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

//the two sides' pictures, turned, into one: the next side's coming in over
//this side's by mixed - where one has nothing, the other; where neither, the
//edges drawn out; where not even those, the backdrop
var MIX_FS = `#version 300 es
precision highp float;

uniform sampler2D a;
uniform sampler2D b;
uniform float mixed;

in vec2 vUv;
out vec4 color;

float weight(float alpha) {
  return alpha > 0.9 ? 1.0 : alpha > 0.5 ? 0.6 : alpha > 0.1 ? 0.01 : 0.0;
}

void main() {
  vec4 ca = texture(a, vUv), cb = texture(b, vUv);
  float wa = weight(ca.a) * (1.0 - mixed + 0.0001),
    wb = weight(cb.a) * (mixed + 0.0001);

  color = wa + wb > 0.0
    ? vec4((ca.rgb * wa + cb.rgb * wb) / (wa + wb), 1.0)
    : vec4(0.106, 0.122, 0.141, 1.0);
}
`;

function compile(gl, type, source) {
  var shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(shader));

  return shader;
}

function program(gl, vs, fs) {
  var p = gl.createProgram();

  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p));

  return p;
}

function texture(gl, filter) {
  var t = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return t;
}

function smooth(k) {
  k = Math.max(0, Math.min(1, k));

  return k * k * (3 - 2 * k);
}

/**
 * Where a spot dx, dy page pixels from another on the ground, as it is seen,
 * is seen once the world is turned deg degrees round the up axis through
 * that other one: onto the ground (MESH_VS), turned, and back up.
 */
function turned(deg, dx, dy) {
  var r = (deg * Math.PI) / 180,
    c = Math.cos(r),
    s = Math.sin(r),
    gx = dy + dx * 0.5,
    gy = dy - dx * 0.5,
    tx = gx * c - gy * s,
    ty = gx * s + gy * c;

  return [tx - ty, (tx + ty) / 2];
}

/**
 * @param root {Vkaria}
 */
function Turner(root) {
  this.root = root;
  this.active = false;
  this.gl = null;
  //quarter turns asked for while one was ending, to go on with after
  this.next = 0;
}

Turner.prototype.camera = function () {
  return this.root.camera.cameraScript;
};

Turner.prototype.viewport = function () {
  return this.camera().gameObject.camera.viewport;
};

/**
 * Starts a turn from the side the camera is on, about x, y on the screen,
 * page pixels - the middle of it unless said: the picture laid over the
 * game as soon as the game has drawn the next frame, and the pictures taken
 * of the city.
 */
Turner.prototype.begin = function (x, y) {
  var viewport = this.viewport(),
    lighting = this.root.lighting;

  //from above, the map stays north up
  if (this.active || !viewport || !lighting || View.top()) return;

  var self = this,
    canvas = viewport.canvas,
    w = canvas.offsetWidth,
    h = canvas.offsetHeight;

  this.active = true;
  //the zoom it is drawn at, and the side it starts from
  this.zoom = this.camera().zoom();
  this.base = View.turns();
  //where the camera is now, a quarter turn at a time from there
  this.at = 0;
  this.zoomedOut = false;
  //how far it is turned, and about what - the ground, flat, under what is
  //at the spot on the screen once the first picture says how high that
  //stands (take); how much bigger it is shown about
  //where - the fingers pinching - and the pictures by the side they are of
  this.deg = 0;
  this.spot = x === undefined ? [w / 2, h / 2] : [x, y];
  this.grow = 1;
  this.pivot = [w / 2, h / 2];
  this.pictures = {};
  //the picture being taken - the first one quick, of what is on the
  //screen, the city drawn bare - and those to take after it
  this.job = { side: 0, wait: 0, quick: true };
  this.queue = [0];
  this.ending = null;
  this.chase = null;
  lighting.calm = true;
  //and the chunks of the world kept as they are till the turn is over
  if (this.root.tilesman) this.root.tilesman.hold(true);

  this.build(canvas);
  lighting.onFrame = function () {
    self.frame();
  };
};

//what is laid over the game: a box the size and place of the game's own
//canvas, the turner's canvas in it, blurred
Turner.prototype.build = function (canvas) {
  var box = document.createElement("div"),
    view = this.glCanvas || document.createElement("canvas"),
    w = canvas.offsetWidth,
    h = canvas.offsetHeight;

  box.style.cssText =
    "position:absolute;overflow:hidden;pointer-events:none;" +
    "background:#1b1f24;visibility:hidden;" +
    "left:" +
    canvas.offsetLeft +
    "px;top:" +
    canvas.offsetTop +
    "px;width:" +
    w +
    "px;height:" +
    h +
    "px;transition:opacity " +
    FADE_MS +
    "ms linear";
  view.style.cssText = "position:absolute;left:0;top:0;width:100%;height:100%";
  view.width = w;
  view.height = h;

  box.appendChild(view);
  //over the canvas, and under whatever stands over it - the buttons, the
  //bar at the top: before them, the first of all that is laid out over it
  //(which the canvas itself is not)
  canvas.parentNode.insertBefore(box, canvas.parentNode.firstChild);

  this.box = box;
  this.shown = view;
  this.size = [w, h];
  if (this.gl === null) this.setup(view);
  this.targets(w, h);
};

//the turner's own WebGL: the programs, the meshes by the size of the
//picture, the corners of the screen, and somewhere to draw each side into
Turner.prototype.setup = function (canvas) {
  var gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    premultipliedAlpha: false,
  });

  this.glCanvas = canvas;
  this.gl = gl;
  this.meshProgram = program(gl, MESH_VS, MESH_FS);
  this.mixProgram = program(gl, FULL_VS, MIX_FS);
  this.meshes = {};

  this.full = gl.createVertexArray();
  gl.bindVertexArray(this.full);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 0, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  this.sides = [0, 1].map(function () {
    return {
      frame: gl.createFramebuffer(),
      tex: texture(gl, gl.LINEAR),
      depth: gl.createRenderbuffer(),
    };
  });
  this.targetSize = [0, 0];
};

//the two sides' targets, w by h
Turner.prototype.targets = function (w, h) {
  var gl = this.gl;

  if (this.targetSize[0] === w && this.targetSize[1] === h) return;

  this.targetSize = [w, h];
  this.sides.forEach(function (t) {
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindRenderbuffer(gl.RENDERBUFFER, t.depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.frame);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t.tex,
      0,
    );
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      t.depth,
    );
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

//the mesh for a picture w by h: a point every GRID pixels, two triangles
//between every four - and its skirt, flat, SKIRT of it past every edge
Turner.prototype.mesh = function (w, h) {
  var key = w + "x" + h,
    m = this.meshes[key];

  if (m) return m;

  var gl = this.gl,
    cols = Math.ceil((w - 1) / GRID) + 1,
    rows = Math.ceil((h - 1) / GRID) + 1,
    at = new Float32Array(cols * rows * 2 + 8),
    index = new Uint32Array((cols - 1) * (rows - 1) * 6 + 6),
    r,
    c,
    n = 0;

  for (r = 0; r < rows; r++)
    for (c = 0; c < cols; c++) {
      at[(r * cols + c) * 2] = Math.min(c * GRID, w - 1);
      at[(r * cols + c) * 2 + 1] = Math.min(r * GRID, h - 1);
    }

  for (r = 0; r + 1 < rows; r++)
    for (c = 0; c + 1 < cols; c++) {
      var i = r * cols + c;

      index.set([i, i + 1, i + cols, i + 1, i + cols + 1, i + cols], n);
      n += 6;
    }

  //the skirt: four corners past the edges, two triangles
  var o = cols * rows,
    sx = w * SKIRT,
    sy = h * SKIRT;

  at.set([-sx, -sy, w + sx, -sy, -sx, h + sy, w + sx, h + sy], o * 2);
  index.set([o, o + 1, o + 2, o + 1, o + 3, o + 2], n);

  var vao = gl.createVertexArray();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, at, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  m = this.meshes[key] = { vao: vao, count: n, skirt: n };

  return m;
};

/**
 * The game has drawn a frame: a picture taken of it, if one is due, and the
 * next one set up - the camera on that side, zoomed out to take in OVER
 * more, drawn bare - and once there is nothing more to take, the camera
 * back to its zoom; and the turn done with, if it is ending.
 */
Turner.prototype.frame = function () {
  var job = this.job;

  if (job !== null) {
    if (job.wait-- > 0) return;

    this.take(job.side);
    this.job = null;
  }

  while (this.queue.length > 0 && this.job === null) {
    var side = this.queue.shift();

    if (this.pictures[side] && !this.pictures[side].quick) continue;

    if (!this.zoomedOut) {
      this.camera().zoom(this.zoom / OVER);
      this.zoomedOut = true;
    }

    this.turnTo(side);
    this.job = { side: side, wait: WAIT };
  }

  //all there is taken: the side the camera is on taken once more, if it was
  //taken with some of it still to be painted, once it all is - and nothing
  //more to do then till more is wanted, or it ends
  var here = this.pictures[this.at];

  if (
    this.job === null &&
    this.ending === null &&
    here &&
    here.missing &&
    this.root.sprites.generator.idle()
  ) {
    here.missing = false;
    this.job = { side: this.at, wait: 0, again: true };
  }

  if (this.job !== null || this.ending === null) return;

  if (this.zoomedOut) {
    this.camera().zoom(this.zoom);
    this.zoomedOut = false;
  }

  if (this.ending !== null && this.ending.settled) this.close();
};

/**
 * The camera turned to side, a quarter turn at a time from where it started
 * - and moved for the spot it is turned about to be where it was on the
 * screen: it turns about the middle of the screen (Vkaria turnView), which
 * would put that elsewhere. So each side's picture is of what is round the
 * spot once the turn lands there, and the game is where the turn lands.
 */
Turner.prototype.turnTo = function (side) {
  if (side === this.at) return;

  var cam = this.camera(),
    was = this.shift(this.at),
    to = this.shift(side);

  cam.pan(-was[0], -was[1]);
  this.root.turnView(side - this.at);
  cam.pan(to[0], to[1]);
  this.at = side;
};

//how far the camera is moved on side for the spot to be where it was,
//pixels of the world (CameraScript pan): as much as turning about the
//middle of the screen rather than about the spot puts it elsewhere
Turner.prototype.shift = function (side) {
  var dx = this.spot[0] - this.size[0] / 2,
    dy = this.spot[1] - this.size[1] / 2,
    seen = turned(side * 90, dx, dy);

  return [(dx - seen[0]) / this.zoom, (dy - seen[1]) / this.zoom];
};

//a picture of the side the camera is on, from the frame just drawn - its
//colours and how high each pixel of it stands
Turner.prototype.take = function (side) {
  var gl = this.gl,
    source = this.viewport().canvas,
    heights = this.root.lighting.view.readHeights(),
    old = this.pictures[side],
    colours = texture(gl),
    high = texture(gl);

  gl.bindTexture(gl.TEXTURE_2D, colours);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  //blurred too, for the edges drawn out past it (MESH_FS)
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindTexture(gl.TEXTURE_2D, high);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    heights.w,
    heights.h,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    heights.data,
  );

  //how high the ground is, by the camera that drew it: the same for every
  //picture of a side, at a zoom
  var quick = this.job !== null && this.job.quick === true,
    elevs =
      old && old.quick === quick && old.w === heights.w && old.h === heights.h
        ? old.elevs
        : elevations(gl, this.root, heights.w, heights.h);

  if (old) forget(gl, old, elevs);

  //the first picture: what is at the spot the turn is about, and how high
  //it stands - the turn is about the ground under it, for that to keep its
  //place, whatever it stands on, not the ground under it as if it were flat
  if (this.job !== null && this.job.quick === true)
    this.spot[1] += lift(this.root, heights, this.spot, this.zoom);

  this.pictures[side] = {
    colours: colours,
    heights: high,
    elevs: elevs,
    w: heights.w,
    h: heights.h,
    quick: this.job !== null && this.job.quick === true,
    //with some of what is there still to be painted (frame) - once only
    missing:
      !(this.job !== null && this.job.again === true) &&
      !this.root.sprites.generator.idle(),
  };

  this.box.style.visibility = "visible";
  this.show();
};

/**
 * How far down the screen, page pixels, the ground as low as the sea is,
 * under what is at spot (page pixels, at zoom): as high as that stands over
 * what it stands on - its picture of how high it stands says (GLView
 * readHeights) - and as high as the ground there is, or the road, over the
 * sea (client/carman groundHeight). The camera turns about that, flat, the
 * middle of the screen (client/components/camerascript turn).
 */
function lift(root, heights, spot, zoom) {
  var x = Math.floor(spot[0] / zoom),
    y = Math.floor(spot[1] / zoom),
    own = 0;

  if (x >= 0 && y >= 0 && x < heights.w && y < heights.h) {
    var i = ((heights.h - 1 - y) * heights.w + x) * 4;

    if (heights.data[i + 3] > 127) own = heights.data[i];
  }

  //the world onto the canvas, pixels - and where on the ground, as low as
  //the sea, a pixel of it is
  var M = root.camera.camera.getWorldToScreen(),
    det = M[0] * M[9] - M[8] * M[1],
    up = -M[5] * Config.tileZStep,
    down = own;

  //how high the ground is where the spot is depends on where that is, which
  //depends on how high it is: a few goes round settle it
  for (var k = 0; k < 4; k++) {
    var sx = spot[0] / zoom - M[12],
      sy = spot[1] / zoom + down - M[13],
      X = (sx * M[9] - M[8] * sy) / det,
      Z = (M[0] * sy - M[1] * sx) / det,
      ground = Math.max(
        0,
        Carman.groundHeight(root, X / Config.tileSize, Z / Config.tileSize),
      );

    down = own + ground * up;
  }

  return down * zoom;
}

/**
 * How high the ground is over the sea - or the road, as cars have it (client/
 * carman groundHeight) - where the ground as low as the sea is seen on a
 * picture w by h the camera draws now, every ELEV_STEP pixels of it, pixels:
 * a texture of it.
 */
function elevations(gl, root, w, h) {
  var M = root.camera.camera.getWorldToScreen(),
    det = M[0] * M[9] - M[8] * M[1],
    up = -M[5] * Config.tileZStep,
    cols = Math.ceil(w / ELEV_STEP) + 1,
    rows = Math.ceil(h / ELEV_STEP) + 1,
    data = new Float32Array(cols * rows),
    t = texture(gl, gl.LINEAR);

  for (var j = 0; j < rows; j++)
    for (var i = 0; i < cols; i++) {
      var sx = i * ELEV_STEP - M[12],
        sy = j * ELEV_STEP - M[13],
        X = (sx * M[9] - M[8] * sy) / det,
        Z = (M[0] * sy - M[1] * sx) / det;

      data[j * cols + i] =
        Math.max(
          0,
          Carman.groundHeight(root, X / Config.tileSize, Z / Config.tileSize),
        ) * up;
    }

  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.R16F,
    cols,
    rows,
    0,
    gl.RED,
    gl.FLOAT,
    data,
  );

  return t;
}

//a picture let go of - but for its elevations, if they are kept
function forget(gl, picture, keep) {
  gl.deleteTexture(picture.colours);
  gl.deleteTexture(picture.heights);
  if (picture.elevs !== keep) gl.deleteTexture(picture.elevs);
}

/**
 * How it is shown: turned deg degrees from the side it started on - +90
 * the next side round, as View +1 - and grow times bigger than the zoom it
 * started at, about x, y on the screen (the fingers pinching).
 */
Turner.prototype.view = function (deg, grow, x, y) {
  if (!this.active || this.ending !== null) return;

  this.deg = deg;
  if (grow !== undefined) this.grow = grow;
  if (x !== undefined) this.pivot = [x, y];

  //the pictures of the two sides it is between, to be taken
  var k = Math.floor(deg / 90);

  this.want(k);
  this.want(k + 1);
  this.show();
};

Turner.prototype.want = function (side) {
  if (!this.pictures[side] && this.queue.indexOf(side) === -1)
    this.queue.push(side);
};

//each side's picture turned into its own target, then the two into one on
//the screen, blurred the more the further it is from either side
Turner.prototype.show = function () {
  var gl = this.gl,
    w = this.size[0],
    h = this.size[1],
    deg = this.deg,
    k = Math.floor(deg / 90),
    t = deg / 90 - k,
    //the next side's picture coming in over this side's, halfway
    mixed = smooth((t - 0.3) / 0.4),
    a = this.pictures[k],
    b = this.pictures[k + 1];

  if (!a && !b) return;

  gl.viewport(0, 0, w, h);
  this.render(this.sides[0], a, k);
  this.render(this.sides[1], b, k + 1);

  var p = this.mixProgram;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.DEPTH_TEST);
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, this.sides[0].tex);
  gl.uniform1i(gl.getUniformLocation(p, "a"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, this.sides[1].tex);
  gl.uniform1i(gl.getUniformLocation(p, "b"), 1);
  gl.uniform1f(gl.getUniformLocation(p, "mixed"), !a ? 1 : !b ? 0 : mixed);
  gl.bindVertexArray(this.full);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);

  var off = Math.abs(Math.sin((deg * Math.PI) / 90));

  this.shown.style.filter =
    off > 0.02 ? "blur(" + (BLUR * Math.pow(off, 0.7)).toFixed(2) + "px)" : "";
};

//a picture of side, over its mesh, turned from that side to where the turn
//is, into target - or nothing there, if there is no picture
Turner.prototype.render = function (target, picture, side) {
  var gl = this.gl,
    p = this.meshProgram;

  gl.bindFramebuffer(gl.FRAMEBUFFER, target.frame);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (!picture) return;

  var r = ((this.deg - side * 90) * Math.PI) / 180,
    m = this.mesh(picture.w, picture.h),
    //where the ground the turn is about is on this side's picture: where it
    //is on the screen, the camera moved for it to be (turnTo)
    under = [this.spot[0] - this.size[0] / 2, this.spot[1] - this.size[1] / 2];

  gl.useProgram(p);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, picture.heights);
  gl.uniform1i(gl.getUniformLocation(p, "heights"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, picture.colours);
  gl.uniform1i(gl.getUniformLocation(p, "colours"), 1);
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, picture.elevs);
  gl.uniform1i(gl.getUniformLocation(p, "elevs"), 2);
  gl.uniform2f(gl.getUniformLocation(p, "picture"), picture.w, picture.h);
  gl.uniform2f(gl.getUniformLocation(p, "turn"), Math.cos(r), Math.sin(r));
  gl.uniform2f(gl.getUniformLocation(p, "spot"), this.spot[0], this.spot[1]);
  gl.uniform2f(
    gl.getUniformLocation(p, "under"),
    Math.floor(picture.w / 2) + under[0] / this.zoom,
    Math.floor(picture.h / 2) + under[1] / this.zoom,
  );
  gl.uniform2f(gl.getUniformLocation(p, "screen"), this.size[0], this.size[1]);
  gl.uniform1f(gl.getUniformLocation(p, "zoom"), this.zoom);
  gl.uniform1f(gl.getUniformLocation(p, "grow"), this.grow);
  gl.uniform2f(gl.getUniformLocation(p, "pivot"), this.pivot[0], this.pivot[1]);
  gl.bindVertexArray(m.vao);

  //the skirt first, behind everything; then the picture
  gl.uniform1i(gl.getUniformLocation(p, "skirt"), 1);
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_INT, m.skirt * 4);
  gl.uniform1i(gl.getUniformLocation(p, "skirt"), 0);
  gl.drawElements(gl.TRIANGLES, m.count, gl.UNSIGNED_INT, 0);
  gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
};

/**
 * Ends the turn: it settles on the nearest side - and, pinched, on the zoom
 * the fingers let go at, about where they were (zoom, x, y) - the camera
 * is put there, and the picture fades into the game drawn from there.
 */
Turner.prototype.end = function (zoom, x, y) {
  if (!this.active || this.ending !== null) return;

  var self = this,
    from = this.deg,
    //the side it set off from, unless it went COMMIT or more round
    to = Math.sign(from) * Math.floor((Math.abs(from) + 90 - COMMIT) / 90) * 90,
    grow = this.grow,
    goal = zoom === undefined ? 1 : zoom / this.zoom,
    start = performance.now();

  this.chase = null;
  this.ending = { side: to / 90, zoom: zoom, x: x, y: y, settled: false };
  //nothing more to take: what there is of it will do
  this.queue.length = 0;
  if (this.job !== null && !this.pictures[this.job.side]) this.job.wait = 0;
  else this.job = null;

  function step() {
    if (self.ending === null) return;

    var t = Math.min(1, (performance.now() - start) / SETTLE_MS),
      e = 1 - Math.pow(1 - t, 3);

    self.deg = from + (to - from) * e;
    self.grow = grow + (goal - grow) * e;
    self.show();

    //done once the game has drawn a frame
    if (t < 1) requestAnimationFrame(step);
    else self.ending.settled = true;
  }

  requestAnimationFrame(step);
};

//the camera where the turn ended - on that side, moved for the spot it
//turned about to be where it was on the screen, at the zoom it ended on -
//the game drawn from there for a frame or two, and the picture faded away
//into it
Turner.prototype.close = function () {
  var self = this,
    e = this.ending,
    cam = this.camera();

  if (e.placed === undefined) {
    this.turnTo(e.side);

    if (e.zoom !== undefined && e.zoom !== cam.zoom())
      cam.zoom(e.zoom, e.x / this.zoom, e.y / this.zoom);

    this.root.lighting.calm = false;
    e.placed = WAIT;
    return;
  }

  if (e.placed-- > 0) return;

  this.root.lighting.onFrame = null;
  this.box.style.opacity = "0";
  setTimeout(function () {
    if (self.box.parentNode) self.box.parentNode.removeChild(self.box);
    if (self.root.tilesman) self.root.tilesman.hold(false);
    self.active = false;

    //a key pressed while it was ending: on to that
    if (self.next !== 0) {
      var by = self.next;

      self.next = 0;
      self.turn(by);
    }
  }, FADE_MS);
  this.ending = null;
  for (var side in this.pictures) forget(this.gl, this.pictures[side]);
  this.pictures = {};
};

/**
 * A quarter turn of the world - by 1 or -1 - from Q or E: on top of any
 * turn still going, each key a quarter turn more, the turn going on till it
 * gets there, quickly, slowing as it does.
 */
Turner.prototype.turn = function (by) {
  if (View.top()) return;

  if (this.active && (this.ending !== null || this.chase === null)) {
    this.next += by;
    return;
  }

  if (!this.active) {
    this.begin();

    if (!this.active) {
      this.root.turnView(by);
      return;
    }
  }

  var fresh = this.chase === null;

  if (fresh) this.chase = { goal: 0 };

  //on from wherever it is now, to the side past the one it was going to
  this.chase.goal += by * 90;
  this.chase.from = this.deg;
  this.chase.start = performance.now();
  if (fresh) this.run();

  //the side it turns to first, needed by halfway
  var side = Math.round(this.chase.goal / 90);

  if (!this.pictures[side] && this.queue.indexOf(side) === -1)
    this.queue.unshift(side);
};

//the turn from the keys going on, a frame at a time, towards its goal: in
//TURN_MS, quick at first and easing out as it comes round
Turner.prototype.run = function () {
  var self = this;

  function step(now) {
    var c = self.chase;

    if (c === null || !self.active) return;

    var t = Math.min(1, (now - c.start) / TURN_MS),
      e = 1 - Math.pow(1 - t, 3);

    self.view(c.from + (c.goal - c.from) * e);

    if (t >= 1) {
      self.deg = c.goal;
      self.end();
    } else requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
};

//how much more of the city than the screen shows its pictures take in -
//for what is got ready ahead of a turn to take in as much (client/preloader)
Turner.prototype.over = OVER;

export default Turner;
