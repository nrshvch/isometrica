define(function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./Renderer");
    var Transform = require("./TransformComponent");
    var glMatrix = require("../vendor/gl-matrix");
    var Vec3 = glMatrix.vec3;

    namespace("Isometrica.Engine").SpriteRenderer = Sprite;

    function Sprite(sprite) {
        Component.call(this);

        this.events = {
            ready: 0
        }

        this.buf = new Float32Array(3);

        this.enabled = false;
        this.t = Vec3.transformMat4;
    }

    var p = Sprite.prototype = Object.create(Component.prototype);

    p.constructor = Sprite;

    p.sprite = null;

    p.pivotX = 0;
    p.pivotY = 0;

    p.layer = 0;

    p.setGameObject = function (gameObject) {
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.spriteRenderer = this;
        gameObject.renderer = this;
    };

    p.setSprite = function (sprite) {
        this.sprite = sprite;
        this.enabled = true;

        return this;
    };

    p.setPivot = function (x, y) {
        this.pivotX = x;
        this.pivotY = y;
        return this;
    };

    p.unsetGameObject = function () {
        this.gameObject.spriteRenderer = undefined;
        this.gameObject.renderer = null;
        Component.prototype.unsetGameObject.call(this);
    };

    var getPos = Transform.getPosition;

    p.cullingTest = function (viewport, viewportRenderer) {
        var buffer = this.buf;

        this.gameObject.transform.getPosition(buffer);
        //getPos(this.gameObject.transform, vec3Buffer1);

        Vec3.transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = this.sprite;
        var x0 = (buffer[0] - this.pivotX) | 0;
        var y0 = (buffer[1] - this.pivotY) | 0;

        return x0 <= viewport.width && x0 + sprite.width >= 0 && y0 <= viewport.height && y0 + sprite.height >= 0;
    };

    p.render = function (layer, viewportRenderer, viewport) {
        var buffer = this.buf;

        this.gameObject.transform.getPosition(buffer);
        Vec3.transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = this.sprite;
        var w = sprite.width;
        var h = sprite.height;
        layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - this.pivotX) | 0, (buffer[1] - this.pivotY) | 0, w, h);
    };

    return Sprite;
});