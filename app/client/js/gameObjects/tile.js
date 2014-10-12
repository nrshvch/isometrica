define(function(require){
    var engine = require("engine/main");
    var GameObject = engine.GameObject;
    var SpriteRenderer = engine.SpriteRenderer;
    var RenderLayer = require("../renderlayer");
    var layer = RenderLayer.groundLayer;

    var renderer = null;

    function Tile() {
        GameObject.init(this, "tile");

        renderer = new SpriteRenderer();

        renderer.setPivot(32, 24);
        renderer.layer = layer;

        this.addComponent(renderer);
    }

    Tile.prototype = Object.create(GameObject.prototype);

    //Tile.prototype.layer = 1;

    return Tile;
});
