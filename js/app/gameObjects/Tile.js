define(function(require){
    var engine = require("engine");

    function Tile() {
        engine.GameObject.call(this, "tile");

        var renderer = new engine.SpriteRenderer();

        renderer.setPivot(32, 24);
        renderer.layer = vkaria.layers.groundLayer;

        this.addComponent(renderer);
    }

    Tile.prototype = Object.create(engine.GameObject.prototype);

    Tile.prototype.layer = 1;

    return Tile;
});
