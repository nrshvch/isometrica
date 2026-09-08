define(function (require) {
    var namespace = require("namespace");
    var SpriteRenderer = require("./spriterenderer");

    namespace("Isometrica.Engine").AnimatedSpriteRenderer = AnimatedSprite;

    function AnimatedSprite(sprite) {
        SpriteRenderer.call(this);

        this.frames = [];
    }

    var p = AnimatedSprite.prototype = Object.create(SpriteRenderer.prototype);

    p.constructor = AnimatedSprite;

    p.frames = null;
    p.currentFrame = 0;
    p.speed = 1; // 0 - 1.  1 = 24FPS

    p.addFrame = function (sprite) {
        this.frames.push(sprite);
    };

    p.setAnimationSpeed = function (value) {
        this.speed = value;
    };

    p.tick = function () {
        if (this.frames !== null && this.frames.length > 0) {
            var index = this.currentFrame + 1;

            if (index >= this.frames.length)
                index = 0;

            this.currentFrame = index;
            this.setSprite(this.frames[index]);
        }
    };

    return AnimatedSprite;
});