define(function (require) {
    var engine = require("engine");

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = 1;

        renderer.setSprite(vkaria.sprites.getSprite("house_s_2.png"));
        renderer.pivotX = 32;
        renderer.pivotY = 32;
        //renderer.setPivot(32,23);

        this.addComponent(renderer);
    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
