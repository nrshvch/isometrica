/**
 * A mark floating over the world - drawn over everything, unlit, so it reads
 * by night as well as by day (client/lighting lights only the layers up to
 * the buildings):
 *
 * - a pin, bobbing over a place the courier is going to, with what the place
 *   is in it - a burger, a house; off the screen, it waits at the edge of it
 *   with a point to the way the place is;
 * - over the car, a small arrow down to it.
 *
 * Either can carry a small bar of how far along something is - the food
 * being cooked, the order being loaded or handed over.
 */
import engine from "engine";
import * as glMatrix from "gl-matrix";
import RenderLayer from "../renderlayer";

var at = new Float32Array(3);

//the pin: how big round, and how far its point hangs under it, px
var PIN_RADIUS = 11,
  PIN_POINT = 12,
  //how far up and down it bobs, px, and how long one bob takes, ms
  BOB = 3,
  BOB_EVERY = 1400,
  //the bar
  BAR_WIDTH = 32,
  BAR_HEIGHT = 5,
  //how near the edge of the screen a pin off it is kept, px
  EDGE = 22,
  OUTLINE = "rgba(0,0,0,0.85)";

function MarkerRenderer() {
  engine.Renderer.call(this);
}

MarkerRenderer.prototype = Object.create(engine.Renderer.prototype);
MarkerRenderer.prototype.constructor = MarkerRenderer;

MarkerRenderer.prototype.layer = RenderLayer.overlayLayer;
//"pin" or "car"
MarkerRenderer.prototype.kind = "pin";
MarkerRenderer.prototype.color = "white";
//what is in the pin
MarkerRenderer.prototype.icon = "";
//how far along the bar over it is, 0..1, or null for no bar
MarkerRenderer.prototype.progress = null;
MarkerRenderer.prototype.hidden = false;
//px at the bottom of the screen a pin off it keeps clear of - the panel
//over it (ui/modules/delivery)
MarkerRenderer.prototype.bottom = 0;
//where it was last drawn: on what canvas, and where on it - for something
//on the page to be put over it (client/delivery Deliveryman#carOnPage)
MarkerRenderer.prototype.canvas = null;
MarkerRenderer.prototype.screenX = null;
MarkerRenderer.prototype.screenY = null;

//a pin off the screen is still drawn, at the edge of it
MarkerRenderer.prototype.cullingTest = function (viewport, renderer) {
  return (
    !this.hidden &&
    (this.kind === "pin" ||
      engine.Renderer.prototype.cullingTest.call(this, viewport, renderer))
  );
};

function bar(ctx, x, y, done, color) {
  var left = Math.round(x - BAR_WIDTH / 2),
    top = Math.round(y);

  ctx.fillStyle = OUTLINE;
  ctx.fillRect(left - 1, top - 1, BAR_WIDTH + 2, BAR_HEIGHT + 2);
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(left, top, BAR_WIDTH, BAR_HEIGHT);
  ctx.fillStyle = color;
  ctx.fillRect(left, top, Math.round(BAR_WIDTH * done), BAR_HEIGHT);
}

function circle(ctx, x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, PIN_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

function icon(ctx, x, y, text) {
  ctx.font = "13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "black";
  ctx.fillText(text, x, y + 1);
}

/**
 * A triangle from the edge of the circle at (x, y), pointing at angle a.
 */
function point(ctx, x, y, a, color) {
  var r = PIN_RADIUS,
    tip = r + PIN_POINT - 4,
    spread = 0.5;

  ctx.beginPath();
  ctx.moveTo(
    x + Math.cos(a - spread) * (r - 1),
    y + Math.sin(a - spread) * (r - 1),
  );
  ctx.lineTo(x + Math.cos(a) * tip, y + Math.sin(a) * tip);
  ctx.lineTo(
    x + Math.cos(a + spread) * (r - 1),
    y + Math.sin(a + spread) * (r - 1),
  );
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

MarkerRenderer.prototype.render = function (ctx, renderer) {
  glMatrix.vec3.transformMat4(
    at,
    this.gameObject.transform.getPosition(at),
    renderer.M,
  );

  var x = Math.round(at[0]),
    y = Math.round(at[1]);

  this.canvas = ctx.canvas;
  this.screenX = x;
  this.screenY = y;

  ctx.save();

  if (this.kind === "car") {
    //an arrow down to the car
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 8);
    ctx.lineTo(x + 6, y - 8);
    ctx.lineTo(x, y);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();

    if (this.progress !== null)
      bar(ctx, x, y - 10 - BAR_HEIGHT - 4, this.progress, this.color);

    ctx.restore();
    return;
  }

  var w = ctx.canvas.width,
    h = ctx.canvas.height - this.bottom,
    bob = Math.sin((Date.now() / BOB_EVERY) * Math.PI * 2) * BOB,
    //the middle of the pin, its point down on the place
    cx = x,
    cy = y - PIN_RADIUS - PIN_POINT + bob,
    off = cx < EDGE || cx > w - EDGE || cy < EDGE + 10 || cy > h - EDGE,
    a = Math.PI / 2;

  if (off) {
    //kept at the edge, pointing the way the place is
    cx = Math.min(w - EDGE, Math.max(EDGE, cx));
    cy = Math.min(h - EDGE, Math.max(EDGE + 10, cy));
    a = Math.atan2(y - cy, x - cx);
  }

  point(ctx, cx, cy, a, this.color);
  circle(ctx, cx, cy, this.color);
  icon(ctx, cx, cy, this.icon);

  if (this.progress !== null)
    bar(ctx, cx, cy - PIN_RADIUS - BAR_HEIGHT - 5, this.progress, this.color);

  ctx.restore();
};

/**
 * @param kind {string} "pin" or "car"
 * @param color {string}
 * @param [iconText] {string}
 */
function Marker(kind, color, iconText) {
  engine.GameObject.init(this, "deliveryMarker");

  var renderer = this.addComponent(new MarkerRenderer());

  renderer.kind = kind;
  renderer.color = color;
  renderer.icon = iconText || "";
  this.marker = renderer;
}

Marker.prototype = Object.create(engine.GameObject.prototype);

export default Marker;
