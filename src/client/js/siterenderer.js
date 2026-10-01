import engine from "engine";

//Draws a tile of a building site, and over it what moves there: the machine
//at work on it, going a little back and forth, and the jib of a tower crane
//turning from one side to the other and back. The generator paints the
//tile and says what goes over it, and where (shared/gen/blocks overlays);
//this draws them all in one, the way a car is drawn with its lamp (carman
//VehicleRenderer) - so that they are sorted as one with the tile, and
//nothing can come between them.

//how long a machine takes to go there and back, ms, by type - a lorry
//inching along as it tips, a digger shifting as it digs
var PERIODS = { lorry: 7000, excavator: 4600 },
  PERIOD = 6000;

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
 * {sprite, pivotX, pivotY, move: [x, y], vehicle} for a machine, at rest
 * where its pivot says, or {frames: [{sprite, pivotX, pivotY}]} for the jib.
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
    faded = self.opacity !== 1,
    i;

  if (overlays.length === 0) return;

  if (faded) {
    layer.save();
    layer.globalAlpha = self.opacity;
  }

  for (i = 0; i < overlays.length; i++) {
    var o = overlays[i],
      look = o,
      dx = 0,
      dy = 0;

    if (o.frames !== undefined) look = jibFrame(o.frames, now);
    else {
      //there and back, lingering at either end
      var f = Math.sin(
        (2 * Math.PI * (now + i * 1300)) / (PERIODS[o.vehicle] || PERIOD),
      );

      f = Math.max(-1, Math.min(1, f * 1.4));
      dx = Math.round(o.move[0] * f);
      dy = Math.round(o.move[1] * f);
    }

    var sprite = look.sprite;

    if (sprite.width === 0 || !sprite.acquire()) continue;

    layer.drawImage(
      sprite.sourceImage,
      sprite.offsetX,
      sprite.offsetY,
      sprite.width,
      sprite.height,
      (buffer[0] - look.pivotX + dx) | 0,
      (buffer[1] - look.pivotY + dy) | 0,
      sprite.width,
      sprite.height,
    );
  }

  if (faded) layer.restore();
};

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
