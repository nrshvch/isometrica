import engine from "engine";
import Lighting from "./lighting";

/**
 * The lights of what is at work - a road being laid and a building going up,
 * and the machines at it: the amber lamps blinking on the road works
 * barriers, the amber beacon turning on the roof of a digger or a lorry, its
 * work lamps shining ahead of it after dark, and the floodlights on a
 * building site and up its crane.
 *
 * Each is a pixel or two of colour on whatever carries it, glowing whatever
 * the light (client/glview GLOW), hidden behind whatever stands in front of
 * it; and at night it lights what is round it (client/lighting workLight).
 *
 * A light is {x, y, z, color, [blink], [night], [reach], [peak], [aim],
 * [cone], [size]}: x, y on the screen from where what carries it is drawn
 * (the spot on the ground under it), z how high it is over that - a pixel a
 * unit; color, red, green and blue 0..255; blink, how long it is on, and
 * then off, ms - none for steady; night, only lit after dark (a work lamp,
 * a floodlight - a beacon and a barrier's lamp are on all day); reach and
 * peak, how far its light reaches and how bright it is close by - none for a
 * light too small to light anything; aim, the way it shines along the ground
 * as it is seen (client/lighting AIM), cone the cosine of half of how wide;
 * size, how many pixels across it shows, 1 unless said.
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

export default WorkLights;
