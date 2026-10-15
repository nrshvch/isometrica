import WorldCamera from "./components/camerascript";
import Events from "events";
import Turner from "./turner";
import View from "./view";

//The zooms the camera is drawn at while fingers pinch - what is shown is
//scaled the rest of the way on the page. Let go, it stays at whatever zoom
//they left it at, between the smallest and the biggest of these.
var ZOOMS = [0.5, 0.667, 1, 1.5, 2];

//The zooms every pixel of the pixel art is the same size at, a whole number
//of the screen's or a half: sharp. A pinch that comes within SNAP of one -
//as a share of it - is pulled onto it, while the fingers move and when they
//let go; at any zoom in between, the pixels come out of uneven sizes.
var SHARP = [0.5, 1, 2],
  SNAP = 0.07;

//zoom, or the sharp zoom it is within SNAP of
function snapZoom(zoom) {
  for (var i = 0; i < SHARP.length; i++)
    if (Math.abs(Math.log(zoom / SHARP[i])) < Math.log(1 + SNAP))
      return SHARP[i];

  return zoom;
}

function onDrag(sender, param, me) {
  var dragX = param.dx,
    dragY = param.dy;

  //held where it is while the world turns (client/turner)
  if (me.turner.active) return;
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
 * - the camera takes the biggest of ZOOMS under what the pinch would make
 *   of the zoom it started at - fingers twice as far apart, twice as close;
 *   pulled onto a sharp zoom near it (snapZoom) - and what is shown is
 *   scaled on the page by the rest of the way there, about the spot between
 *   the fingers, so it grows and shrinks smoothly as they move;
 * - twisted, the world turns with them, about the ground in the middle of
 *   the screen, a quarter turn for every quarter turn of theirs (client/
 *   turner) - held where it is meanwhile, the zoom too, all of it shown by
 *   the turner till they let go.
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
    y = e.gameViewportY * from,
    want = snapZoom(
      Math.max(
        ZOOMS[0] * PINCH_PAST,
        Math.min(ZOOMS[ZOOMS.length - 1] / PINCH_PAST, pinch.zoom * e.scale),
      ),
    );

  pinch.want = want;

  //twisted: the turner shows the world turning with them, and the rest of
  //it, from there on
  if (
    e.rotation !== undefined &&
    Math.abs(e.rotation) > TWIST_START &&
    !me.turner.active
  )
    me.turner.begin(x, y);

  if (me.turner.active) {
    pinch.x = x;
    pinch.y = y;
    me.turner.view(e.rotation || 0, want / me.turner.zoom, x, y);
    return;
  }

  //as far as the fingers moved on what is shown, scaled as it is
  cam.pan(
    (x - pinch.x) / (from * pinch.scale),
    (y - pinch.y) / (from * pinch.scale),
  );
  pinch.x = x;
  pinch.y = y;

  //the zoom at or under where the fingers would have it, for what is shown
  //to be scaled up the rest of the way - always covering the screen
  cam.zoom(zoomUnder(want), e.gameViewportX, e.gameViewportY);

  pinch.scale = want / cam.zoom();
  show(me, x, y, pinch.scale);
}

//the biggest of ZOOMS no bigger than zoom, give or take a hair - fingers
//that only turn come out a hair closer or further - or the smallest
function zoomUnder(zoom) {
  var under = ZOOMS[0];

  for (var i = 1; i < ZOOMS.length; i++)
    if (ZOOMS[i] <= zoom * 1.02) under = ZOOMS[i];

  return under;
}

//what shows round what is shown, where it does not cover the screen
var BACKDROP = "#1b1f24";

//how far the fingers have to turn before the world turns with them, in
//degrees
var TWIST_START = 3;

//how far past the smallest and the biggest zoom a pinch can go before it
//goes no further, as a share of them
var PINCH_PAST = 0.8;

//how long what is shown takes to ease back once the fingers let go, ms
var SETTLE_MS = 180;

/**
 * Shows the world scaled by scale on the page, about x, y on the canvas in
 * page pixels - the rest of the way a pinch would take it, past the zoom
 * the camera is at.
 */
function show(me, x, y, scale) {
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
  style.transform = Math.abs(scale - 1) < 0.001 ? "" : "scale(" + scale + ")";
}

/**
 * Lets go: the camera takes the zoom the pinch left it at - no further than
 * the smallest and the biggest of ZOOMS, and pulled onto a sharp one near it
 * - and what is shown eases back to that, and to the side of the world the
 * camera is at, and then is shown as it is.
 */
function onPinchEnd(sender, e, me) {
  var viewport = me._cam.gameObject.camera.viewport,
    pinch = me._pinch,
    cam = me._cam;

  me._pinch = null;

  if (!viewport) return;

  var style = viewport.canvas.style;

  //turned: the turner settles it on the nearest side, at the zoom they let
  //go at, and shows the game from there once it is
  if (me.turner.active) {
    settle(me);
    if (pinch !== null)
      me.turner.end(
        snapZoom(
          Math.max(
            ZOOMS[0],
            Math.min(ZOOMS[ZOOMS.length - 1], pinch.want || pinch.zoom),
          ),
        ),
        pinch.x,
        pinch.y,
      );
    return;
  }

  if (!style.transform) {
    settle(me);
    return;
  }

  //where it was pinched to, shown from where it is
  if (pinch !== null && pinch.want !== undefined) {
    var to = snapZoom(
        Math.max(ZOOMS[0], Math.min(ZOOMS[ZOOMS.length - 1], pinch.want)),
      ),
      at = cam.zoom();

    if (to !== at) {
      cam.zoom(to, pinch.x / at, pinch.y / at);
      show(me, pinch.x, pinch.y, pinch.want / to);
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
  //what shows the world turning, between one side of it and the next
  this.turner = new Turner(root);
}

CameraControl.prototype.init = function () {
  var root = this.root,
    turner = this.turner;

  //and with no fingers to twist, Q and E turn it a quarter turn either way
  window.addEventListener("keydown", function (e) {
    var target = e.target && e.target.tagName;

    if (target === "INPUT" || target === "TEXTAREA" || e.repeat) return;
    if (e.key === "q" || e.key === "Q") turner.turn(-1);
    else if (e.key === "e" || e.key === "E") turner.turn(1);
    //and T looks at it from straight above, as a map, and back
    else if (e.key === "t" || e.key === "T") root.setTopView(!View.top());
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
