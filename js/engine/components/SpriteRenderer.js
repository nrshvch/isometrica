define(function (require) {
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./Renderer");
    var Transform = require("./TransformComponent");
    var glMatrix = require("../lib/gl-matrix");
    var Vec3 = glMatrix.vec3;

    function Sprite(sprite) {
        Component.call(this);

        this.events = {
            ready: 0
        }

        this.buf = new Float32Array(3);

        this.enabled = false;
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

    var x0, y0, sprite, w, h, sx, sy, x1, y1, vw, vh, buffer;
    var getPos = Transform.getPosition;
    p.cullingTest = function (viewport, viewportRenderer) {
        var vec3Buffer1 = this.buf;
        //this.gameObject.transform.getPosition(vec3Buffer1);
        getPos(this.gameObject.transform, vec3Buffer1);
        Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.M);

        sprite = this.sprite;
        x0 = vec3Buffer1[0] - this.pivotX;
        y0 = vec3Buffer1[1] - this.pivotY;

        return x0 <= viewport.width && x0 + sprite.width >= 0 && y0 <= viewport.height && y0 + sprite.height >= 0;
    };

    p.render = function (layer, viewportRenderer, viewport) {
        //Transform.getPosition(this.gameObject.transform,vec3Buffer1);
        //Vec3.transformMat4(vec3Buffer1, vec3Buffer1, viewportRenderer.M);

        //Screen bound clipping isn't necessary
        /*
        var vec3Buffer1 = this.buf;
        sprite = this.sprite;
        x0 = (vec3Buffer1[0] - this.pivotX) | 0;
        y0 = (vec3Buffer1[1] - this.pivotY) | 0;
        w = sprite.width;
        h = sprite.height;
        sx = sprite.offsetX;
        sy = sprite.offsetY;


         if(x0 < 0){
         sx -= x0;
         w += x0;
         x0 = 0;
         }else{
         x1 = x0 + w;
         vw = viewport.width;

         if(x1 > vw)
         w = w + vw - x1;
         }

         if(y0 < 0){
         sy -= y0;
         h += y0;
         y0 = 0;
         }else{
         y1 = y0 + h;
         vh = viewport.height;

         if(y1 > vh)
         h = h + vh - y1;
         }


        layer.drawImage(sprite.sourceImage, sx, sy, w, h, x0, y0, w, h);
        */

        buffer = this.buf;
        sprite = this.sprite;
        w = sprite.width;
        h = sprite.height;
        layer.drawImage(sprite.sourceImage, sprite.offsetX, sprite.offsetY, w, h, (buffer[0] - this.pivotX) | 0, (buffer[1] - this.pivotY) | 0, w, h);
    };

    return Sprite;
});