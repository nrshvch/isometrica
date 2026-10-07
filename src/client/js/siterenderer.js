import engine from "engine";

//Draws a tile of a building site, and over it what moves there: the digger
//driving up and back, stopping to turn and dig in between, and the jib of a
//tower crane turning from one side to the other and back. The generator
//paints the tile and says what goes over it, and where (shared/gen/sites
//overlays); this draws them all in one, the way a car is drawn with its lamp
//(carman VehicleRenderer) - so that they are sorted as one with the tile, and
//nothing can come between them. A lorry stands where it is, being loaded.

//how a digger goes about it, in ms: waiting, driving on, stopping, turning
//to dig, digging, turning back, waiting, backing up to where it was
var DIG = [
  { until: 1500, at: 0 },
  { until: 4000, from: 0, to: 1 },
  { until: 5000, at: 1 },
  { until: 8500, at: 1, turned: true },
  { until: 9300, at: 1 },
  { until: 11800, from: 1, to: 0 },
  { until: 12600, at: 0 },
];

//how long the jib takes over each step of its turn, ms
var JIB_STEP = 650;

function SiteRenderer() {
  engine.SpriteRenderer.call(this);

  this.overlays = [];
  //how far into its round each one is to start with, so that the sites
  //about the town do not all move as one
  this.phase = Math.random() * 60000;
}

SiteRenderer.prototype = Object.create(engine.SpriteRenderer.prototype);

SiteRenderer.prototype.constructor = SiteRenderer;

/**
 * What goes over the tile, as client/compoundbuilding pieces resolves it:
 * {vehicle, looks: [{sprite, pivotX, pivotY}], move: [x, y]|null} for a
 * machine - as it faces, and as it turns to dig, for one that moves by move -
 * or a car parked, which does not; or {frames: [{sprite, pivotX, pivotY}]}
 * for the jib - or, one frame only, what of a house stands in front of the
 * cars on its drive, drawn over them in the order they come.
 *
 * @type {Object[]}
 */
SiteRenderer.prototype.overlays = null;

SiteRenderer.prototype.render = function (
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

  var overlays = self.overlays,
    buffer = self.buf,
    now = performance.now() + self.phase,
    i;

  if (overlays.length === 0) return;

  for (i = 0; i < overlays.length; i++) {
    var o = overlays[i],
      look,
      dx = 0,
      dy = 0;

    if (o.frames !== undefined) look = jibFrame(o.frames, now);
    else if (o.move === null) look = o.looks[0];
    else {
      var pose = dig(now + i * 2100);

      look = o.looks[pose.turned && o.looks.length > 1 ? 1 : 0];
      o.looks[look === o.looks[0] ? o.looks.length - 1 : 0].sprite.keep();
      dx = Math.round(o.move[0] * pose.at);
      dy = Math.round(o.move[1] * pose.at);
    }

    var sprite = look.sprite;

    if (sprite.width === 0) continue;

    //as faded as the site, and lit as it is (client/lighting)
    engine.SpriteRenderer.picture(
      layer,
      self,
      sprite,
      Math.floor(buffer[0] - look.pivotX + dx + 0.5),
      Math.floor(buffer[1] - look.pivotY + dy + 0.5),
    );
  }
};

//drawn in every pass of the light, not only where things look up (engine
//Canvas2dRenderer drawLit)
SiteRenderer.prototype.litPasses = true;

/**
 * Where the digger is now along its way, 0 where it started and 1 where it
 * drives to, and whether it is turned to dig - easing in and out as it
 * drives.
 */
function dig(now) {
  var t = now % DIG[DIG.length - 1].until,
    start = 0,
    i;

  for (i = 0; i < DIG.length; i++) {
    var step = DIG[i];

    if (t < step.until) {
      if (step.at !== undefined)
        return { at: step.at, turned: step.turned === true };

      var k = (t - start) / (step.until - start);

      k = k * k * (3 - 2 * k);

      return { at: step.from + (step.to - step.from) * k, turned: false };
    }

    start = step.until;
  }

  return { at: 0, turned: false };
}

/**
 * Which way the jib points now: through its frames and back, a step at a
 * time - the ones not showing kept cached, or they would be put away and
 * back every time round.
 */
function jibFrame(frames, now) {
  var n = frames.length,
    round = n > 1 ? 2 * (n - 1) : 1,
    step = Math.floor(now / JIB_STEP) % round,
    index = step < n ? step : round - step;

  for (var i = 0; i < n; i++) if (i !== index) frames[i].sprite.keep();

  return frames[index];
}

export default SiteRenderer;
