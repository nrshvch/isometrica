define(function (require) {
    var engine = require("engine"),
        SmokeSource = require("../../components/smokesource");

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;

        renderer.setSprite(vkaria.sprites.getSprite("buildings/house1.png"));
        renderer.setPivot(27,23);

        this.addComponent(renderer);
    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});

