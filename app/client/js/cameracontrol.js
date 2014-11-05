define(function (require) {
    var WorldCamera = require("./components/camerascript");
    var Events = require("events");

    function onDrag(sender, param, me) {
        var dragX = param.dx,
            dragY = param.dy;
        me._cam.pan(dragX, dragY);
    }

    function onDispose(a, b, c) {
        Events.off(c);
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

        Events.once(this, events.dispose, onDispose, a);
    };

    return CameraControl;
});