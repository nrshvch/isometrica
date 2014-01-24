define(function (require) {
    var engine = require("engine");

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
            var d = engine.glMatrix.vec3.subtract([], c, p);



            //console.log(p, engine.glMatrix.vec3.sqrLen(d));

            if (engine.glMatrix.vec3.sqrLen(d) > 1) {

                engine.glMatrix.vec3.normalize(d, d);
                engine.glMatrix.vec3.scale(d,d,2);

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
