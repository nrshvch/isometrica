define(["../Component"], function (Component) {
    function Path() {
        Component.call(this);

        this.points = [];
    }

    var p = Path.prototype = Object.create(Component.prototype);

    p.constructor = Path;

    p.points = null;
    p.color = "white";
    p.width = 1;
    p.layer = 0;

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.pathRenderer = this;
        gameObject.renderer = this;
    }

    p.unsetGameObject = function(){
        this.gameObject.pathRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    }

    return Path;
});