define(function (require) {
    var engine = require("engine");

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;

        renderer.setSprite(vkaria.sprites.getSprite("buildings/cityhall.png"));
        renderer.setPivot(32,46);

        this.addComponent(renderer);
    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
