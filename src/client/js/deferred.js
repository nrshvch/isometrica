/**
 * The light worked out pixel by pixel, in WebGL (client/lighting): the
 * canvases the city is drawn into - its colours with no light on them, which
 * way every pixel looks, and at night how high every pixel stands, what
 * shines of itself and the light thrown round the foot of the buildings -
 * are handed over as textures, and lit here into one picture.
 *
 * Every lamp is a little square over just the pixels it can reach, adding
 * its light into a canvas of light (light): how far it is from the lamp in
 * the world - worked out from where the pixel is on the screen and how high
 * it stands - and how squarely it faces it. The light is then put in steps
 * of a third, dithered between them by where on the ground the pixel is, so
 * that it stays put as the city scrolls by (lit): pixel art, lit as the
 * world would be.
 *
 * Nothing else is drawn with it, and nothing else has to know: what is drawn
 * comes back as a canvas, drawn into the frame like any other.
 */

//the canvases handed over, by what they hold (client/lighting)
var ALBEDO = 0,
  NORMAL = 1,
  HEIGHT = 2,
  SHINE = 3,
  GLOW = 4;

//what a lamp is to the shader, so many floats of it: where the spot under
//it is on the screen, how high it hangs and how far it reaches; its light
//and how much of it there is under it; which way it shines, how wide, and
//how high whatever it can reach stands
var FLOATS = 12;

var QUAD = `#version 300 es
precision highp float;

//the corners of a square, 0..1
in vec2 corner;
//the lamp: where its spot is on the screen, its height and reach
in vec4 lamp;
//its light, and how much of it falls straight under it
in vec4 tint;
//which way it shines on the ground, as it is seen, and how wide (-1 for
//all round), and how high what it lights can stand
in vec4 aim;

uniform vec2 size;

out vec4 vLamp;
out vec4 vTint;
out vec4 vAim;

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

var LIGHT = `#version 300 es
precision highp float;

uniform sampler2D normals;
uniform sampler2D heights;
uniform vec2 size;

in vec4 vLamp;
in vec4 vTint;
in vec4 vAim;

out vec4 light;
${NORMAL_OF}
void main() {
  //the pixel, on the canvas the textures were taken from - top down
  ivec2 px = ivec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  float h = texelFetch(heights, px, 0).r * 255.0;
  vec3 n = normalOf(texelFetch(normals, px, 0));

  //from the lamp to the pixel in the world, as it is seen: across the
  //screen x - y, up it -(x + y) / 2 - z, a pixel a unit
  vec2 d = vec2(float(px.x) + 0.5, float(px.y) + 0.5 + h) - vLamp.xy;
  vec3 p = vec3((d.x - 2.0 * d.y) * 0.5, (-d.x - 2.0 * d.y) * 0.5, h - vLamp.z);
  float far = length(p);
  float reach = vLamp.w;

  if (far >= reach) discard;

  vec3 l = -p / max(far, 0.001);
  //how squarely it faces the lamp - wrapped a little round, so the lit side
  //of a thing does not end in a hard line
  float facing = clamp((dot(n, l) + 0.25) / 1.25, 0.0, 1.0);
  //as bright as it is under the lamp, there, and falling off to nothing
  float under = 1.0 - (vLamp.z * vLamp.z) / (reach * reach);
  float k = (1.0 - (far * far) / (reach * reach)) / max(under, 0.05);

  //a headlight's cone, along the ground the way it shines
  if (vAim.z > -1.0) {
    vec2 g = normalize(p.xy + vec2(0.0001));
    float along = dot(g, vAim.xy);
    k *= smoothstep(vAim.z, mix(vAim.z, 1.0, 0.5), along);
  }

  //half as much stored, for twice as much to fit
  light = vec4(vTint.rgb * vTint.a * k * facing * 0.5, 1.0);
}
`;

var FULL = `#version 300 es
precision highp float;
in vec2 corner;
void main() {
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

var LIT = `#version 300 es
precision highp float;

uniform sampler2D albedo;
uniform sampler2D normals;
uniform sampler2D heights;
uniform sampler2D shine;
uniform sampler2D glow;
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
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

void main() {
  ivec2 px = ivec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  vec3 a = texelFetch(albedo, px, 0).rgb;
  vec3 n = normalOf(texelFetch(normals, px, 0));
  vec3 lit = clamp(ambient + max(dot(n, sunDir), 0.0) * sunLight, 0.0, 1.0);
  vec3 c = a * lit;

  if (night) {
    float h = texelFetch(heights, px, 0).r * 255.0;
    vec3 l = texelFetch(light, ivec2(gl_FragCoord.xy), 0).rgb * 2.0;
    float most = max(l.r, max(l.g, l.b));

    if (most > 0.0) {
      //in steps of a third, dithered between them by where on the ground
      //it is
      ivec2 g = ivec2(floor(vec2(px) + vec2(0.0, h) - origin)) & 3;
      float b = (BAYER[g.y * 4 + g.x] + 0.5) / 16.0;
      float s = min(floor(most * 3.0 + b), 6.0) / 3.0;

      l *= s / most;
    }

    //the light thrown round the buildings, from below: on what looks up the
    //most, on the sides by half
    vec3 spilt = texelFetch(glow, px, 0).rgb * mix(0.5, 1.0, max(n.z, 0.0));

    c += a * (l + spilt) + texelFetch(shine, px, 0).rgb;
  }

  color = vec4(min(c, vec3(1.0)), 1.0);
}
`;

function Deferred() {
  this.canvas = document.createElement("canvas");
  this.gl = this.canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
  });
  this.ok = this.gl !== null && this.setup();
  this.data = new Float32Array(FLOATS * 64);
}

/**
 * Whether WebGL2 is there to light the city with.
 */
Deferred.prototype.supported = function () {
  return this.ok;
};

Deferred.prototype.setup = function () {
  var gl = this.gl;

  try {
    this.quad = program(gl, QUAD, LIGHT);
    this.full = program(gl, FULL, LIT);
  } catch (e) {
    console.warn("No light worked out per pixel:", e);
    return false;
  }

  //a square, two triangles, 0..1
  this.corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]),
    gl.STATIC_DRAW,
  );
  this.lamps = gl.createBuffer();

  this.textures = [ALBEDO, NORMAL, HEIGHT, SHINE, GLOW].map(function () {
    return texture(gl);
  });
  this.light = texture(gl);
  this.lightFrame = gl.createFramebuffer();
  this.width = this.height = 0;

  //the lamps' squares, and the whole screen
  this.quadVao = gl.createVertexArray();
  gl.bindVertexArray(this.quadVao);
  attribute(gl, this.quad, "corner", this.corners, 2, 0, 0, 0);
  attribute(gl, this.quad, "lamp", this.lamps, 4, FLOATS * 4, 0, 1);
  attribute(gl, this.quad, "tint", this.lamps, 4, FLOATS * 4, 16, 1);
  attribute(gl, this.quad, "aim", this.lamps, 4, FLOATS * 4, 32, 1);

  this.fullVao = gl.createVertexArray();
  gl.bindVertexArray(this.fullVao);
  attribute(gl, this.full, "corner", this.corners, 2, 0, 0, 0);
  gl.bindVertexArray(null);

  return true;
};

/**
 * Lights the canvases (indexed as ALBEDO and the rest; at night all of
 * them, by day only the colours and the ways things look) into this
 * canvas, w by h.
 *
 * @param lamps {Array} at night, every lamp on the screen (see FLOATS):
 *        {x, y, z, reach, color, peak, aim, cone, tall}
 * @param sky {{ambient, sun, dir}} the light of the sky and the sun, 0..1
 * @param origin {number[]} where the world's origin is on the screen
 * @returns {HTMLCanvasElement}
 */
Deferred.prototype.render = function (
  canvases,
  w,
  h,
  night,
  lamps,
  sky,
  origin,
) {
  var gl = this.gl,
    t = this.textures,
    i;

  if (this.width !== w || this.height !== h) {
    this.canvas.width = this.width = w;
    this.canvas.height = this.height = h;
    gl.bindTexture(gl.TEXTURE_2D, this.light);
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFrame);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.light,
      0,
    );
  }

  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  for (i = 0; i < (night ? 5 : 2); i++) {
    gl.bindTexture(gl.TEXTURE_2D, t[i]);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      canvases[i],
    );
  }

  gl.viewport(0, 0, w, h);

  //the light of every lamp, added up
  if (night) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.lightFrame);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (lamps.length > 0) {
      this.upload(lamps);
      gl.useProgram(this.quad);
      bind(gl, this.quad, "normals", t[NORMAL], 0);
      bind(gl, this.quad, "heights", t[HEIGHT], 1);
      gl.uniform2f(gl.getUniformLocation(this.quad, "size"), w, h);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.bindVertexArray(this.quadVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, lamps.length);
      gl.disable(gl.BLEND);
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(this.full);
  bind(gl, this.full, "albedo", t[ALBEDO], 0);
  bind(gl, this.full, "normals", t[NORMAL], 1);
  bind(gl, this.full, "heights", t[HEIGHT], 2);
  bind(gl, this.full, "shine", t[SHINE], 3);
  bind(gl, this.full, "glow", t[GLOW], 4);
  bind(gl, this.full, "light", this.light, 5);
  gl.uniform2f(gl.getUniformLocation(this.full, "size"), w, h);
  gl.uniform2f(
    gl.getUniformLocation(this.full, "origin"),
    origin[0],
    origin[1],
  );
  gl.uniform3fv(gl.getUniformLocation(this.full, "ambient"), sky.ambient);
  gl.uniform3fv(gl.getUniformLocation(this.full, "sunLight"), sky.sun);
  gl.uniform3fv(gl.getUniformLocation(this.full, "sunDir"), sky.dir);
  gl.uniform1i(gl.getUniformLocation(this.full, "night"), night ? 1 : 0);
  gl.bindVertexArray(this.fullVao);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.bindVertexArray(null);

  return this.canvas;
};

//the lamps into their buffer, FLOATS a lamp
Deferred.prototype.upload = function (lamps) {
  var gl = this.gl;

  if (this.data.length < lamps.length * FLOATS)
    this.data = new Float32Array(lamps.length * FLOATS * 2);

  var d = this.data;

  for (var i = 0; i < lamps.length; i++) {
    var l = lamps[i],
      o = i * FLOATS;

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
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, this.lamps);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    d.subarray(0, lamps.length * FLOATS),
    gl.DYNAMIC_DRAW,
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

function texture(gl) {
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

Deferred.ALBEDO = ALBEDO;
Deferred.NORMAL = NORMAL;
Deferred.HEIGHT = HEIGHT;
Deferred.SHINE = SHINE;
Deferred.GLOW = GLOW;

export default Deferred;
