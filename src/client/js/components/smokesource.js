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
    this.gameObject.transform.getPosition(vec3Buffer);
    SmokeSourceScript.puff(this.gameObject.world, vec3Buffer[0], vec3Buffer[1], vec3Buffer[2]);
};

/**
 * Lets out one puff of smoke at that point in the world, to rise and fade
 * there - for whatever smokes on its own schedule rather than with a
 * SmokeSource on it, like a car.
 */
SmokeSourceScript.puff = function (world, x, y, z) {
    var smoke = getSmoke();
    smoke.transform.setPosition(x, y, z);
    world.addGameObject(smoke);
};


export default SmokeSourceScript;
