import WorldCamera from "./components/camerascript";
import Events from "events";
import Turner from "./turner";
import View from "./view";

//The zooms the camera is drawn at while fingers pinch - what is shown is
//scaled the rest of the way on the page. Let go, it settles on whichever of
//these is nearest (nearestZoom): the only zooms it is ever left at, shown as
//steps 1x to 5x in the top bar (zoomStep).
var ZOOMS = [0.5, 0.667, 1, 1.5, 2];

//The zooms every pixel of the pixel art is the same size at, a whole number
//of the screen's or a half: sharp. A pinch that comes within SNAP of one -
//as a share of it - is pulled onto it while the fingers move; at any zoom in
//between, the pixels come out of uneven sizes.
var SHARP = [0.5, 1, 2],
  SNAP = 0.07;

//the one of ZOOMS nearest zoom, as a share of it - so from 1 to 1.5 the
//halfway is 1.22, not 1.25
function nearestZoom(zoom) {
  var best = ZOOMS[0];

  for (var i = 1; i < ZOOMS.length; i++)
    if (Math.abs(Math.log(zoom / ZOOMS[i])) < Math.abs(Math.log(zoom / best)))
      best = ZOOMS[i];

  return best;
}

//zoom, or the sharp zoom it is within SNAP of
function snapZoom(zoom) {
  for (var i = 0; i < SHARP.length; i++)
    if (Math.abs(Math.log(zoom / SHARP[i])) < Math.log(1 + SNAP))
      return SHARP[i];

  return zoom;
}

/**
 * A drag that starts at the left or the right edge of the screen - within
 * EDGE of it - turns the world rather than moving over it: as far as the
 * finger goes across from there, the ground nearest the eye going with it,
 * a quarter turn for every TURN_ACROSS of the screen's width; back towards
 * the edge, back round again. Let go, it settles on the side of the world
 * nearest, the one it set off from unless it went COMMIT degrees or more
 * (client/turner end).
 */
function onDragStart(sender, e, me) {
  me._edge = null;

  var viewport = me._cam.gameObject.camera.viewport;

  if (!viewport || me.turner.active || me._pinch !== null) return;

  var zoom = me._cam.zoom(),
    x = e.gameViewportX * zoom,
    w = viewport.width * zoom;

  if (x > EDGE && x < w - EDGE) return;

  me.turner.begin();
  if (me.turner.active) me._edge = { x: x, width: w };
}

function onDrag(sender, param, me) {
  var edge = me._edge;

  if (edge !== null) {
    //in page pixels - the camera is zoomed out meanwhile, for pictures of
    //the world as it turns (client/turner)
    var across = param.e.gameViewportX * me._cam.zoom() - edge.x,
      deg = (-across / (TURN_ACROSS * edge.width)) * 90;

    me.turner.view(Math.max(-TURN_MOST, Math.min(TURN_MOST, deg)));
    return;
  }

  //held where it is while the world turns (client/turner)
  if (me.turner.active) return;
  me._cam.pan(param.dx, param.dy);
}

function onDragEnd(sender, e, me) {
  if (me._edge === null) return;

  me._edge = null;
  me.turner.end();
}

//how near the left or the right edge of the screen a drag has to start to
//turn the world, page pixels; how much of the screen's width the finger
//goes across for a quarter turn, and how far round it can go at most
var EDGE = 32,
  TURN_ACROSS = 0.5,
  TURN_MOST = 180;

function onPinchStart(sender, e, me) {
  //a second finger while the world turns from the edge: it turns on
  if (me._edge !== null) return;

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
 * and zoom it with them, every bit of the way: the camera takes the biggest
 * of ZOOMS under what the pinch would make of the zoom it started at -
 * fingers twice as far apart, twice as close; pulled onto a sharp zoom near
 * it (snapZoom) - and what is shown is scaled on the page by the rest of the
 * way there, about the spot between the fingers, so it grows and shrinks
 * smoothly as they move. (They do not turn it: a drag from the edge of the
 * screen does, onDragStart.)
 *
 * Let go, it eases back to the zoom the camera is at (onPinchEnd).
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

  //held where it is while the world turns (client/turner)
  if (me.turner.active) return;

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
 * Lets go: the camera takes the one of ZOOMS nearest the zoom the pinch left
 * it at, and what is shown eases back to that, and to the side of the world
 * the camera is at, and then is shown as it is.
 */
function onPinchEnd(sender, e, me) {
  var viewport = me._cam.gameObject.camera.viewport,
    pinch = me._pinch,
    cam = me._cam;

  me._pinch = null;

  if (!viewport) return;

  var style = viewport.canvas.style;

  //the world turning meanwhile: nothing to ease back
  if (me.turner.active) {
    settle(me);
    return;
  }

  if (!style.transform) {
    settle(me);
    return;
  }

  //where it was pinched to, shown from where it is
  if (pinch !== null && pinch.want !== undefined) {
    var to = nearestZoom(pinch.want),
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
  //a drag from the edge of the screen turning the world (onDragStart)
  this._edge = null;
  //easing back from a pinch, the timer that says when it is done - and what
  //the backdrop round what is shown was before a pinch darkened it
  this._settling = 0;
  this._backdrop = null;
  //and what was raised over it for the while
  this._raised = [];
  //what shows the world turning, between one side of it and the next
  this.turner = new Turner(root);
}

/**
 * Whether a drag from x, viewport pixels, would turn the world: it starts at
 * the left or the right edge of the screen (onDragStart) - for whatever else
 * takes drags to leave it be (client/areaselector).
 */
CameraControl.prototype.atEdge = function (x) {
  var viewport = this._cam && this._cam.gameObject.camera.viewport;

  if (!viewport) return false;

  var zoom = this._cam.zoom();

  return x * zoom <= EDGE || x * zoom >= viewport.width * zoom - EDGE;
};

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
    //and N has the day and the night go by, or not (client/lighting)
    else if (e.key === "n" || e.key === "N") root.lighting.setDayNight();
  });
  var cam = (this._cam = root.camera.cameraScript);

  var a = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);
  var ds = Events.on(cam, WorldCamera.events.inputDragStart, onDragStart, this);
  var de = Events.on(cam, WorldCamera.events.inputDragEnd, onDragEnd, this);
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
    WorldCamera.events.inputDragStart,
    ds,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputDragEnd,
    de,
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

/**
 * Zooms a step of ZOOMS in, or out, about the middle of the screen - for
 * buttons to zoom by, where there are no fingers to pinch or wheel to turn.
 *
 * @param dir {number} 1 in, -1 out
 */
CameraControl.prototype.zoomStep = function (dir) {
  var cam = this._cam;

  if (!cam) return;

  var i = ZOOMS.indexOf(nearestZoom(cam.zoom())) + dir;

  if (i >= 0 && i < ZOOMS.length) cam.zoom(ZOOMS[i]);
};

/**
 * The step of ZOOMS a zoom is at, or nearest: 1 for the furthest out (0.5)
 * to 5 for the closest in (2) - what the top bar shows.
 */
CameraControl.zoomStep = function (zoom) {
  return ZOOMS.indexOf(nearestZoom(zoom)) + 1;
};

export default CameraControl;
