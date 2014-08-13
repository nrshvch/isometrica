define(["engine"], function (engine) {
    function Building(sizeX, sizeY) {
        engine.GameObject.call(this);

        var self = this;


            for (var x = 0; x < sizeX; x++) {
                for (var y = 0; y < sizeY; y++) {

                    var part = new engine.GameObject(),
                        sprite = new engine.SpriteRenderer();

                    sprite.layer = 1;
                    sprite.setSprite(vkaria.sprites.getSprite("site.png")).setPivot(32,24);

                    part.addComponent(sprite);
                    self.transform.addChild(part.transform);
                    part.transform.translate(x * engine.config.tileSize, 0, y * engine.config.tileSize);
                }
            }


    }

    Building.prototype = Object.create(engine.GameObject.prototype);

    return Building;


});
