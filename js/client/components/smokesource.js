define(function (require) {
    var engine = require("engine");
    var SmokeScript = require("./smokeScript");

    var pool = [];

    var killSmoke = function(){
        this.world.removeGameObject(this);
        pool.push(this);
    }

    var getSmoke = function(){
        if(pool.length>0)
            return pool.pop();
        else{
            var smoke = new engine.GameObject(),
                script = new SmokeScript();
            smoke.addComponent(script);
            smoke.smoke = script;
            smoke.destroy = killSmoke;
            return smoke;
        }
    };

    function SmokeSourceScript() {
        engine.Component.call(this);
    };

    var vec3Buffer = new Float32Array(3);

    SmokeSourceScript.prototype = Object.create(engine.Component.prototype);

    SmokeSourceScript.prototype.start = function () {
        this.time = this.gameObject.world.logic.time.now;
    };

    SmokeSourceScript.prototype.tick = function (time) {
        if(time.now - this.time > 300){
            this.spawnSmoke();
            this.time = time.now;
        }
    };

    SmokeSourceScript.prototype.spawnSmoke = function(){
        var smoke = getSmoke();
        this.gameObject.transform.getPosition(vec3Buffer);
        smoke.transform.setPosition(vec3Buffer[0], vec3Buffer[1], vec3Buffer[2]);
        this.gameObject.world.addGameObject(smoke);
    };


    return SmokeSourceScript;
});
