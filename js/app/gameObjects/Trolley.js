define(function (require) {
    var engine = require("engine"),
        TrolleyScript = require("../components/entity"),
        SmokeSource = require("../components/smokesource");

    function Trolley() {
        engine.GameObject.call(this);

        var sprite = this.sprite = new engine.SpriteRenderer();
        sprite.layer = 2;

        sprite.setSprite(vkaria.sprites.getSprite("car1.png"));
        sprite.pivotX = 8;
        sprite.pivotY = 8;


        this.addComponent(sprite);
        this.entity = this.addComponent(new TrolleyScript);


        var g = new engine.GameObject();
        this.transform.addChild(g.transform);
        g.transform.setLocalPosition(0,0,0);
        g.addComponent(new SmokeSource());
    }
    Trolley.prototype = Object.create(engine.GameObject.prototype);

    return Trolley;
});
