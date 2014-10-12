define(function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./renderer");
    var glMatrix = require("../vendor/gl-matrix");

    namespace("Isometrica.Engine").TextRenderer = TextRenderer;

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

    p.render = function(layer, viewportRenderer){
        glMatrix.vec3.transformMat4(vec3Buffer1, this.gameObject.transform.getPosition(vec3Buffer1), viewportRenderer.M);

        layer.font = this.style;
        layer.fillStyle = this.color;
        layer.textAlign = this.align;
        layer.textBaseline = this.valign;
        layer.fillText(this.text, vec3Buffer1[0], vec3Buffer1[1]);
    };

    return TextRenderer;
});