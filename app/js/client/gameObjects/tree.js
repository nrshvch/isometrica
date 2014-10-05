/**
 * Created by denis on 9/18/14.
 */
define(function (require) {
    var Engine = require("engine");
    var GameObject = Engine.GameObject;
    var RenderLayer = require("../renderlayer");
    var SpriteRenderer = Engine.SpriteRenderer;

    var layer = RenderLayer.buildingsLayer;
    var renderer = null;

    function Tree() {
        GameObject.init(this, "tree");
        renderer = new SpriteRenderer();
        renderer.layer = layer;
        this.addComponent(renderer);
    }

    Tree.prototype = Object.create(GameObject.prototype);

    return Tree;
});