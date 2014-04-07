define(function (require) {
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("../Renderer");
    var glMatrix = require("../lib/gl-matrix");

    function Sprite(sprite) {
        Component.call(this);

        this.events = {
            ready: 0
        }

        this.enabled = false;
    }

    var p = Sprite.prototype = Object.create(Component.prototype);

    p.constructor = Sprite;

    p.sprite = null;

    p.pivotX = 0;
    p.pivotY = 0;

    p.layer = 0;

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.spriteRenderer = this;
        gameObject.renderer = this;
    };

    p.setSprite = function(sprite){
        this.sprite = sprite;
        this.enabled = true;

        return this;
    };

    p.setPivot = function(x, y){
        this.pivotX = x;
        this.pivotY = y;
        return this;
    };

    p.unsetGameObject = function(){
        this.gameObject.spriteRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    p.render = function(layer, viewportRenderer){
        glMatrix.vec3.transformMat4(vec3Buffer1, this.gameObject.transform.getPosition(vec3Buffer1), viewportRenderer.M);
        var sprite = this.sprite;
        layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, sprite.width, sprite.height, (vec3Buffer1[0] - this.pivotX) | 0, (vec3Buffer1[1] - this.pivotY) | 0, sprite.width, sprite.height);
    };

    return Sprite;
});