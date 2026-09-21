import engine from "engine/main";

//Sits between the pictures the game ships with and the renderers that draw
//them. Browsers blit a small canvas that already lives on the GPU a good deal
//faster than they cut a rectangle out of a big png, so every picture is painted
//once onto a canvas of its own and the renderers only ever see that canvas.
//
//A picture comes either out of the spritesheet or, when the sheet has no frame
//of that name, from a png of its own under gfx/, at the same path the frame
//would have had (gfx/buildings/shop.png for "buildings/shop.png"). New art is
//added the second way; the sheet stays until everything has moved out of it.
//
//Any picture can also be had mirrored, left to right. That is what a rotated
//building is drawn with when nobody painted it turned round: flipped over, its
//x and y axes swap, which is exactly what rotating does to its footprint.

var ROOT = "gfx/";
var ImageType = engine.AssetManager.Resource.ResourceTypeEnum.image;
var ResourceState = engine.AssetManager.Resource.ResourceStateEnum;

function SpriteCache(assets) {
    this.assets = assets;
    this.frames = {};
    this.atlas = null;
    this.sprites = {};
    this.waiting = new Map();
}

SpriteCache.prototype.setSpritesheet = function (frames, atlas) {
    this.frames = frames;
    this.atlas = atlas;
};

/**
 * The one sprite for that name, shared by everything that draws it. A picture
 * of its own is loaded in the background: until it is there the sprite is
 * empty (0x0), which the renderers simply draw nothing for.
 *
 * @param name {string} e.g. "buildings/shop.png"
 * @param [mirrored] {boolean} flipped left to right
 * @returns {Isometrica.Engine.SpriteManager.Sprite}
 */
SpriteCache.prototype.getSprite = function (name, mirrored) {
    var key = mirrored ? name + "#mirrored" : name,
        sprite = this.sprites[key];

    if (sprite === undefined) {
        sprite = this.sprites[key] = new engine.SpriteManager.Sprite();

        if (mirrored)
            fromMirror(this, sprite, this.getSprite(name));
        else if (this.frames[name] !== undefined)
            fromSpritesheet(this, sprite, this.frames[name].frame);
        else
            fromImage(this, sprite, ROOT + name);
    }

    return sprite;
};

/**
 * Calls back with the sprite once there is a picture in it - right away for a
 * spritesheet frame, later for one that is still being loaded. For whoever
 * needs its size, which an empty sprite does not have yet.
 */
SpriteCache.prototype.whenReady = function (sprite, callback) {
    if (sprite.width > 0) {
        callback(sprite);
        return;
    }

    var list = this.waiting.get(sprite);

    if (list === undefined)
        this.waiting.set(sprite, list = []);

    list.push(callback);
};

function fromSpritesheet(self, sprite, frame) {
    fill(self, sprite, prerender(self.atlas, frame.x, frame.y, frame.w, frame.h));
}

function fromMirror(self, sprite, original) {
    self.whenReady(original, function () {
        var canvas = prerender(original.sourceImage, 0, 0, original.width, original.height, true);
        fill(self, sprite, canvas);
    });
}

function fromImage(self, sprite, path) {
    self.assets.getAsset(path, ImageType).done(function (resource) {
        if (resource.state !== ResourceState.ready) {
            console.warn("Sprite not found: " + path);
            return;
        }

        var image = resource.data;
        fill(self, sprite, prerender(image, 0, 0, image.width, image.height));

        //the canvas is all anybody draws from now on
        self.assets.releaseAsset(path);
    });
}

function prerender(source, x, y, w, h, mirrored) {
    var canvas = typeof OffscreenCanvas !== "undefined" ?
        new OffscreenCanvas(w, h) :
        Object.assign(document.createElement("canvas"), {width: w, height: h});

    var ctx = canvas.getContext("2d");

    if (mirrored) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
    }

    ctx.drawImage(source, x, y, w, h, 0, 0, w, h);

    return canvas;
}

function fill(self, sprite, canvas) {
    sprite.sourceImage = canvas;
    sprite.offsetX = 0;
    sprite.offsetY = 0;
    sprite.width = canvas.width;
    sprite.height = canvas.height;

    var list = self.waiting.get(sprite);

    if (list !== undefined) {
        self.waiting.delete(sprite);

        for (var i = 0; i < list.length; i++)
            list[i](sprite);
    }
}

export default SpriteCache;
