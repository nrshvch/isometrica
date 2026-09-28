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
  var zoom = me._cam.zoom();

  me._pinch = {
    zoom: zoom,
    //in page pixels, which stay the same size whatever the zoom
    x: e.gameViewportX * zoom,
    y: e.gameViewportY * zoom,
  };
}

/**
 * The fingers carry the map along as they go, the way a single one drags it,
 * and the camera takes whichever of ZOOMS is nearest to what the pinch would
 * make of the zoom it started at - fingers twice as far apart, twice as close.
 */
function onPinch(sender, e, me) {
  var pinch = me._pinch,
    cam = me._cam;

  if (pinch === null) return;

  var from = cam.zoom(),
    x = e.gameViewportX * from,
    y = e.gameViewportY * from;

  cam.pan((x - pinch.x) / from, (y - pinch.y) / from);
  pinch.x = x;
  pinch.y = y;

  cam.zoom(nearestZoom(pinch.zoom * e.scale), e.gameViewportX, e.gameViewportY);
}

function onPinchEnd(sender, e, me) {
  me._pinch = null;
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
}

CameraControl.prototype.init = function () {
  var root = this.root;
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
