define(["engine"], function (engine) {

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = 1;

        renderer.setSprite(vkaria.sprites.getSprite("bridge/1.png"));
        renderer.setPivot(32,24);

        this.addComponent(renderer);

    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
