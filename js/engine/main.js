/*RAF shim*/
window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

define(function(require){
    var Config = require("./config");
    var Game = require("./game");
    var GameObject = require("./gameobject");
    var Component = require("./component");
    var Camera = require("./gameobjects/camera");
    var CameraComponent = require("./components/cameracomponent");
    var TransformComponent = require("./components/transformcomponent");
    var SpriteRenderer = require("./components/spriterenderer");
    var AssetManager = require("./lib/assetmanager/assetmanager");
    var SpriteManager = require("./spritemanager");
    var TextRenderer = require("./components/textrenderer");
    var AnimaterSpriteRenderer = require("./components/animatedspriterenderer");
    var Renderer = require("./components/renderer");
    var Coroutine = require("./coroutine");

    return namespace("Isometrica.Engine");
});