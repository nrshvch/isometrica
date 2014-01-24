define(["engine"], function (engine) {
    function Tree() {
        engine.GameObject.call(this);

        var sprite = this.sprite = new engine.SpriteRenderer();
        sprite.layer = vkaria.layers.buildingsLayer;

        sprite.setSprite(vkaria.sprites.getSprite("cliff.png"));
        sprite.pivotX = 32;
        sprite.pivotY = 24;


        this.addComponent(sprite);

    }

    Tree.prototype = Object.create(engine.GameObject.prototype);

    return Tree;
});
