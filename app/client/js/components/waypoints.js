define(function (require) {
    var engine = require("engine/main");

    function Waypoint(){
        this.x = 0;
        this.y = 0;
        this.type = "default";
    }

    function Component(){
        engine.Component.call(this);

        //Vector3 waypoints in local coordinates
        var waypoints = [];
    }

    Component.prototype = Object.create(engine.Component.prototype);

    return Component;
});