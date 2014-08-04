define(function (require) {
    var engine = require("engine");
    var glMatrix = require("../vendor/gl-matrix");

    function Component() {
        engine.Component.call(this);
    }

    Component.prototype = Object.create(engine.Component.prototype);

    Component.prototype.path = null;
    Component.prototype.currentTarget = null;

    Component.prototype.setPath = function (path) {
        this.path = path;
        this.currentTarget = 0;

  ///      console.log("Next target:", this.path[this.currentTarget]);
    };

    Component.prototype.tick = function () {
        if (this.path) {

            var c = this.path[this.currentTarget];
            var p = this.gameObject.transform.getPosition();
            var d = glMatrix.vec3.subtract([], c, p);

            var dir0 = d[0],
                dir1 = d[2];
                           //console.log(dir0, dir1);
            if(dir0 > 0)
                this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("trolley0.png"));
            else if(dir0 < 0)
                this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("trolley2.png"));
            else if(dir1 > 0)
                this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("trolley3.png"));
            else if(dir1 < 0)
                this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("trolley1.png"));

            //console.log(p, engine.glMatrix.vec3.sqrLen(d));

            if (glMatrix.vec3.sqrLen(d) > 1) {

                glMatrix.vec3.normalize(d, d);
                glMatrix.vec3.scale(d,d,2);

                this.gameObject.transform.translate(d[0], d[1], d[2], "world");
            } else {
                if (this.currentTarget < this.path.length - 1){
                    this.currentTarget++
//                    console.log("Next target:", this.path[this.currentTarget]);
                }else{
                    this.gameObject.destroy();
                }
            }
        }
    };

    return Component;
});
