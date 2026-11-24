import WorldCamera from "./components/camerascript";
import Events from "events";
import RProp from "reactive-property";

function pickTile(me, screenX, screenY) {
  return me.root.terrain.tileAt(me._cam, screenX, screenY);
}

function onMove(sender, e, self) {
  if (self._locked) return;

  var screenX = e.gameViewportX,
    screenY = e.gameViewportY;

  var tile = pickTile(self, screenX, screenY);
  self._tile(tile);
}

function onClick(sender, e, self) {
  var screenX = e.gameViewportX,
    screenY = e.gameViewportY;

  var tile = pickTile(self, screenX, screenY);
  self._tile(tile);
  self._locked = true;
}

function onChange(s, a, m) {
  Events.fire(m, events.change);
}

//data is [host, event, subscription] - Events.off needs all three, a bare
//subscription is not enough to find what it was subscribed to
function onDispose(sender, args, data) {
  Events.off(data[0], data[1], data[2]);
}

function onDisposeProp(sender, args, data) {
  //a reactive property's onChange called with a token unsubscribes it
  data[0].onChange(data[1]);
}

var events = {
  change: 0,
  dispose: 1,
};

function TileSelector(root) {
  this.root = root;
  this._tile = RProp(-1);
  this._locked = false;

  var cam = (this._cam = root.camera.cameraScript);

  var ms = Events.on(cam, WorldCamera.events.inputMove, onMove, this);
  var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);
  var s = this._tile.onChange(onChange, false, this);

  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputMove,
    ms,
  ]);
  Events.once(this, events.dispose, onDispose, [
    cam,
    WorldCamera.events.inputClick,
    cs,
  ]);
  Events.once(this, events.dispose, onDisposeProp, [this._tile, s]);
}

TileSelector.events = events;

TileSelector.prototype._tile = -1;
TileSelector.prototype._locked = false;

TileSelector.prototype.selectedTile = function () {
  return this._tile();
};

TileSelector.prototype.dispose = function () {
  Events.fire(this, events.dispose);
};

export default TileSelector;
