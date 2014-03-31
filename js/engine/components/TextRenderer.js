define(["../Component"], function (Component) {
    function TextRenderer() {
        Component.call(this);
    }

    var p = TextRenderer.prototype = Object.create(Component.prototype);

    p.constructor = TextRenderer;

    p.text = "sample text";
    p.color = "white";
    p.style = "normal 12px arial"
    p.layer = 0;
    p.align = "center";
    p.valign = "middle";

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.textRenderer = this;
        gameObject.renderer = this;
    };

    p.unsetGameObject = function(){
        this.gameObject.textRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    return TextRenderer;
});