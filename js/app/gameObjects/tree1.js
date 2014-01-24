define(["engine"], function (engine) {
    function Tree() {
        engine.GameObject.call(this);

        var sprite = this.sprite = new engine.SpriteRenderer();
        sprite.layer = vkaria.layers.buildingsLayer;

        sprite.setSprite(vkaria.sprites.getSprite("tree1.png"));
        sprite.pivotX = 34;
        sprite.pivotY = 53;


        this.addComponent(sprite);

    }

    Tree.prototype = Object.create(engine.GameObject.prototype);

    return Tree;
});
