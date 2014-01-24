define(["engine"], function (engine) {

    function Building(name) {
        engine.GameObject.call(this, name);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;

        renderer.setSprite(vkaria.sprites.getSprite("buildings/testbuilding2.png"));
        renderer.setPivot(32,21);

        var text = this.addComponent(new engine.TextRenderer());
        text.layer = vkaria.layers.overlayLayer;
        text.text = this.name;
        text.style = "normal 8pt arial";

        this.addComponent(renderer);

    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
