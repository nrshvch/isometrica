define(["engine", '../components/TileScript'], function (engine, TileScript) {
    function Tile(x, y) {
        engine.GameObject.call(this, "tile");

        var renderer = new engine.SpriteRenderer();

        renderer.setPivot(32, 24);
        renderer.layer = vkaria.layers.groundLayer;

        this.addComponent(renderer);
        this.addComponent(new TileScript(x, y));
    }

    Tile.prototype = Object.create(engine.GameObject.prototype);

    return Tile;
});
