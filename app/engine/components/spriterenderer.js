define(function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./renderer");
    var Transform = require("./transformcomponent");
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
        this.opacity = 1;
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

    p.cullingTest = function (viewport, viewportRenderer, self) {
        var buffer = self.buf;

        //self.gameObject.transform.getPosition(buffer);
        getPos(self.gameObject.transform, buffer);

        Vec3.transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = self.sprite;
        var x0 = (buffer[0] - self.pivotX) | 0;
        var y0 = (buffer[1] - self.pivotY) | 0;

        return x0 <= viewport.width && x0 + sprite.width >= 0 && y0 <= viewport.height && y0 + sprite.height >= 0;
    };

    var transformMat4 = function(out, a, m) {
        var x = a[0], y = a[1], z = a[2];
        out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
        out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
        return out;
    };

    p.render = function (layer, viewportRenderer, viewport, self) {
        var buffer = self.buf;

        //self.gameObject.transform.getPosition(buffer);
        getPos(self.gameObject.transform, buffer);
        transformMat4(buffer, buffer, viewportRenderer.M);

        var sprite = self.sprite;
        var w = sprite.width;
        var h = sprite.height;

        if(self.opacity !== 1) {
            layer.save();
            layer.globalAlpha = self.opacity;

            layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - self.pivotX) | 0, (buffer[1] - self.pivotY) | 0, w, h);
            layer.restore();
        }else
            layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - self.pivotX) | 0, (buffer[1] - self.pivotY) | 0, w, h);
    };

    return Sprite;
});