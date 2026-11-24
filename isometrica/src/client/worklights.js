import engine from "engine";
import Lighting from "./lighting";

/**
 * The lights of what is at work: road works and building sites, and their
 * machines. See isometrica/.claude/skills/buildings/going-up.md.
 *
 * A light is {x, y, z, color, [blink], [night], [reach], [peak], [aim],
 * [cone], [size]}: x, y on screen from where its carrier is drawn, z how high
 * over that; color 0..255 each; blink on-then-off ms; night only after dark;
 * reach, peak how far and how bright its light (none: lights nothing); aim
 * along the ground (client/lighting AIM), cone cos of half its width; size
 * in pixels, 1 unless said.
 */
var WorkLights = {};

//amber, the colour of a warning lamp and a beacon - and how long it is on
//and then off
WorkLights.AMBER = [255, 170, 30];
WorkLights.BLINK = 520;

//the white of a work lamp and a floodlight
WorkLights.WHITE = [255, 246, 222];

function css(c) {
  return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
}

/**
 * Draws lights - each from x, y on the screen, where what carries them is
 * drawn - over renderer's picture, and at night has them light what is round
 * them.
 *
 * @param phase {number} ms - so that no two blink as one
 */
WorkLights.draw = function (layer, renderer, x, y, lights, phase) {
  var gl = engine.Config.gl;

  if (!gl || !lights || lights.length === 0) return;

  var now = Date.now() + phase,
    night = gl.night === true,
    ground = gl.elevation(renderer.gameObject),
    shown = false;

  for (var i = 0; i < lights.length; i++) {
    var l = lights[i];

    if (l.night && !night) continue;
    if (l.blink && Math.floor((now + (l.phase || 0)) / l.blink) % 2 === 1)
      continue;

    if (!shown) {
      layer.save();
      layer.glow = true;
      shown = true;
    }

    var size = l.size || 1;

    //hidden behind whatever stands in front of what carries it, as high as
    //it is - a little nearer, not to be lost in its own corner
    layer.standsAt = ground + l.z + 2;
    layer.fillStyle = l.css || (l.css = css(l.color));
    layer.fillRect(
      Math.floor(x + l.x - (size - 1) / 2),
      Math.floor(y + l.y - l.z),
      size,
      1,
    );

    //and lights what is round it - by day too, a beacon, lost in the sun
    //mostly (client/glview)
    if (l.reach)
      gl.workLight(
        x + l.x,
        y + l.y,
        l.z,
        l.reach,
        l.rgb ||
          (l.rgb = [l.color[0] / 255, l.color[1] / 255, l.color[2] / 255]),
        l.peak,
        l.aim,
        l.cone,
      );
  }

  if (shown) layer.restore();
};

/**
 * Where a point x, y along a tile, z up - as the generators paint it, the
 * camera turned the way it is - is on the screen from the point at sx, sy on
 * the same tile: x - y across, -(x + y) / 2 - z up.
 */
WorkLights.offset = function (x, y, z, sx, sy) {
  var dx = x - sx,
    dy = y - sy;

  return { x: dx - dy, y: -(dx + dy) / 2, z: z };
};

/**
 * Which way a heading as it is seen ("x+", "y-" - client/view heading) goes
 * along the ground, a unit long.
 */
WorkLights.aim = function (heading) {
  return Lighting.AIM[heading] || [1, 0];
};

/**
 * The lights of a machine going `heading` as it is seen - an amber beacon
 * on the roof of its cab, `high` over the ground and `cab` ahead of its
 * middle - and after dark two work lamps at the front, `ahead` of it,
 * shining the way it goes.
 */
WorkLights.machine = function (heading, high, ahead, cab) {
  var aim = WorkLights.aim(heading),
    out = [
      {
        x: (aim[0] - aim[1]) * cab,
        y: (-(aim[0] + aim[1]) / 2) * cab,
        z: high,
        color: WorkLights.AMBER,
        blink: WorkLights.BLINK * 0.6,
        reach: 14,
        peak: 0.5,
        size: 2,
      },
    ];

  for (var side = -1; side <= 1; side += 2) {
    var gx = aim[0] * ahead - aim[1] * side * 2,
      gy = aim[1] * ahead + aim[0] * side * 2;

    out.push({
      x: gx - gy,
      y: -(gx + gy) / 2,
      z: Math.round(high * 0.55),
      color: WorkLights.WHITE,
      night: true,
      reach: 28,
      peak: 0.42,
      aim: aim,
      cone: 0.7,
    });
  }

  return out;
};

/**
 * The machines at work - the vehicle generator's digger and lorry - and
 * where their lights are: how high the beacon on the roof of the cab is,
 * and how far ahead of the middle the cab is; and how far ahead the work
 * lamps at the front are.
 */
WorkLights.MACHINES = {
  excavator: { high: 11, cab: 2.5, ahead: 5 },
  lorry: { high: 10.5, cab: 6, ahead: 8 },
  //its cab behind its middle, the lamps on the front of its hood
  bulldozer: { high: 10.8, cab: -3.5, ahead: 4 },
};

/**
 * The lights of a machine of type going `heading` as it is seen
 * (WorkLights.machine) - null for anything else.
 */
WorkLights.machineOf = function (type, heading) {
  var spec = WorkLights.MACHINES[type];

  return spec
    ? WorkLights.machine(heading, spec.high, spec.ahead, spec.cab)
    : null;
};

/**
 * What a building site's lights are as client/worklights draws them, by the
 * kind the sites generator says (shared/gen/sites overlays): a floodlight
 * on its mast, lighting the site after dark; on a tower crane, the red
 * warning light on its peak, slow to blink, and the floodlight under its
 * cab, high over the site.
 */
WorkLights.siteLight = function (l) {
  if (l.kind === "peak")
    return { x: l.x, y: l.y, z: l.z, color: RED, blink: 1100 };

  if (l.kind === "crane")
    return {
      x: l.x,
      y: l.y,
      z: l.z,
      color: WorkLights.WHITE,
      night: true,
      reach: 30 + l.z,
      peak: 0.28,
    };

  return {
    x: l.x,
    y: l.y,
    z: l.z,
    color: WorkLights.WHITE,
    night: true,
    reach: 34,
    peak: 0.36,
    size: 3,
  };
};

//the red of a warning light up high
var RED = [255, 46, 30];

/**
 * A sprite renderer with lights of its own on what it draws (WorkLights) -
 * set as `lights`, from where its picture is drawn.
 */
function WorkLightRenderer() {
  engine.SpriteRenderer.call(this);

  this.lights = null;
  this.phase = Math.random() * 10000;
}

WorkLightRenderer.prototype = Object.create(engine.SpriteRenderer.prototype);

WorkLightRenderer.prototype.constructor = WorkLightRenderer;

WorkLightRenderer.prototype.render = function (
  layer,
  viewportRenderer,
  viewport,
  self,
) {
  engine.SpriteRenderer.prototype.render.call(
    self,
    layer,
    viewportRenderer,
    viewport,
    self,
  );

  if (self.lights !== null)
    WorkLights.draw(
      layer,
      self,
      self.buf[0],
      self.buf[1],
      self.lights,
      self.phase,
    );
};

WorkLights.Renderer = WorkLightRenderer;

/**
 * How far into its round something that comes round and round is - a lamp
 * blinking, a crane's jib, a digger - for a seed and a number of its own:
 * the same for the same thing every time it is drawn anew, as it is when
 * the camera turns, and different from its neighbours'. 0..span, ms.
 */
WorkLights.phaseOf = function (seed, k, span) {
  var h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul((k | 0) + 1, 0x85ebca6b);

  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);

  return (((h ^ (h >>> 15)) >>> 0) / 4294967296) * span;
};

export default WorkLights;
