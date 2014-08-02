define(function (require) {
    var engine = require("engine");

    function Script() {
        engine.Component.call(this);

        //TODO camera script should provide position update events. in game XY coords
        this.onCameraMove = function(args){
            //console.log("save position", sender.getPosition());
        };
    }

    Script.prototype = Object.create(engine.Component.prototype);

    Script.prototype.positionX = 0;
    Script.prototype.positionY = 0;

    Script.prototype.awake = function(){
        if(!this.gameObject.getComponent(engine.CameraComponent))
            throw "Player script has to be attached to camera!";

        this.gameObject.transform.addEventListener(this.gameObject.transform.events.update, this.onCameraMove);
    };

    return Script;
});
