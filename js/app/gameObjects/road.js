define(["engine"], function (engine) {

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.roadLayer;

        renderer.setSprite(vkaria.sprites.getSprite("road/x1.png"));
        renderer.setPivot(32,24);

        this.addComponent(renderer);

    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
