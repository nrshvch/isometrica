import GLCanvas from "./glcanvas";

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
 * there before as a picture drawn over another does. What a layer draws as
 * lines, shapes and words instead - the lines round a city, the price over a
 * building - is drawn over the layer's pictures in WebGL too (client/
 * glcanvas, overlay). The frame is drawn on the canvas shown on the page.
 *
 * Once the lit layers are in, they are lit (light): every lamp - a street
 * light, a headlight, a lit window or sign, a police car's flash - a square over
 * just the pixels it can reach, adding its light by how far each is from it
 * in the world - worked out from where it is on the screen and how high it
 * stands - and how squarely it faces it; then every pixel by the sun, the
 * lamps' light put in steps of a third, dithered by where the pixel is from
 * the world's origin, and what shines added in over the dark. The layers over the city
 * are drawn on top of that as they are painted.
 */

//what a square of a picture is to the shader, so many floats: where it is
//on the screen and how big; how see-through; and for each of the pictures
//of the screen it is drawn into - the colours, the ways things look, how
//high things stand, what shines - where it is drawn from: the page, x and y
//there, and how (SKIP, DARK, FROM, GLOW)
var FLOATS = 24;

//how a square is drawn into one of the pictures of the screen: not at all;
//in black where the picture is (looking up, on the ground, nothing
//shining); from a picture of its own; or, into how high things stand, as
//glowing where the picture is - as bright as its own colours whatever the
//light, by day or night (a police car's lamp, a cab's sign)
var SKIP = 0,
  DARK = 1,
  FROM = 2,
  GLOW = 3;

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

//how near the eye a pixel is, as the depth buffer has it: the camera looks
//down the same way at everything, so a pixel y down the screen (from its
//top) and z high in the world (a pixel a unit) is as near as 2y + 3z -
//down the screen and up nearer, along the way the eye looks (from screen
//down = -(x + y) / 2 - z). 0 nearest, 1 furthest
var DEPTH_OF = `
float depthOf(float y, float z) {
  return clamp(0.5 - (2.0 * y + 3.0 * z) / 16384.0, 0.0, 1.0);
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
flat out float vElev;
flat out float vDither;
flat out float vOver;
flat out vec4 vSrc0;
flat out vec4 vSrc1;
flat out vec4 vSrc2;

void main() {
  vec2 at = rect.xy + corner * rect.zw;

  vRect = rect;
  vAlpha = misc.x;
  vElev = misc.y;
  vDither = misc.z;
  vOver = misc.w;
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
//where the world's origin is on the screen, for a dithered picture's
//pattern to stay put as the lamps' light does
uniform vec2 origin;

flat in vec4 vRect;
flat in float vAlpha;
//how high the ground it stands on is, a pixel a unit
flat in float vElev;
//whether how see-through it is is dithered rather than blended
flat in float vDither;
//how high over the ground it is, all of it, for a picture with no heights
//of its own - a puff of smoke up in the air
flat in float vOver;
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
//colours are, from its own, or glowing where they are (the blue of how
//high things stand)
vec4 drawn(vec4 src, ivec2 at, float shape) {
  if (src.w < 0.5) return vec4(0.0);
  if (src.w < 1.5) return vec4(0.0, 0.0, 0.0, shape);
  if (src.w > 2.5) return vec4(0.0, 0.0, 1.0, shape);
  vec4 t = fetch(src, at);
  return vec4(t.rgb, t.a * vAlpha);
}

//how high it stands, as much there as its colours are: every pixel of
//that picture is there - what it stands over the ground under it carried
//in the green (client/cachedsprite Layers finish)
vec4 tall(vec4 src, ivec2 at, float shape) {
  return vec4(drawn(src, at, shape).rgb, src.w < 0.5 ? 0.0 : shape);
}

uniform bool colours;
uniform vec4 albedoSrc;

const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
${WHOLE}${DEPTH_OF}
//how high the pixel stands in the world: over the ground it stands on as
//its picture of that says, nothing for one with none of its own
float height(ivec2 at) {
  return vElev + (vSrc2.w > 1.5 && vSrc2.w < 2.5 ? fetch(vSrc2, at).r * 255.0 : 0.0);
}

void main() {
  ivec2 at = local();
  vec4 c = fetch(vSrc0, at);
  float shape = c.a * vAlpha;

  //see-through the way pixel art is: there or not, a pixel at a time, by
  //where it is in a pattern laid from the world's origin - as many of them
  //there as it is solid
  if (vDither > 0.5) {
    ivec2 g4 = ivec2(floor(vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) - origin)) & 3;

    shape = shape > (BAYER[g4.y * 4 + g4.x] + 0.5) / 16.0 ? 1.0 : 0.0;
  }

  if (shape <= 0.0) discard;

  gl_FragDepth = gl_FragCoord.z;

  if (colours) {
    out0 = vec4(c.rgb, shape);
    out1 = whole(drawn(vSrc1, at, shape));
    out2 = whole(
      vSrc2.w > 0.5 && vSrc2.w < 1.5 && vOver > 0.0
        ? vec4(min(vOver, 255.0) / 255.0, 0.0, 0.0, shape)
        : tall(vSrc2, at, shape));
    //how near it is, for what is drawn over the city to be hidden behind it
    //(the pictures are still drawn in the order the engine sorts them)
    gl_FragDepth = depthOf(size.y - gl_FragCoord.y, height(at));
  } else {
    out0 = drawn(vSrc1, at, shape);
    out1 = drawn(vSrc2, at, shape);
    out2 = vec4(0.0);
  }
}
`;

//what is kept in sight (client/lighting seeThrough) where something stands
//in front of it: in its own colour, every other pixel of it, glowing - drawn
//only where what is there is well nearer the eye than it is
var XRAY_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray pages;
uniform vec2 size;
uniform vec3 tint;

flat in vec4 vRect;
flat in float vAlpha;
flat in float vElev;
flat in vec4 vSrc0;
flat in vec4 vSrc1;
flat in vec4 vSrc2;

layout(location = 0) out vec4 out0;
layout(location = 1) out vec4 out1;
layout(location = 2) out vec4 out2;
${DEPTH_OF}
vec4 fetch(vec4 src, ivec2 at) {
  return texelFetch(pages, ivec3(ivec2(src.yz) + at, int(src.x)), 0);
}

void main() {
  ivec2 at = ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)) - ivec2(vRect.xy);

  //every other pixel of it, the pattern going with it as it moves
  if (fetch(vSrc0, at).a < 0.5 || ((at.x + at.y) & 1) == 1) discard;

  float h = vElev + (vSrc2.w > 1.5 && vSrc2.w < 2.5 ? fetch(vSrc2, at).r * 255.0 : 0.0);

  //a little nearer than it is, so that only what stands well in front of
  //it hides it - not the road under it, nor its own lamp
  gl_FragDepth = depthOf(size.y - gl_FragCoord.y, h + 4.0);
  out0 = vec4(tint, 1.0);
  out1 = vec4(0.0, 0.0, 0.0, 1.0);
  out2 = vec4(0.0, 0.0, 1.0, 1.0);
}
`;

var FULL_VS = `#version 300 es
precision highp float;
in vec2 corner;
void main() {
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}
`;

//what a picture stands over the ground, as high as it stands over it, into
//the map of the ground on the screen (the ground spot under a pixel h high
//is h pixels lower down): the most of whatever stands over every bit of it
//- drawn with the margin round the screen there is round the map
var STAMP_VS = `#version 300 es
precision highp float;

in vec2 corner;
in vec4 rect;
in vec4 misc;
in vec4 src2;

uniform vec2 size;
uniform float margin;

flat out vec4 vRect;
flat out vec4 vSrc;
flat out float vAlpha;

void main() {
  vec2 at = rect.xy + margin + corner * rect.zw;

  vRect = vec4(rect.xy + margin, rect.zw);
  vSrc = src2;
  vAlpha = misc.x;
  gl_Position = vec4(at.x / size.x * 2.0 - 1.0, 1.0 - at.y / size.y * 2.0, 0.0, 1.0);
}
`;

var STAMP_FS = `#version 300 es
precision highp float;
precision highp sampler2DArray;

uniform sampler2DArray pages;
uniform vec2 size;

flat in vec4 vRect;
flat in vec4 vSrc;
flat in float vAlpha;

out vec4 out0;

void main() {
  //drawn from a picture of how high it stands, or not at all - and not
  //while it is drawn see-through, faded out of the way: no shadow then
  if (vSrc.w < 1.5 || vSrc.w > 2.5 || vAlpha < 0.99) discard;

  ivec2 at = ivec2(int(gl_FragCoord.x), int(size.y - gl_FragCoord.y)) - ivec2(vRect.xy);
  float over = texelFetch(pages, ivec3(ivec2(vSrc.yz) + at, int(vSrc.x)), 0).g;

  if (over <= 0.0) discard;
  out0 = vec4(over, 0.0, 0.0, 1.0);
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

  //a lamp shining down, as a street light does under its shade: all of it
  //in a cone under it (vShape.z the cosine of half of it), and a little of
  //it out to the sides (vShape.w) - only below the lamp, none of it up - so
  //that a wall is lit from its foot up as far as the light reaches it, not
  //in a band of its own at the lamp's height
  if (vShape.z > 0.0) {
    float down = -p.z / max(far, 0.001);
    float cone = smoothstep(vShape.z, mix(vShape.z, 1.0, 0.3), down);
    float side = vShape.w * smoothstep(0.0, 0.6, down);

    k *= max(cone, side);
  }

  //a headlight's cone, along the ground the way it shines
  if (vAim.z > -1.0) {
    vec2 g = normalize(p.xy + vec2(0.0001));
    k *= smoothstep(vAim.z, mix(vAim.z, 1.0, 0.5), dot(g, vAim.xy));
  }

  //half as much stored, for twice as much to fit
  light = vec4(vTint.rgb * vTint.a * k * facing * 0.5, 1.0);
}
`;

//how many points a bolt of lightning has (client/weather bolt)
var BOLT = 12;

var LIT_FS = `#version 300 es
precision highp float;
#define BOLT ${BOLT}

uniform sampler2D albedo;
uniform sampler2D normals;
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
//whether the sun casts shadows: how high every pixel stands, and the most
//that stands over every bit of the ground on the screen (stamp) - with a
//margin round it - and the way to the sun from a pixel, a step at a time:
//along the ground on the screen, and up
uniform bool shadows;
uniform sampler2D heights;
uniform sampler2D ground;
uniform float margin;
uniform vec3 sunStep;

//the weather (client/weather): how much of the sky is cloud - its shadows
//drifting over the city, how far they have drifted, and how grey the day
//is for it; the fog - how thick, and its colour; how much the lamps' light
//glows in the air, and how much the city's lights light the sky over it at
//night; how wet the ground is, and how hard it rains, the rain slanting by
//the wind; a flash of lightning, and the bolt of it; and the time, s, for
//the rain to fall by
uniform float cloud;
uniform vec2 cloudAt;
uniform float grey;
uniform float fog;
uniform vec3 fogColor;
uniform float haze;
uniform float glowSky;
uniform float wet;
uniform float rain;
uniform float slant;
uniform float flash;
uniform vec2 bolt[BOLT];
uniform bool bolted;
uniform float time;

out vec4 color;
${NORMAL_OF}
//as many thirds of light as a pixel can take from the lamps, over its own
//colour: no more than a third over, for nothing to be lit white
const float MOST_STEPS = 4.0;
//how much of a lamp's light is lost in full daylight
const float DAY_DIM = 0.88;
const float BAYER[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);

//how far out from the middle of the screen to its edges the fog begins -
//clear inside that - and where it is as thick as it gets, past the edges
//towards the corners
const float FOG_CLEAR = 0.3;
const float FOG_THICK = 1.25;
//how much of it there is round where the eye is, of what there is further
//out; how high its layer lies at the thinnest of a bank, and how much
//higher at the thickest, a pixel a unit; and how quickly it thickens the
//deeper in it
const float FOG_NEAR = 0.3;
const float FOG_LOW = 12.0;
const float FOG_HIGH = 60.0;
const float FOG_DENSE = 0.045;

//how many steps towards the sun a pixel looks for what stands in its way,
//and how much higher than the way to the sun that has to be
const int SHADOW_STEPS = 32;
const float SHADOW_BIAS = 2.0;
//how far out from the side of anything, along the ground on the screen
const float SHADOW_OUT = 2.5;

//whether a pixel is in the shadow of anything: from the pixel, the way to
//the sun - over the ground under it on the screen, and up as it goes - and
//anything standing over the ground along it higher than that. Each pixel
//starts a little further along than the next, dithered as the lamps' light
//is, so the end of a long shadow frays rather than stepping
float shadowed(ivec2 px, vec3 n, float b) {
  float h = texelFetch(heights, px, 0).r * 255.0;
  vec2 under = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y + h) + margin;
  //from a little way out from a wall or the side of anything, the way it
  //looks - not from the ground at its foot, which it stands over itself
  vec2 side = vec2(n.x - n.y, -(n.x + n.y) * 0.5);

  if (dot(side, side) > 0.01) under += normalize(side) * SHADOW_OUT;

  float rows = size.y + 2.0 * margin,
    cols = size.x + 2.0 * margin;

  for (int i = 0; i < SHADOW_STEPS; i++) {
    float t = float(i) + 1.0 + b;
    vec2 q = under + sunStep.xy * t;

    if (q.x < 0.0 || q.y < 0.0 || q.x >= cols || q.y >= rows) return 0.0;

    float over = texelFetch(ground, ivec2(int(q.x), int(rows - 1.0 - floor(q.y))), 0).r * 255.0;

    if (over > h + sunStep.z * t + SHADOW_BIAS) return 1.0;
  }

  return 0.0;
}

//a number 0..1 for a point, always the same for it
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

//smooth noise 0..1 over p, a whole number apart a cell
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

//a streak of rain over the pixel at p (from the world's origin, down the
//screen), in a layer of drops cell across and down, len long, falling
//speed pixels a second: whether there is one
float drop(vec2 p, vec2 cell, float len, float speed, float seed) {
  p.y -= time * speed;
  p.x -= time * speed * slant;
  //slanting with the wind, a pixel across every so many down
  p.x -= floor(p.y * slant);
  vec2 k = floor(p / cell), f = p - k * cell;
  if (hash(k + seed) > rain * 0.75) return 0.0;
  float x = floor(hash(k + seed + 7.0) * cell.x),
    y = floor(hash(k + seed + 13.0) * (cell.y - len));
  return floor(f.x) == x && f.y >= y && f.y < y + len ? 1.0 : 0.0;
}

//how far p is from the bolt of lightning, in pixels
float fromBolt(vec2 p) {
  float best = 1e6;
  for (int i = 0; i + 1 < BOLT; i++) {
    vec2 a = bolt[i], ab = bolt[i + 1] - a;
    float t = clamp(dot(p - a, ab) / max(dot(ab, ab), 0.001), 0.0, 1.0);
    best = min(best, length(p - a - ab * t));
  }
  return best;
}

void main() {
  ivec2 px = ivec2(gl_FragCoord.xy);
  vec3 a = texelFetch(albedo, px, 0).rgb;
  vec3 n = normalOf(texelFetch(normals, px, 0));
  float sun = max(dot(n, sunDir), 0.0);
  vec2 from = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) - origin;
  ivec2 g4 = ivec2(floor(from)) & 3;
  float b = (BAYER[g4.y * 4 + g4.x] + 0.5) / 16.0;
  vec2 uv = gl_FragCoord.xy / size;
  float h = texelFetch(heights, px, 0).r * 255.0;
  //the ground under the pixel, from the world's origin, down the screen
  vec2 spot = from + vec2(0.0, h);
  //flat on the ground, and of stone, tarmac or concrete - grey - for the
  //rain to stand on in puddles
  bool level = n.z > 0.9 && h < 1.5;
  float sat = max(a.r, max(a.g, a.b)) - min(a.r, min(a.g, a.b));
  bool paved = level && sat < 0.1 && dot(a, vec3(0.3333)) < 0.7;
  float puddle = 0.0;

  //wet, everything is darker - the ground most, a road most of all - and
  //on a road, where the rain lies in puddles, darker again
  if (wet > 0.0) {
    if (paved)
      puddle = step(0.78 - 0.22 * wet + (b - 0.5) * 0.04,
        noise(spot / vec2(26.0, 13.0)) * 0.7 + noise(spot / vec2(9.0, 4.5)) * 0.3);
    a *= 1.0 - wet * (paved ? 0.3 + 0.2 * puddle : level ? 0.18 : 0.1);
  }

  if (shadows && sun > 0.0) sun *= 1.0 - shadowed(px, n, b);

  //the shadows of the clouds going over, so much of the sky as is cloud:
  //big ones, ragged at the edges, growing and closing up as more of it is,
  //till all of it is - and darker the more there is
  if (cloud > 0.0 && sun > 0.0) {
    float c = noise((spot + cloudAt) / vec2(560.0, 280.0)) * 0.7 +
      noise((spot + cloudAt) / vec2(150.0, 75.0)) * 0.22 +
      noise((spot + cloudAt) / vec2(40.0, 20.0)) * 0.08;
    sun *= 1.0 - (0.7 + 0.2 * cloud) *
      step(0.86 - cloud * 0.95 + (b - 0.5) * 0.06, c);
  }

  vec3 lit = clamp(ambient + sun * sunLight, 0.0, 1.0);
  //what glows is as bright as its own colours, whatever the light
  float glow = texelFetch(heights, px, 0).b;
  vec3 c = a * mix(lit, vec3(1.0), glow);

  //the lamps' light, at any hour - lost in the sun by day, much of it, as
  //a lamp is in daylight: only as much as the light there is not already
  vec3 l = texelFetch(light, px, 0).rgb * 2.0;
  float most = max(l.r, max(l.g, l.b));

  if (most > 0.0) {
    //in steps of a third, dithered between them by where the pixel is
    //from the world's origin, so the pattern stays put as the city
    //scrolls. Not by the ground under it: every pixel up a wall stands
    //over the same spot of ground, and the wall would be dithered a whole
    //column at a time, in stripes
    float s = min(floor(most * 3.0 + b), MOST_STEPS) / 3.0;

    l *= s / most;
    c += a * l * (1.0 - DAY_DIM * clamp(dot(lit, vec3(0.3333)), 0.0, 1.0));
  }

  //and what shines of a building, at night
  vec3 shone = night ? texelFetch(shine, px, 0).rgb : vec3(0.0);
  c += shone;

  //the lamps' light round about, blurred: near, for the glow of it in the
  //air, and wide, for how much of the city round is lit
  vec3 near = vec3(0.0), wide = vec3(0.0);

  if (haze > 0.0 || glowSky > 0.0 || wet > 0.0) {
    near = (textureLod(light, uv, 3.0).rgb + textureLod(light, uv, 4.5).rgb) * 1.6;
    wide = (textureLod(light, uv, 6.0).rgb + textureLod(light, uv, 8.0).rgb) * 1.6;
  }

  //at night, the city's lights light the sky over it, and the sky what is
  //under it: lighter in the city than out in the woods, more so under cloud
  c += a * wide * glowSky;

  //a wet road shines with the lamps over it, a puddle most - their light
  //drawn out up it, as a wet street's is
  if (paved && wet > 0.0) {
    vec3 r = textureLod(light, uv + vec2(0.0, 4.0 / size.y), 1.0).rgb +
      textureLod(light, uv + vec2(0.0, 10.0 / size.y), 2.0).rgb +
      textureLod(light, uv + vec2(0.0, 18.0 / size.y), 3.0).rgb;
    c += r * wet * (0.35 + 0.9 * puddle);
    //and a puddle has the grey of the sky in it - by night, all but black
    c = mix(c, fogColor * 1.1 + r * 0.3, puddle * wet * 0.5);
  }

  //an overcast day is a grey one
  c = mix(c, vec3(dot(c, vec3(0.3, 0.55, 0.15))), grey);

  //the fog: a layer of it lying over the ground, in banks drifting with
  //the wind - thicker here, thinner there, higher and lower. Looking down
  //into it, the eye sees through as much of it as lies over what it looks
  //at: the ground deep in it, a wall less of it the higher up, the tops of
  //tall buildings standing up out of it. What lights it shows through, a
  //glow in it - the lamps' light scattered in the air round them, and the
  //windows; by day it is lit by the sun, warm of a morning. Thinner round
  //where the eye is, for what is looked at not to be lost in it, coming in
  //from FOG_CLEAR of the way out to the edges of the screen
  if (fog > 0.0) {
    vec2 at = spot + cloudAt * 0.3;
    float bank = noise(at / vec2(200.0, 100.0)) * 0.65 + noise(at / vec2(64.0, 32.0)) * 0.35;
    float top = fog * (FOG_LOW + FOG_HIGH * bank);
    float deep = max(top - h, 0.0);
    vec2 off = (gl_FragCoord.xy - size * 0.5) / (0.5 * size);
    float f = (1.0 - exp(-deep * FOG_DENSE * (0.5 + bank))) *
      mix(FOG_NEAR, 1.0, smoothstep(FOG_CLEAR, FOG_THICK, length(off)));
    //a thin veil over all of it, high up too
    f = max(f, fog * 0.12);
    f = min(floor(f * 12.0 + b) / 12.0, 0.88);

    if (f > 0.0) {
      vec3 air = fogColor + sunLight * 0.22;
      c = mix(c, air, f) + (near * haze * 1.3 + shone * 0.6) * f;
    }
  }

  //and in the air round a lamp, a glow, whatever the fog - in the rain
  c += near * haze * 0.25;

  //the rain: streaks of it falling, slanting in the wind - a near layer
  //and a further one - grey by day, lit by the lamps at night; and where
  //it hits the road, a drop splashing up
  if (rain > 0.0) {
    float s = drop(from, vec2(9.0, 26.0), 4.0, 210.0, 0.0) +
      0.6 * drop(from + vec2(4.0, 11.0), vec2(6.0, 17.0), 3.0, 150.0, 31.0);
    //by night, seen only where a lamp lights it
    vec3 rc = fogColor * 1.15 + near * 1.8 + 0.05;
    c = mix(c, rc, clamp(s, 0.0, 1.0) * 0.45);

    if (paved && hash(floor(from) + floor(time * 9.0) * 17.0) > 1.0 - 0.006 * rain)
      c = mix(c, rc, 0.6);
  }

  //lightning: everything lit up for a moment, and the bolt
  if (flash > 0.0) {
    c += flash * (a * vec3(0.45, 0.5, 0.65) + vec3(0.06, 0.07, 0.1));
    if (bolted) {
      float d = fromBolt(vec2(gl_FragCoord.x, size.y - gl_FragCoord.y));
      c = mix(c, vec3(0.92, 0.94, 1.0), d < 1.0 ? 1.0 : d < 3.0 ? 0.35 * flash : 0.0);
    }
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
    //for what is drawn over the city as lines and shapes (client/glcanvas)
    stencil: true,
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

  //what is drawn over the city as lines, shapes and words
  this.overlay = new GLCanvas(this);
}

GLView.prototype.setup = function () {
  var gl = this.gl;

  this.spriteProgram = program(gl, SPRITE_VS, SPRITE_FS);
  this.plainProgram = program(gl, SPRITE_VS, PLAIN_FS);
  this.lampProgram = program(gl, LAMP_VS, LAMP_FS);
  this.stampProgram = program(gl, STAMP_VS, STAMP_FS);
  this.xrayProgram = program(gl, SPRITE_VS, XRAY_FS);
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
  this.xrayBuffer = gl.createBuffer();
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
  //blurred by its smaller copies (light)
  gl.bindTexture(gl.TEXTURE_2D, this.lightTex);
  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR_MIPMAP_LINEAR,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  //the most that stands over every bit of the ground on the screen, and
  //round it (stamp)
  this.groundTex = texture2d(gl);
  this.groundFrame = gl.createFramebuffer();
  this.margin = 0;
  this.first = gl.createFramebuffer();
  this.second = gl.createFramebuffer();
  this.lightFrame = gl.createFramebuffer();
  //a stencil for the lines and shapes drawn into the lit city
  this.stencil = gl.createRenderbuffer();
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

  //the squares of what is kept in sight, drawn again where it is hidden
  this.xrayVao = gl.createVertexArray();
  gl.bindVertexArray(this.xrayVao);
  attribute(gl, this.xrayProgram, "corner", this.corners, 2, 0, 0, 0);
  attribute(gl, this.xrayProgram, "rect", this.xrayBuffer, 4, FLOATS * 4, 0, 1);
  attribute(
    gl,
    this.xrayProgram,
    "misc",
    this.xrayBuffer,
    4,
    FLOATS * 4,
    16,
    1,
  );
  attribute(
    gl,
    this.xrayProgram,
    "src0",
    this.xrayBuffer,
    4,
    FLOATS * 4,
    32,
    1,
  );
  attribute(
    gl,
    this.xrayProgram,
    "src2",
    this.xrayBuffer,
    4,
    FLOATS * 4,
    64,
    1,
  );

  //the squares of the pictures again, for what they stand over (stamp)
  this.stampVao = gl.createVertexArray();
  gl.bindVertexArray(this.stampVao);
  attribute(gl, this.stampProgram, "corner", this.corners, 2, 0, 0, 0);
  attribute(
    gl,
    this.stampProgram,
    "misc",
    this.spriteBuffer,
    4,
    FLOATS * 4,
    16,
    1,
  );
  attribute(
    gl,
    this.stampProgram,
    "rect",
    this.spriteBuffer,
    4,
    FLOATS * 4,
    0,
    1,
  );
  attribute(
    gl,
    this.stampProgram,
    "src2",
    this.spriteBuffer,
    4,
    FLOATS * 4,
    64,
    1,
  );

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
  attribute(gl, this.litProgram, "corner", self.corners, 2, 0, 0, 0);
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
 * Starts a frame w by h - at night with what shines drawn too; by day, with
 * the shadows the sun casts (shadows), from whatever is drawn as far as
 * margin off the screen.
 */
GLView.prototype.begin = function (w, h, night, shadows, margin) {
  var gl = this.gl;

  if (this.width !== w || this.height !== h || this.margin !== margin)
    this.resize(w, h, margin);

  this.night = night;
  this.shadows = shadows;
  if (shadows) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.groundFrame);
    gl.viewport(0, 0, w + 2 * margin, h + 2 * margin);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  this.overlay.begin();
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clearDepth(1);
  gl.depthMask(true);
  for (var f of [this.first, this.second]) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.clear(
      f === this.first
        ? gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT
        : gl.COLOR_BUFFER_BIT,
    );
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

/**
 * The picture of how high every pixel of the frame just drawn stands, as it
 * is drawn (SPRITE_FS): red how high, a pixel a unit, alpha whether there is
 * anything there - its rows from the bottom up, w by h (client/turner).
 *
 * @returns {{data: Uint8Array, w: number, h: number}}
 */
//whether only the city is drawn - nothing over it, neither the layers
//over the lit ones nor the lines, shapes and words on any (client/lighting
//calm)
GLView.prototype.bare = false;

GLView.prototype.readHeights = function () {
  var gl = this.gl,
    w = this.width,
    h = this.height,
    data = new Uint8Array(w * h * 4);

  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.first);
  gl.readBuffer(gl.COLOR_ATTACHMENT0 + HEIGHT);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.readBuffer(gl.COLOR_ATTACHMENT0);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);

  return { data: data, w: w, h: h };
};

GLView.prototype.resize = function (w, h, margin) {
  var gl = this.gl,
    t = this.targets;

  this.canvas.width = this.width = w;
  this.canvas.height = this.height = h;
  this.margin = margin;

  gl.bindTexture(gl.TEXTURE_2D, this.groundTex);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA8,
    w + 2 * margin,
    h + 2 * margin,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  attach(gl, this.groundFrame, [this.groundTex]);

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
  gl.bindRenderbuffer(gl.RENDERBUFFER, this.stencil);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH24_STENCIL8, w, h);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.first);
  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_STENCIL_ATTACHMENT,
    gl.RENDERBUFFER,
    this.stencil,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  attach(gl, this.second, [t[SHINE]]);
  attach(gl, this.lightFrame, [this.lightTex]);
};

//where the world's origin is on the screen, this frame (client/lighting
//begin) - for the dither of what is drawn see-through to stay put
GLView.prototype.origin = [0, 0];

/**
 * A square of a picture to draw, at x, y on the screen, w by h, as see-
 * through as alpha: the floats for the rest of it (see FLOATS), from
 * offset on, to be filled in - by client/cachedsprite glQuad.
 *
 * @param [elev] {number} how high the ground under it is on the screen
 * @param [dither] {boolean} see-through a pixel at a time, dithered, rather
 *        than blended - the way pixel art is (smoke)
 * @param [over] {number} how high over the ground the whole of it is on the
 *        screen, for a picture with no heights of its own (smoke): lit, and
 *        in the shade, where it is up in the air - not as the ground behind
 *        it
 * @returns {Float32Array} where to fill them in
 */
GLView.prototype.add = function (x, y, w, h, alpha, elev, dither, over) {
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
  d[o + 5] = elev || 0;
  d[o + 6] = dither ? 1 : 0;
  d[o + 7] = over || 0;
  this.offset = o + 8;

  return d;
};

//keeps the square just added, its floats filled in
GLView.prototype.keep = function () {
  this.count++;
};

/**
 * Draws the squares added since, and over them what was drawn as lines,
 * shapes and words (client/glcanvas) - into the pictures of the screen of
 * the lit city (lit), or over it as they are; and by day, what the lit ones
 * not on flat ground stand over into the map of the ground (stamp).
 */
GLView.prototype.flush = function (lit, flat, sight) {
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
    } else if (!this.bare)
      this.batch(null, this.plainProgram, this.vaos[0][1], true, n, 1);

    //and by day, what they stand over - nothing on flat ground
    if (lit && !flat && this.shadows) this.stamp(n);
  }

  //what is kept in sight, where anything stands in front of it
  if (lit && sight && sight.count > 0) this.xray(sight);

  if (this.overlay.any() && !this.bare)
    this.overlay.draw(lit ? this.first : null, lit);
  //every layer starts drawing as a canvas of its own would
  this.overlay.reset();
};

/**
 * What is kept in sight - its squares, sight.floats, sight.count of them -
 * drawn again over the lit city where something nearer the eye hides it:
 * every other pixel of it in sight.tint, glowing.
 */
GLView.prototype.xray = function (sight) {
  var gl = this.gl,
    p = this.xrayProgram,
    t = sight.tint;

  gl.bindBuffer(gl.ARRAY_BUFFER, this.xrayBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    sight.floats.subarray(0, sight.count * FLOATS),
    gl.STREAM_DRAW,
  );
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.first);
  drawBuffers(gl, 3);
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.pages);
  gl.uniform1i(gl.getUniformLocation(p, "pages"), 0);
  gl.uniform2f(gl.getUniformLocation(p, "size"), this.width, this.height);
  gl.uniform3f(gl.getUniformLocation(p, "tint"), t[0], t[1], t[2]);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.GREATER);
  gl.depthMask(false);
  gl.bindVertexArray(this.xrayVao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, sight.count);
  gl.bindVertexArray(null);
  gl.disable(gl.DEPTH_TEST);
};

/**
 * What the n squares just drawn stand over, as high as they stand over it,
 * into the map of the ground: the most of everything over every bit of it.
 */
GLView.prototype.stamp = function (n) {
  var gl = this.gl,
    p = this.stampProgram,
    m = this.margin;

  gl.bindFramebuffer(gl.FRAMEBUFFER, this.groundFrame);
  gl.viewport(0, 0, this.width + 2 * m, this.height + 2 * m);
  gl.useProgram(p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.pages);
  gl.uniform1i(gl.getUniformLocation(p, "pages"), 0);
  gl.uniform2f(
    gl.getUniformLocation(p, "size"),
    this.width + 2 * m,
    this.height + 2 * m,
  );
  gl.uniform1f(gl.getUniformLocation(p, "margin"), m);
  gl.blendEquation(gl.MAX);
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.bindVertexArray(this.stampVao);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  gl.bindVertexArray(null);
  gl.blendEquation(gl.FUNC_ADD);
  gl.blendFuncSeparate(
    gl.SRC_ALPHA,
    gl.ONE_MINUS_SRC_ALPHA,
    gl.ONE,
    gl.ONE_MINUS_SRC_ALPHA,
  );
  gl.viewport(0, 0, this.width, this.height);
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
  loc = gl.getUniformLocation(p, "origin");
  if (loc !== null) gl.uniform2f(loc, this.origin[0], this.origin[1]);
  gl.bindVertexArray(vao);

  //into the lit city, how near every pixel drawn is too: the nearest of
  //what is seen, the pictures drawn over each other in their order
  if (frame === this.first) {
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.ALWAYS);
    gl.depthMask(true);
  }

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  gl.disable(gl.DEPTH_TEST);
};

/**
 * Lights the city drawn so far into the frame: by the sun, and at night by
 * every lamp.
 *
 * @param lamps {Array} at night, every lamp on the screen (LAMP_FLOATS):
 *        {x, y, z, reach, color, peak, aim, cone, tall, [wrap], [foot],
 *        [down], [spill]} - wrap, how far round what it lights it reaches
 *        (WRAP); foot, false for its peak to be how bright it is close by
 *        rather than on the ground under it; down, for a lamp shining down
 *        in a cone, the cosine of half of it; and spill, how much of its
 *        light still goes out to the sides of that cone, below the lamp
 * @param sky {{ambient, sun, dir, step}} the light of the sky and the sun,
 *        0..1, which way the sun is, and by day the way to it a step at a
 *        time, along the ground on the screen and up (see LIT_FS shadowed)
 * @param origin {number[]} where the world's origin is on the screen
 */
GLView.prototype.light = function (lamps, sky, origin) {
  var gl = this.gl,
    t = this.targets,
    w = this.width,
    h = this.height;

  gl.disable(gl.BLEND);

  //the lamps' light, at any hour: by day there are fewer of them on - a
  //police car's, the cars' indicators and brake lights, the beacons
  {
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

    //smaller and smaller copies of it, for it blurred: the glow of the
    //lamps in the fog, how lit the city is round about
    gl.bindTexture(gl.TEXTURE_2D, this.lightTex);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  var p = this.litProgram;

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.useProgram(p);
  bind(gl, p, "albedo", t[ALBEDO], 0);
  bind(gl, p, "normals", t[NORMAL], 1);
  bind(gl, p, "shine", t[SHINE], 3);
  bind(gl, p, "light", this.lightTex, 4);
  bind(gl, p, "heights", t[HEIGHT], 5);
  bind(gl, p, "ground", this.groundTex, 6);
  gl.uniform1i(gl.getUniformLocation(p, "shadows"), this.shadows ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(p, "margin"), this.margin);
  gl.uniform3fv(gl.getUniformLocation(p, "sunStep"), sky.step || [0, 0, 1]);
  gl.uniform2f(gl.getUniformLocation(p, "size"), w, h);
  gl.uniform2f(gl.getUniformLocation(p, "origin"), origin[0], origin[1]);
  gl.uniform3fv(gl.getUniformLocation(p, "ambient"), sky.ambient);
  gl.uniform3fv(gl.getUniformLocation(p, "sunLight"), sky.sun);
  gl.uniform3fv(gl.getUniformLocation(p, "sunDir"), sky.dir);
  gl.uniform1i(gl.getUniformLocation(p, "night"), this.night ? 1 : 0);
  weather(gl, p, sky.weather || NO_WEATHER, h);
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

//no weather at all: a clear day, dry
var NO_WEATHER = {
  cloud: 0,
  cloudAt: [0, 0],
  grey: 0,
  fog: 0,
  fogColor: [0.7, 0.72, 0.75],
  haze: 0,
  glowSky: 0,
  wet: 0,
  rain: 0,
  slant: 0,
  flash: 0,
  bolt: null,
  time: 0,
};

var boltData = new Float32Array(BOLT * 2);

//the weather into the lighting's uniforms (LIT_FS)
function weather(gl, p, w) {
  function f(name, v) {
    gl.uniform1f(gl.getUniformLocation(p, name), v);
  }

  f("cloud", w.cloud);
  gl.uniform2fv(gl.getUniformLocation(p, "cloudAt"), w.cloudAt);
  f("grey", w.grey);
  f("fog", w.fog);
  gl.uniform3fv(gl.getUniformLocation(p, "fogColor"), w.fogColor);
  f("haze", w.haze);
  f("glowSky", w.glowSky);
  f("wet", w.wet);
  f("rain", w.rain);
  f("slant", w.slant);
  f("flash", w.flash);
  f("time", w.time);
  gl.uniform1i(gl.getUniformLocation(p, "bolted"), w.bolt ? 1 : 0);

  if (w.bolt) {
    for (var i = 0; i < BOLT; i++) {
      var q = w.bolt[Math.min(i, w.bolt.length - 1)];

      boltData[i * 2] = q[0];
      boltData[i * 2 + 1] = q[1];
    }
    gl.uniform2fv(gl.getUniformLocation(p, "bolt"), boltData);
  }
}

GLView.BOLT = BOLT;

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
    d[o + 14] = l.down === undefined ? 0 : l.down;
    d[o + 15] = l.spill === undefined ? 0 : l.spill;
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
GLView.GLOW = GLOW;

export default GLView;
