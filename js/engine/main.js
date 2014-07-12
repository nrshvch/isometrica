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

define([
    './config',
    './Game',
    './GameObject',
    './Component',
    './gameObjects/Camera',
    './components/CameraComponent',
    './components/TransformComponent',
    './components/SpriteRenderer',
    './lib/gl-matrix',
    './lib/assetmanager/assetmanager',
    './SpriteManager',
    './components/TextRenderer',
    './components/AnimatedSpriteRenderer',
    './components/Renderer'
], function (config, Game, GameObject, Component, Camera, CameraComponent, TransformComponent, SpriteRenderer, glMatrix, AssetManager, SpriteManager, TextRenderer, AnimatedSpriteRenderer, Renderer) {
    return window.scaliaEngine = {
        config: config,
        Game: Game,
        GameObject: GameObject,
        Component: Component,
        Renderer: Renderer,
        Camera: Camera,
        CameraComponent: CameraComponent,
        TransformComponent: TransformComponent,
        SpriteRenderer: SpriteRenderer,
        glMatrix: glMatrix,
        AssetManager: AssetManager,
        TextRenderer: TextRenderer,
        SpriteManager: SpriteManager,
        AnimatedSpriteRenderer: AnimatedSpriteRenderer,
    };
});