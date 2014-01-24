define(function (require) {
    var engine = require("engine");

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.overlayLayer;

        renderer.setSprite(vkaria.sprites.getSprite("water_tower.png"));
        renderer.pivotX = 18;
        renderer.pivotY = 64;
        //renderer.setPivot(32,23);

        this.addComponent(renderer);
    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
