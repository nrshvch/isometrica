/**
 * The city drawn in WebGL, and lit pixel by pixel as it is (client/lighting).
 *
 * Every picture there is lives on the pages of the canvas cache - here the
 * layers of one texture (pages): painted on a canvas once, handed over into
 * its slot (upload), drawn from there from then on.
 *
 * A layer of the city is drawn as one batch of squares, a picture each, in
 * the order the engine sorts them (sprites): from the pictures it is painted
 * as - its colours with no light on them, which way every pixel looks, and
 * at night how high every pixel stands and what shines of it (client/
 * cachedsprite glQuad) - into as many pictures of the
 * screen at once, the frame's (the G-buffer), each covering what was drawn
 * there before as a picture drawn over another does. What a layer draws with
 * the canvas instead - the lines round a city, the price over a building -
 * comes as a canvas, laid over the layer (canvas).
 *
 * Once the lit layers are in, they are lit (light): every lamp - a street
 * light, a headlight, a lit window or sign, a police car's flash - a square over
 * just the pixels it can reach, adding its light by how far each is from it
 * in the world - worked out from where it is on the screen and how high it
 * stands - and how squarely it faces it; then every pixel by the sun, the
 * lamps' light put in steps of a third, dithered by where on the ground the
 * pixel is, and what shines added in over the dark. The layers over the city
 * are drawn on top of that as they are painted.
 */

//what a square of a picture is to the shader, so many floats: where it is
//on the screen and how big; how see-through; and for each of the pictures
//of the screen it is drawn into - the colours, the ways things look, how
//high things stand, what shines - where it is drawn from: the page, x and y
//there, and how (SKIP, DARK, FROM)
var FLOATS = 24;

//how a square is drawn into one of the pictures of the screen: not at all;
//in black where the picture is (looking up, on the ground, nothing
//shining); or from a picture of its own
var SKIP = 0,
  DARK = 1,
  FROM = 2;

//what a lamp is to the shader, so many floats of it: where the spot under
//it is on the screen, how high it hangs and how far it reaches; its light
//and how much of it there is under it; which way it shines, how wide, and
//how high whatever it can reach stands
var LAMP_FLOATS = 16;

//how far round a thing a lamp lights it, past the side facing it, unless the
//lamp says otherwise
var WRAP = 0.25;

//the pictures of the screen: the colours, the ways things look, how high
//things stand - drawn together - and at night what shines, drawn after
//them; and the lamps' light
var ALBEDO = 0,
  NORMAL = 1,
  HEIGHT = 2,
  SHINE = 3;

//which way a pixel looks, and how high it stands, are not colours to be
//mixed: half of the way one looks and half of black is another way
//altogether, a see-through pixel - smoke, a shadow, a line over the grass -
//turning what is under it away from the sun. They are taken whole from
//what is drawn over them where it is mostly there, and left as they were
//where it is mostly not.
var WHOLE = `
vec4 whole(vec4 c) {
  return vec4(c.rgb, step(0.5, c.a));
}
`;

var SPRITE_VS = `#version 300 es
precision highp float;

in vec2 corner;
//where on the screen, and how big
in vec4 rect;
in vec4 misc;
in vec4 src0;
in vec4 src1;
in vec4 src2;

uniform vec2 size;

flat out vec4 vRect;
flat out float vAlpha;
flat out vec4 vSrc0;
flat out vec4 vSrc1;
flat out vec4 vSrc2;

void main() {
  vec2 at = rect.xy + corner * rect.zw;

  vRect = rect;
  vAlpha = misc.x;
  vSrc0 = src0;
  vSrc1 = src1;
  vSrc2 = src2;
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
}
`;

var SPRITE_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray pages;
uniform vec2 size;

flat in vec4 vRect;
flat in float vAlpha;
//the colours, then the two other pictures this batch draws into
flat in vec4 vSrc0;
flat in vec4 vSrc1;
flat in vec4 vSrc2;

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;

//which pixel of the square this is, from its top left
ivec2 local() {
  return ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)) - ivec2(vRect.xy);
}

vec4 fetch(vec4 src, ivec2 at) {
  return texelFetch(pages, ivec3(ivec2(src.yz) + at, int(src.x)), 0);
}

//one of its pictures, at, as it is drawn: not at all, in black where the
//colours are, or from its own
vec4 drawn(vec4 src, ivec2 at, float shape) {
  if (src.w < 0.5) return vec4(0.0);
  if (src.w < 1.5) return vec4(0.0, 0.0, 0.0, shape);
  vec4 t = fetch(src, at);
  return vec4(t.rgb, t.a * vAlpha);
}

uniform bool colours;
uniform vec4 albedoSrc;
${WHOLE}
void main() {
  ivec2 at = local();
  vec4 c = fetch(vSrc0, at);
  float shape = c.a * vAlpha;

  if (shape <= 0.0) discard;

  if (colours) {
    out0 = vec4(c.rgb, shape);
    out1 = whole(drawn(vSrc1, at, shape));
    out2 = whole(drawn(vSrc2, at, shape));
  } else {
    out0 = drawn(vSrc1, at, shape);
    out1 = drawn(vSrc2, at, shape);
    out2 = vec4(0.0);
  }
}
`;

var FULL_VS = `#version 300 es
precision highp float;
in vec2 corner;
void main() {
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

//a canvas laid over what is drawn: its colours, looking up and on the
//ground where it is
var CANVAS_FS = `#version 300 es
precision highp float;
${WHOLE}
uniform sampler2D picture;
uniform vec2 size;

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;

void main() {
  vec4 c = texelFetch(picture, ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)), 0);

  if (c.a <= 0.0) discard;
  out0 = c;
  out1 = whole(vec4(0.0, 0.0, 0.0, c.a));
  out2 = whole(vec4(0.0, 0.0, 0.0, c.a));
}
`;

var LAMP_VS = `#version 300 es
precision highp float;

in vec2 corner;
in vec4 lamp;
in vec4 tint;
in vec4 aim;
in vec4 shape;

uniform vec2 size;

flat out vec4 vLamp;
flat out vec4 vTint;
flat out vec4 vAim;
flat out vec4 vShape;

void main() {
  //how far the light can reach across the screen and up it: a circle on
  //the ground is twice as wide as it is high, and what stands in it reaches
  //up the screen as high as it stands
  float r = lamp.w * 1.4143;
  vec2 lo = lamp.xy - vec2(r, r * 0.5 + aim.w);
  vec2 hi = lamp.xy + vec2(r, r * 0.5);
  vec2 at = mix(lo, hi, corner);

  vLamp = lamp;
  vTint = tint;
  vAim = aim;
  vShape = shape;
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
}
`;

//the way a pixel looks, from its picture: black for straight up
var NORMAL_OF = `
vec3 normalOf(vec4 t) {
  if (t.r + t.g + t.b < 0.002) return vec3(0.0, 0.0, 1.0);
  return normalize(t.rgb * 2.0 - 1.0);
}
`;

var LAMP_FS = `#version 300 es
precision highp float;

uniform sampler2D normals;
uniform sampler2D heights;
uniform vec2 size;

flat in vec4 vLamp;
flat in vec4 vTint;
flat in vec4 vAim;
flat in vec4 vShape;

out vec4 light;
${NORMAL_OF}
void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  float h = texelFetch(heights, px, 0).r * 255.0;
  vec3 n = normalOf(texelFetch(normals, px, 0));

  //from the lamp to the pixel in the world, as it is seen: across the
  //screen x - y, up it -(x + y) / 2 - z, a pixel a unit
  vec2 d = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y + h) - vLamp.xy;
  vec3 p = vec3((d.x - 2.0 * d.y) * 0.5, (-d.x - 2.0 * d.y) * 0.5, h - vLamp.z);
  float far = length(p);
  float reach = vLamp.w;

  if (far >= reach) discard;

  vec3 l = -p / max(far, 0.001);
  //how squarely it faces the lamp - wrapped round as far as the lamp's
  //shape says, so the lit side of a thing does not end in a hard line
  float wrap = vShape.x;
  float facing = clamp((dot(n, l) + wrap) / (1.0 + wrap), 0.0, 1.0);
  //falling off to nothing: as bright as it is under the lamp, there - or,
  //for a lamp with no foot, close by it
  float under = 1.0 - (vLamp.z * vLamp.z) / (reach * reach);
  float k = (1.0 - (far * far) / (reach * reach)) / mix(1.0, max(under, 0.05), vShape.y);

  //a headlight's cone, along the ground the way it shines
  if (vAim.z > -1.0) {
    vec2 g = normalize(p.xy + vec2(0.0001));
    k *= smoothstep(vAim.z, mix(vAim.z, 1.0, 0.5), dot(g, vAim.xy));
  }

  //half as much stored, for twice as much to fit
  light = vec4(vTint.rgb * vTint.a * k * facing * 0.5, 1.0);
}
`;

var LIT_FS = `#version 300 es
precision highp float;

uniform sampler2D albedo;
uniform sampler2D normals;
uniform sampler2D heights;
uniform sampler2D shine;
uniform sampler2D light;
uniform vec2 size;
//where the world's origin is on the screen, for the dither to stay put
uniform vec2 origin;
//the light of the sky, of the sun and which way it is
uniform vec3 ambient;
uniform vec3 sunLight;
uniform vec3 sunDir;
//whether it is night, and there is anything more to it
uniform bool night;

out vec4 color;
${NORMAL_OF}
//as many thirds of light as a pixel can take from the lamps, over its own
//colour: no more than a third over, for nothing to be lit white
const float MOST_STEPS = 4.0;
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 a = texelFetch(albedo, px, 0).rgb;
  vec3 n = normalOf(texelFetch(normals, px, 0));
  vec3 lit = clamp(ambient + max(dot(n, sunDir), 0.0) * sunLight, 0.0, 1.0);
  vec3 c = a * lit;

  if (night) {
    float h = texelFetch(heights, px, 0).r * 255.0;
    vec3 l = texelFetch(light, px, 0).rgb * 2.0;
    float most = max(l.r, max(l.g, l.b));

    if (most > 0.0) {
      //in steps of a third, dithered between them by where on the ground
      //it is
      vec2 ground = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y + h) - origin;
      ivec2 g = ivec2(floor(ground)) & 3;
      float b = (BAYER[g.y * 4 + g.x] + 0.5) / 16.0;
      float s = min(floor(most * 3.0 + b), MOST_STEPS) / 3.0;

      l *= s / most;
    }

    c += a * l + texelFetch(shine, px, 0).rgb;
  }

  color = vec4(min(c, vec3(1.0)), 1.0);
}
`;

//over the lit city, the layers above it as they are painted
var PLAIN_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray pages;
uniform vec2 size;

flat in vec4 vRect;
flat in float vAlpha;
flat in vec4 vSrc0;
flat in vec4 vSrc1;
flat in vec4 vSrc2;

out vec4 color;

void main() {
  ivec2 at = ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)) - ivec2(vRect.xy);
  vec4 c = texelFetch(pages, ivec3(ivec2(vSrc0.yz) + at, int(vSrc0.x)), 0);

  if (c.a * vAlpha <= 0.0) discard;
  color = vec4(c.rgb, c.a * vAlpha);
}
`;

var PLAIN_CANVAS_FS = `#version 300 es
precision highp float;

uniform sampler2D picture;
uniform vec2 size;

out vec4 color;

void main() {
  vec4 c = texelFetch(picture, ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)), 0);

  if (c.a <= 0.0) discard;
  color = c;
}
`;

/**
 * @param pageSize {number} how big a page of the canvas cache is
 * @param maxPages {number} and how many there can be
 */
function GLView(pageSize, maxPages) {
  this.canvas = document.createElement("canvas");
  this.gl = this.canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });

  if (this.gl === null) throw new Error("WebGL2 is needed to draw the city");

  this.pageSize = pageSize;
  this.maxPages = maxPages;
  this.setup();

  this.sprites = new Float32Array(FLOATS * 1024);
  this.count = 0;
  this.lampData = new Float32Array(LAMP_FLOATS * 64);
}

GLView.prototype.setup = function () {
  var gl = this.gl;

  this.spriteProgram = program(gl, SPRITE_VS, SPRITE_FS);
  this.plainProgram = program(gl, SPRITE_VS, PLAIN_FS);
  this.canvasProgram = program(gl, FULL_VS, CANVAS_FS);
  this.plainCanvasProgram = program(gl, FULL_VS, PLAIN_CANVAS_FS);
  this.lampProgram = program(gl, LAMP_VS, LAMP_FS);
  this.litProgram = program(gl, FULL_VS, LIT_FS);

  //a square, two triangles, 0..1
  this.corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    gl.STATIC_DRAW,
  );

  this.spriteBuffer = gl.createBuffer();
  this.lampBuffer = gl.createBuffer();

  //the pages, as many as there are so far, and room for more (grow)
  this.pages = null;
  this.depth = 0;
  this.grow(4);

  //the pictures of the screen, and the lamps' light
  this.targets = [0, 1, 2, 3].map(function () {
    return texture2d(gl);
  });
  this.lightTex = texture2d(gl);
  this.first = gl.createFramebuffer();
  this.second = gl.createFramebuffer();
  this.lightFrame = gl.createFramebuffer();
  this.canvasTex = texture2d(gl);
  this.width = this.height = 0;

  //the squares of the pictures, each of the batches it is drawn in: the
  //colours, the ways things look and how high they stand; what shines
  var self = this;

  this.vaos = [0, 1].map(function (group) {
    return [self.spriteProgram, self.plainProgram].map(function (p) {
      var vao = gl.createVertexArray();

      gl.bindVertexArray(vao);
      attribute(gl, p, "corner", self.corners, 2, 0, 0, 0);
      attribute(gl, p, "rect", self.spriteBuffer, 4, FLOATS * 4, 0, 1);
      attribute(gl, p, "misc", self.spriteBuffer, 4, FLOATS * 4, 16, 1);
      //the colours always, and then the two this batch draws into besides
      attribute(gl, p, "src0", self.spriteBuffer, 4, FLOATS * 4, 32, 1);
      attribute(
        gl,
        p,
        "src1",
        self.spriteBuffer,
        4,
        FLOATS * 4,
        group === 0 ? 48 : 80,
        1,
      );
      attribute(gl, p, "src2", self.spriteBuffer, 4, FLOATS * 4, 64, 1);

      return vao;
    });
  });

  this.lampVao = gl.createVertexArray();
  gl.bindVertexArray(this.lampVao);
  attribute(gl, this.lampProgram, "corner", this.corners, 2, 0, 0, 0);
  attribute(
    gl,
    this.lampProgram,
    "lamp",
    this.lampBuffer,
    4,
    LAMP_FLOATS * 4,
    0,
    1,
  );
  attribute(
    gl,
    this.lampProgram,
    "tint",
    this.lampBuffer,
    4,
    LAMP_FLOATS * 4,
    16,
    1,
  );
  attribute(
    gl,
    this.lampProgram,
    "aim",
    this.lampBuffer,
    4,
    LAMP_FLOATS * 4,
    32,
    1,
  );
  attribute(
    gl,
    this.lampProgram,
    "shape",
    this.lampBuffer,
    4,
    LAMP_FLOATS * 4,
    48,
    1,
  );

  this.fullVao = gl.createVertexArray();
  gl.bindVertexArray(this.fullVao);
  [this.canvasProgram, this.plainCanvasProgram, this.litProgram].forEach(
    function (p) {
      attribute(gl, p, "corner", self.corners, 2, 0, 0, 0);
    },
  );
  gl.bindVertexArray(null);
};

/* --- Pages ------------------------------------------------------------- */

/**
 * Makes room for at least n pages, keeping what is on those there are.
 */
GLView.prototype.grow = function (n) {
  var gl = this.gl,
    size = this.pageSize,
    depth = Math.min(this.maxPages, Math.max(n, this.depth * 2, 4)),
    old = this.pages,
    pages = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D_ARRAY, pages);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, size, size, depth);

  //what was on the old pages, onto the new ones, page by page
  if (old !== null) {
    var read = gl.createFramebuffer();

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
    for (var i = 0; i < this.depth; i++) {
      gl.framebufferTextureLayer(
        gl.READ_FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        old,
        0,
        i,
      );
      gl.copyTexSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, i, 0, 0, size, size);
    }
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.deleteFramebuffer(read);
    gl.deleteTexture(old);
  }

  this.pages = pages;
  this.depth = depth;
};

/**
 * A picture painted, w by h, into its slot at x, y on page (client/
 * canvascache): its pixels, not premultiplied.
 */
GLView.prototype.upload = function (page, x, y, w, h, pixels) {
  var gl = this.gl;

  if (page >= this.depth) this.grow(page + 1);

  gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.pages);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texSubImage3D(
    gl.TEXTURE_2D_ARRAY,
    0,
    x,
    y,
    page,
    w,
    h,
    1,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    pixels,
  );
};

/**
 * How see-through the pixel at x, y of page is, 0..255 - for what is under
 * a finger to be told (client/components camerascript).
 */
GLView.prototype.alphaAt = function (page, x, y) {
  var gl = this.gl,
    read = this.reader || (this.reader = gl.createFramebuffer()),
    out = this.pixel || (this.pixel = new Uint8Array(4));

  if (page >= this.depth) return 0;

  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, read);
  gl.framebufferTextureLayer(
    gl.READ_FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    this.pages,
    0,
    page,
  );
  gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);

  return out[3];
};

/* --- A frame ----------------------------------------------------------- */

/**
 * Starts a frame w by h - at night with what shines and how high things
 * stand drawn too.
 */
GLView.prototype.begin = function (w, h, night) {
  var gl = this.gl;

  if (this.width !== w || this.height !== h) this.resize(w, h);

  this.night = night;
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  for (var f of [this.first, this.second]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
};

GLView.prototype.resize = function (w, h) {
  var gl = this.gl,
    t = this.targets;

  this.canvas.width = this.width = w;
  this.canvas.height = this.height = h;

  t.concat([this.lightTex]).forEach(function (tex) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
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
  });

  attach(gl, this.first, [t[ALBEDO], t[NORMAL], t[HEIGHT]]);
  attach(gl, this.second, [t[SHINE]]);
  attach(gl, this.lightFrame, [this.lightTex]);
};

/**
 * A square of a picture to draw, at x, y on the screen, w by h, as see-
 * through as alpha: the floats for the rest of it (see FLOATS), from
 * offset on, to be filled in - by client/cachedsprite glQuad.
 *
 * @returns {Float32Array} where to fill them in
 */
GLView.prototype.add = function (x, y, w, h, alpha) {
  if ((this.count + 1) * FLOATS > this.sprites.length) {
    var more = new Float32Array(this.sprites.length * 2);

    more.set(this.sprites);
    this.sprites = more;
  }

  var d = this.sprites,
    o = this.count * FLOATS;

  d[o] = x;
  d[o + 1] = y;
  d[o + 2] = w;
  d[o + 3] = h;
  d[o + 4] = alpha;
  this.offset = o + 8;

  return d;
};

//keeps the square just added, its floats filled in
GLView.prototype.keep = function () {
  this.count++;
};

/**
 * Draws the squares added since, and over them the canvas, if any - into
 * the pictures of the screen of the lit city (lit), or over it as they are.
 */
GLView.prototype.flush = function (lit, canvas) {
  var gl = this.gl,
    n = this.count;

  this.count = 0;

  if (n > 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      this.sprites.subarray(0, n * FLOATS),
      gl.STREAM_DRAW,
    );

    if (lit) {
      this.batch(this.first, this.spriteProgram, this.vaos[0][0], true, n, 3);
      if (this.night)
        this.batch(
          this.second,
          this.spriteProgram,
          this.vaos[1][0],
          false,
          n,
          1,
        );
    } else this.batch(null, this.plainProgram, this.vaos[0][1], true, n, 1);
  }

  if (canvas) {
    var gl2 = this.gl;

    gl2.activeTexture(gl2.TEXTURE0);
    gl2.bindTexture(gl2.TEXTURE_2D, this.canvasTex);
    gl2.pixelStorei(gl2.UNPACK_FLIP_Y_WEBGL, false);
    gl2.pixelStorei(gl2.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl2.texImage2D(
      gl2.TEXTURE_2D,
      0,
      gl2.RGBA,
      gl2.RGBA,
      gl2.UNSIGNED_BYTE,
      canvas,
    );

    var p = lit ? this.canvasProgram : this.plainCanvasProgram;

    gl2.bindFramebuffer(gl2.FRAMEBUFFER, lit ? this.first : null);
    if (lit) drawBuffers(gl2, 3);
    gl2.useProgram(p);
    gl2.uniform1i(gl2.getUniformLocation(p, "picture"), 0);
    gl2.uniform2f(gl2.getUniformLocation(p, "size"), this.width, this.height);
    gl2.bindVertexArray(this.fullVao);
    gl2.drawArrays(gl2.TRIANGLES, 0, 6);
  }
};

GLView.prototype.batch = function (frame, p, vao, colours, n, outputs) {
  var gl = this.gl;

  gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
  if (frame !== null) drawBuffers(gl, outputs);
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.pages);
  gl.uniform1i(gl.getUniformLocation(p, "pages"), 0);
  gl.uniform2f(gl.getUniformLocation(p, "size"), this.width, this.height);
  var loc = gl.getUniformLocation(p, "colours");

  if (loc !== null) gl.uniform1i(loc, colours ? 1 : 0);
  gl.bindVertexArray(vao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
};

/**
 * Lights the city drawn so far into the frame: by the sun, and at night by
 * every lamp.
 *
 * @param lamps {Array} at night, every lamp on the screen (LAMP_FLOATS):
 *        {x, y, z, reach, color, peak, aim, cone, tall, [wrap], [foot]} -
 *        wrap, how far round what it lights it reaches (WRAP), and foot,
 *        false for its peak to be how bright it is close by rather than on
 *        the ground under it
 * @param sky {{ambient, sun, dir}} the light of the sky and the sun, 0..1
 * @param origin {number[]} where the world's origin is on the screen
 */
GLView.prototype.light = function (lamps, sky, origin) {
  var gl = this.gl,
    t = this.targets,
    w = this.width,
    h = this.height;

  gl.disable(gl.BLEND);

  if (this.night) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFrame);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (lamps.length > 0) {
      this.uploadLamps(lamps);
      gl.useProgram(this.lampProgram);
      bind(gl, this.lampProgram, "normals", t[NORMAL], 0);
      bind(gl, this.lampProgram, "heights", t[HEIGHT], 1);
      gl.uniform2f(gl.getUniformLocation(this.lampProgram, "size"), w, h);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.lampVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, lamps.length);
      gl.disable(gl.BLEND);
    }
  }

  var p = this.litProgram;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(p);
  bind(gl, p, "albedo", t[ALBEDO], 0);
  bind(gl, p, "normals", t[NORMAL], 1);
  bind(gl, p, "heights", t[HEIGHT], 2);
  bind(gl, p, "shine", t[SHINE], 3);
  bind(gl, p, "light", this.lightTex, 4);
  gl.uniform2f(gl.getUniformLocation(p, "size"), w, h);
  gl.uniform2f(gl.getUniformLocation(p, "origin"), origin[0], origin[1]);
  gl.uniform3fv(gl.getUniformLocation(p, "ambient"), sky.ambient);
  gl.uniform3fv(gl.getUniformLocation(p, "sunLight"), sky.sun);
  gl.uniform3fv(gl.getUniformLocation(p, "sunDir"), sky.dir);
  gl.uniform1i(gl.getUniformLocation(p, "night"), this.night ? 1 : 0);
  gl.bindVertexArray(this.fullVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
};

//the lamps into their buffer, LAMP_FLOATS a lamp
GLView.prototype.uploadLamps = function (lamps) {
  var gl = this.gl;

  if (this.lampData.length < lamps.length * LAMP_FLOATS)
    this.lampData = new Float32Array(lamps.length * LAMP_FLOATS * 2);

  var d = this.lampData;

  for (var i = 0; i < lamps.length; i++) {
    var l = lamps[i],
      o = i * LAMP_FLOATS;

    d[o] = l.x;
    d[o + 1] = l.y;
    d[o + 2] = l.z;
    d[o + 3] = l.reach;
    d[o + 4] = l.color[0];
    d[o + 5] = l.color[1];
    d[o + 6] = l.color[2];
    d[o + 7] = l.peak;
    d[o + 8] = l.aim ? l.aim[0] : 0;
    d[o + 9] = l.aim ? l.aim[1] : 0;
    d[o + 10] = l.aim ? l.cone : -1;
    d[o + 11] = l.tall;
    d[o + 12] = l.wrap === undefined ? WRAP : l.wrap;
    d[o + 13] = l.foot === false ? 0 : 1;
    d[o + 14] = 0;
    d[o + 15] = 0;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, this.lampBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    d.subarray(0, lamps.length * LAMP_FLOATS),
    gl.STREAM_DRAW,
  );
};

/* --- WebGL ------------------------------------------------------------ */

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

function texture2d(gl) {
  var t = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array(4),
  );

  return t;
}

function attach(gl, frame, textures) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, frame);
  textures.forEach(function (t, i) {
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0 + i,
      gl.TEXTURE_2D,
      t,
      0,
    );
  });
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

//draws into the first n pictures of the framebuffer bound
function drawBuffers(gl, n) {
  var b = [gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2];

  gl.drawBuffers(b.slice(0, n));
}

function attribute(gl, p, name, buffer, size, stride, offset, divisor) {
  var at = gl.getAttribLocation(p, name);

  if (at < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, size, gl.FLOAT, false, stride, offset);
  gl.vertexAttribDivisor(at, divisor);
}

function bind(gl, p, name, tex, unit) {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(gl.getUniformLocation(p, name), unit);
}

GLView.FLOATS = FLOATS;
GLView.SKIP = SKIP;
GLView.DARK = DARK;
GLView.FROM = FROM;

export default GLView;
