define(function (require) {
    var engine = require("engine"),
        SmokeSource = require("../../components/smokesource");

    function Building() {
        engine.GameObject.call(this);

        var g0 = new engine.GameObject(),
            g1 = new engine.GameObject();

        //g0
        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;
        renderer.setSprite(vkaria.sprites.getSprite("buildings/house4-1.png"));
        renderer.setPivot(32,28);
        g0.addComponent(renderer);

        //g1
        var renderer = this.sprite = new engine.SpriteRenderer();
        renderer.layer = vkaria.layers.buildingsLayer;
        renderer.setSprite(vkaria.sprites.getSprite("buildings/house4-2.png"));
        renderer.setPivot(32,41);
        g1.addComponent(renderer);

        g1.transform.setLocalPosition(0,0,vkaria.config.tileSize);

        this.transform.addChild(g0.transform);
        this.transform.addChild(g1.transform);
    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;
});

