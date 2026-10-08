define(function (require) {
    var namespace = require("namespace");
    var vec3Buffer1 = new Float32Array(3);
    var Component = require("./renderer");
    var Transform = require("./transformcomponent");
    var glMatrix = require("gl-matrix");
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

        //Everything culling and drawing read is the sprite's own from the
        //start, in the same order - defaults kept - so that every sprite has
        //one shape and the loop over tens of thousands of them stays on V8's
        //fast path. Filled in later, one at a time and in whatever order,
        //they left it juggling several.
        this.gameObject = null;
        this._sprite = this._sprite;
        this._pivotX = this._pivotX;
        this._pivotY = this._pivotY;
        this.opacity = 1;
        this.layer = this.layer;
    }

    var p = Sprite.prototype = Object.create(Component.prototype);

    p.constructor = Sprite;

    p._sprite = null;

    p._pivotX = 0;
    p._pivotY = 0;

    p.layer = 0;

    /**
     * The world culls a sprite by its picture's size and its pivot, which it
     * keeps a copy of (see World#slots), so changing either has to tell it -
     * whether through setSprite and setPivot or by assigning them.
     */
    function changed(self) {
        var gameObject = self.gameObject;

        if (gameObject !== null && gameObject.world !== null)
            gameObject.world.invalidate(gameObject);
    }

    Object.defineProperty(p, "sprite", {
        get: function () {
            return this._sprite;
        },
        set: function (sprite) {
            this._sprite = sprite;
            changed(this);
        }
    });

    Object.defineProperty(p, "pivotX", {
        get: function () {
            return this._pivotX;
        },
        set: function (x) {
            this._pivotX = x;
            changed(this);
        }
    });

    Object.defineProperty(p, "pivotY", {
        get: function () {
            return this._pivotY;
        },
        set: function (y) {
            this._pivotY = y;
            changed(this);
        }
    });

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

    var getLocalToWorld = Transform.getLocalToWorld;

    //Canvas2dRenderer culls every sprite that keeps this test with a copy of
    //it inlined into its own loop, so the two have to stay in step
    p.cullingTest = function (viewport, viewportRenderer, self) {
        var m = getLocalToWorld(self.gameObject.transform),
            M = viewportRenderer.M,
            x = m[12], y = m[13], z = m[14],
            sprite = self._sprite,
            x0 = Math.floor(M[0] * x + M[4] * y + M[8] * z + M[12] - self._pivotX + 0.5),
            y0 = Math.floor(M[1] * x + M[5] * y + M[9] * z + M[13] - self._pivotY + 0.5);

        return x0 <= viewport.width && x0 + sprite.width >= 0 && y0 <= viewport.height && y0 + sprite.height >= 0;
    };

    p.render = function (layer, viewportRenderer, viewport, self) {
        var buffer = self.buf,
            m = getLocalToWorld(self.gameObject.transform),
            M = viewportRenderer.M,
            x = m[12], y = m[13], z = m[14];

        //where on screen it stands is left in buf for a subclass drawing more
        //over it, see VehicleRenderer
        buffer[0] = M[0] * x + M[4] * y + M[8] * z + M[12];
        buffer[1] = M[1] * x + M[5] * y + M[9] * z + M[13];

        //to the nearest pixel, as Canvas2dRenderer places the sprites it culls
        draw(layer, self, Math.floor(buffer[0] - self._pivotX + 0.5), Math.floor(buffer[1] - self._pivotY + 0.5));
    };

    /**
     * While the renderer draws the layers that are lit (see Canvas2dRenderer,
     * Config.lighting), which of the lighting's canvases it is drawing into -
     * 0 the colours, then which way things look, and the rest of the
     * lighting's own (see client/lighting) - and
     * whether the layer is flat ground, where nothing has to be hidden
     * behind what is drawn; -1 while it draws as it always has.
     */
    Sprite.pass = -1;
    Sprite.flat = false;

    /**
     * Draws the sprite with its top left corner at x0, y0 - whole screen
     * pixels, pivot already taken off. Canvas2dRenderer draws the sprites it
     * culled itself with this directly, at the spot it worked out culling them.
     */
    function draw(layer, self, x0, y0) {
        picture(layer, self, self._sprite, x0, y0);
    }

    /**
     * Draws a picture of the renderer's - its sprite, or anything it draws
     * over it - at x0, y0, as the pass being drawn wants it: a picture that
     * knows how it is lit (lightPass) gives what it is in that pass, or
     * nothing; one that does not is drawn whole with the colours, and
     * nowhere else.
     */
    function picture(layer, self, sprite, x0, y0) {
        var w = sprite.width,
            h = sprite.height,
            pass = Sprite.pass,
            src = sprite;

        if (pass >= 0 && sprite.lightPass !== undefined) {
            src = sprite.lightPass(pass, Sprite.flat, self);

            if (src === null)
                return;
        } else {
            if (pass >= 0 && pass !== 0)
                return;

            //a sprite kept somewhere it can be put away from - a cache of
            //what is on screen - is fetched back first, and marked as still
            //wanted; one that cannot be just now is not drawn
            if (sprite.acquire !== undefined && !sprite.acquire())
                return;
        }

        if (self.opacity !== 1) {
            layer.save();
            layer.globalAlpha = self.opacity;
            layer.drawImage(src.sourceImage, src.offsetX, src.offsetY, w, h, x0, y0, w, h);
            layer.restore();
        } else
            layer.drawImage(src.sourceImage, src.offsetX, src.offsetY, w, h, x0, y0, w, h);
    }

    Sprite.picture = picture;
    Sprite.draw = draw;

    return Sprite;
});