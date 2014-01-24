define(function (require) {
    var engine = require("engine"),
        SmokeSource = require("../components/smokesource");

    function Building() {
        engine.GameObject.call(this);

        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;

        renderer.setSprite(vkaria.sprites.getSprite("house_s_1.png"));
        renderer.pivotX = 32;
        renderer.pivotY = 23;
        //renderer.setPivot(32,23);

        this.addComponent(renderer);


        var g = new engine.GameObject();
        this.transform.addChild(g.transform);
        g.transform.setLocalPosition(0,20,0);
        g.addComponent(new SmokeSource());


    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});
