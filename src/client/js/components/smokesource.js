import engine from "engine/main";
import SmokeScript from "./smokeScript";

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

/**
 * @param building {Building} optional - the house the chimney is on. A house
 *                            nobody has moved into, for want of a street or of
 *                            water, has no fire going; with no building given
 *                            (a trolley) it smokes regardless.
 */
function SmokeSourceScript(building) {
    engine.Component.call(this);
    this.building = building || null;
};

var vec3Buffer = new Float32Array(3);

SmokeSourceScript.prototype = Object.create(engine.Component.prototype);

SmokeSourceScript.prototype.start = function () {
    this.time = this.gameObject.world.logic.time.now;
};

SmokeSourceScript.prototype.tick = function (time) {
    if(time.now - this.time > 300){
        if (isLit(this.building))
            this.spawnSmoke();
        this.time = time.now;
    }
};

function isLit(building) {
    if (building === null)
        return true;

    var city = building.getCity();

    return city !== null && city.missing(building) === null;
}

SmokeSourceScript.prototype.spawnSmoke = function(){
    var smoke = getSmoke();
    this.gameObject.transform.getPosition(vec3Buffer);
    smoke.transform.setPosition(vec3Buffer[0], vec3Buffer[1], vec3Buffer[2]);
    this.gameObject.world.addGameObject(smoke);
};


export default SmokeSourceScript;
