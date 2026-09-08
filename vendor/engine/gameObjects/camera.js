define(function (require) {
    var namespace = require("namespace");
    var GameObject = require("../gameobject");
    var CameraComponent = require("../components/cameracomponent");

    namespace("Isometrica.Engine").Camera = CameraObject;

    function CameraObject(name) {
        GameObject.call(this, name || "camera");
        this.addComponent(new CameraComponent());
    }

    CameraObject.prototype = Object.create(GameObject.prototype);

    return CameraObject;
});
