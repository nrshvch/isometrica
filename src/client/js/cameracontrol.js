import WorldCamera from "./components/camerascript";
import Events from "events";

function onDrag(sender, param, me) {
    var dragX = param.dx,
        dragY = param.dy;
    me._cam.pan(dragX, dragY);
}

function onDispose(sender, args, data) {
    Events.off(data[0], data[1], data[2]);
}

var events = {
    dispose: 0
};

function CameraControl(root) {
    this.root = root;

}

CameraControl.prototype.init = function () {
    var root = this.root;
    var cam = this._cam = root.camera.cameraScript;

    var a = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);

    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDrag, a]);
};

export default CameraControl;
