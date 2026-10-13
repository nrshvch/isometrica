import WorldCamera from "./components/camerascript";
import Events from "events";

//The camera stops at these alone: at any zoom in between, pixel art comes out
//with pixels of uneven sizes. Each is twice the one before, and 1 is what
//the game has always been drawn at.
var ZOOMS = [0.5, 0.667, 1, 1.5, 2];

function onDrag(sender, param, me) {
  var dragX = param.dx,
    dragY = param.dy;
  me._cam.pan(dragX, dragY);
}

function onPinchStart(sender, e, me) {
  var zoom = me._cam.zoom(),
    viewport = me._cam.gameObject.camera.viewport;

  //whatever was still easing back from the last pinch is done with
  settle(me);
  //and the fingers are found where the canvas stands, however it is shown
  if (viewport) viewport.restRect = viewport.canvas.getBoundingClientRect();

  me._pinch = {
    //how many quarter turns the fingers have turned the world so far
    turned: 0,
    zoom: zoom,
    //in page pixels, which stay the same size whatever the zoom
    x: e.gameViewportX * zoom,
    y: e.gameViewportY * zoom,
    //how much bigger than the camera's zoom it is shown just now
    scale: 1,
  };
}

/**
 * The fingers carry the map along as they go, the way a single one drags it,
 * and zoom and turn it with them, every bit of the way:
 *
 * - the camera takes whichever of ZOOMS is nearest to what the pinch would
 *   make of the zoom it started at - fingers twice as far apart, twice as
 *   close - and what is shown is scaled on the page by the rest of the way
 *   there, about the spot between the fingers, so it grows and shrinks
 *   smoothly as they move;
 * - the world turns a quarter turn for every quarter turn of theirs, the
 *   first once they are past an eighth of one - and what is shown is turned
 *   on the page by however far they are off that, so it turns with them all
 *   the way and clicks over to the next side of the world halfway there.
 *
 * Let go, it eases back to the zoom and the side of the world the camera is
 * at (onPinchEnd).
 */
function onPinch(sender, e, me) {
  var pinch = me._pinch,
    cam = me._cam;

  if (pinch === null) return;

  var from = cam.zoom(),
    x = e.gameViewportX * from,
    y = e.gameViewportY * from;

  //as far as the fingers moved on what is shown, scaled as it is
  cam.pan(
    (x - pinch.x) / (from * pinch.scale),
    (y - pinch.y) / (from * pinch.scale),
  );
  pinch.x = x;
  pinch.y = y;

  var want = Math.max(
    ZOOMS[0] * PINCH_PAST,
    Math.min(ZOOMS[ZOOMS.length - 1] / PINCH_PAST, pinch.zoom * e.scale),
  );

  //the zoom at or under where the fingers would have it, for what is shown
  //to be scaled up the rest of the way - always covering the screen
  cam.zoom(zoomUnder(want), e.gameViewportX, e.gameViewportY);

  //the fingers twisted: the world turns with them, a quarter turn for every
  //quarter turn of theirs, the first once they are past an eighth of one
  var off = 0;

  if (e.rotation !== undefined) {
    var turns = Math.round(e.rotation / TWIST);

    if (turns !== pinch.turned) {
      me.root.turnView(turns - pinch.turned);
      pinch.turned = turns;
    }

    off = e.rotation - turns * TWIST;
  }

  pinch.want = want;
  pinch.off = off;
  pinch.scale = (want / cam.zoom()) * cover(me, off);
  show(me, x, y, pinch.scale, off);
}

//the biggest of ZOOMS no bigger than zoom, give or take a hair - fingers
//that only turn come out a hair closer or further - or the smallest
function zoomUnder(zoom) {
  var under = ZOOMS[0];

  for (var i = 1; i < ZOOMS.length; i++)
    if (ZOOMS[i] <= zoom * 1.02) under = ZOOMS[i];

  return under;
}

/**
 * How much bigger what is shown turned by angle degrees has to be to cover
 * the screen, at most COVER_MOST - past that, the backdrop shows in its
 * corners.
 */
function cover(me, angle) {
  var viewport = me._cam.gameObject.camera.viewport;

  if (!viewport || angle === 0) return 1;

  var a = (Math.abs(angle) * Math.PI) / 180,
    w = viewport.canvas.clientWidth || 1,
    h = viewport.canvas.clientHeight || 1,
    long = Math.max(w / h, h / w);

  return Math.min(COVER_MOST, Math.cos(a) + Math.sin(a) * long);
}

//how much bigger what is shown can get to cover the screen as it turns
var COVER_MOST = 1.3;

//what shows round what is shown, where it does not cover the screen
var BACKDROP = "#1b1f24";

//how far the fingers turn for a quarter turn of the world, in degrees
var TWIST = 90;

//how far past the smallest and the biggest zoom a pinch can go before it
//goes no further, as a share of them
var PINCH_PAST = 0.8;

//how long what is shown takes to ease back once the fingers let go, ms
var SETTLE_MS = 180;

/**
 * Shows the world scaled by scale and turned by angle degrees on the page,
 * about x, y on the canvas in page pixels - the rest of the way a pinch
 * would take it, past the zoom and the side of the world the camera is at.
 */
function show(me, x, y, scale, angle) {
  var viewport = me._cam.gameObject.camera.viewport;

  if (!viewport) return;

  var style = viewport.canvas.style,
    parent = viewport.canvas.parentNode;

  if (parent && me._backdrop === null) {
    me._backdrop = parent.style.background;
    parent.style.background = BACKDROP;

    //what stands over the canvas - the buttons - kept over it as it is
    //scaled and turned, which would otherwise draw it over them
    me._raised = [].filter.call(parent.children, function (el) {
      return el !== viewport.canvas && el.style.zIndex === "";
    });
    me._raised.forEach(function (el) {
      el.style.zIndex = "1";
    });
  }

  style.transition = "";
  style.transformOrigin = x + "px " + y + "px";
  style.transform =
    Math.abs(scale - 1) < 0.001 && Math.abs(angle) < 0.01
      ? ""
      : "rotate(" + angle + "deg) scale(" + scale + ")";
}

/**
 * Lets go: what is shown eases back to the zoom and the side of the world
 * the camera is at - the nearest of them - and then is shown as it is.
 */
function onPinchEnd(sender, e, me) {
  var viewport = me._cam.gameObject.camera.viewport,
    pinch = me._pinch,
    cam = me._cam;

  me._pinch = null;

  if (!viewport) return;

  var style = viewport.canvas.style;

  if (!style.transform) {
    settle(me);
    return;
  }

  //the nearest of ZOOMS it was pinched to, shown from where it is
  if (pinch !== null && pinch.want !== undefined) {
    var to = nearestZoom(pinch.want),
      at = cam.zoom();

    if (to !== at) {
      cam.zoom(to, pinch.x / at, pinch.y / at);
      show(me, pinch.x, pinch.y, pinch.want / to, pinch.off);
      //as it is now, before it eases back
      void viewport.canvas.offsetWidth;
    }
  }

  style.transition = "transform " + SETTLE_MS + "ms ease-out";
  style.transform = "";
  me._settling = setTimeout(function () {
    settle(me);
  }, SETTLE_MS + 30);
}

//done easing back: shown as it is, the fingers found where it is
function settle(me) {
  var viewport = me._cam.gameObject.camera.viewport;

  clearTimeout(me._settling);
  me._settling = 0;

  if (!viewport) return;

  viewport.canvas.style.transition = "";
  viewport.canvas.style.transform = "";
  viewport.restRect = null;

  if (me._backdrop !== null && viewport.canvas.parentNode)
    viewport.canvas.parentNode.style.background = me._backdrop;
  me._backdrop = null;

  me._raised.forEach(function (el) {
    el.style.zIndex = "";
  });
  me._raised = [];
}

//the zoom the game is drawn at unless the player zooms - a double tap goes
//in from it and back out to it
var DEFAULT_ZOOM = 1;

/**
 * A double tap goes a step in from the default zoom, about the spot tapped,
 * and the next one comes back to it - the way iOS has it. Zoomed any other
 * way, by a pinch or otherwise, in or out and however far, it comes back to
 * the default first.
 */
function onDoubleTap(sender, e, me) {
  var cam = me._cam,
    to =
      cam.zoom() === DEFAULT_ZOOM
        ? ZOOMS[ZOOMS.indexOf(DEFAULT_ZOOM) + 1]
        : DEFAULT_ZOOM;

  cam.zoom(to, e.gameViewportX, e.gameViewportY);
}

//nearest by ratio: 1.5 is nearer to 2 than to 1, as 0.7 is to 0.5
function nearestZoom(zoom) {
  var nearest = ZOOMS[0];

  for (var i = 1; i < ZOOMS.length; i++) {
    if (
      Math.abs(Math.log(ZOOMS[i] / zoom)) < Math.abs(Math.log(nearest / zoom))
    )
      nearest = ZOOMS[i];
  }

  return nearest;
}

function onDispose(sender, args, data) {
  Events.off(data[0], data[1], data[2]);
}

var events = {
  dispose: 0,
};

function CameraControl(root) {
  this.root = root;
  this._pinch = null;
  //easing back from a pinch, the timer that says when it is done - and what
  //the backdrop round what is shown was before a pinch darkened it
  this._settling = 0;
  this._backdrop = null;
  //and what was raised over it for the while
  this._raised = [];
}

CameraControl.prototype.init = function () {
  var root = this.root;

  //and with no fingers to twist, Q and E turn it a quarter turn either way
  window.addEventListener("keydown", function (e) {
    var target = e.target && e.target.tagName;

    if (target === "INPUT" || target === "TEXTAREA" || e.repeat) return;
    if (e.key === "q" || e.key === "Q") root.turnView(-1);
    else if (e.key === "e" || e.key === "E") root.turnView(1);
  });
  var cam = (this._cam = root.camera.cameraScript);

  var a = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);
  var ps = Events.on(
    cam,
    WorldCamera.events.inputPinchStart,
    onPinchStart,
    this,
  );
  var p = Events.on(cam, WorldCamera.events.inputPinch, onPinch, this);
  var pe = Events.on(cam, WorldCamera.events.inputPinchEnd, onPinchEnd, this);
  var dt = Events.on(cam, WorldCamera.events.inputDoubleTap, onDoubleTap, this);

  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputDrag,
    a,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputPinchStart,
    ps,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputPinch,
    p,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputPinchEnd,
    pe,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputDoubleTap,
    dt,
  ]);
};

export default CameraControl;
