/*RAF shim*/
window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame/* ||
        function (callback) {
            window.setTimeout(callback, 1000 / 60);
        };
    */
})();

define(function(require){
    var namespace = require("namespace");

    require("./config");
    require("./stats");
    require("./game");
    require("./gameobject");
    require("./component");
    require("./gameObjects/camera");
    require("./components/cameracomponent");
    require("./components/transformcomponent");
    require("./components/spriterenderer");
    require("./lib/assetmanager/assetmanager");
    require("./spritemanager");
    require("./components/textrenderer");
    require("./components/animatedspriterenderer");
    require("./components/renderer");
    require("./coroutine");

    return namespace("Isometrica.Engine");
});