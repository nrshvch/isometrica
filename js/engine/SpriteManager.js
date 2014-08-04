/**
 * This class provides api to work with sprites, spritesheets etc;
 */
define(function (require) {
    var namespace = require("namespace");
    namespace("Isometrica.Engine").SpriteManager = SpriteMgr;

    function SpriteMgr(assetMgr) {
        this.assets = assetMgr;
        this.frames = {};
    }



    SpriteMgr.Sprite = function Sprite() {
        this.offsetX = 0;
        this.offsetY = 0;
        this.width = 0;
        this.height = 0;
    };

    SpriteMgr.Sprite.prototype.sourceImage = new Image();

    SpriteMgr.prototype.getSprite = function (name) {
        var sprite = new SpriteMgr.Sprite();

        if (this.frames[name] !== undefined) {
            var data = this.frames[name];
            sprite.sourceImage = this.atlas;
            sprite.width = data.frame.w;
            sprite.height = data.frame.h;
            sprite.offsetX = data.frame.x;
            sprite.offsetY = data.frame.y;
        } else {
            this.assets.getAsset("assets/" + name, this.assets.constructor.Resource.ResourceTypeEnum.image).done(function (resource) {
                sprite.sourceImage = resource.data;
                sprite.width = resource.data.width;
                sprite.height = resource.data.height;
            });

        }

        return sprite;
    };

    return SpriteMgr;
});

