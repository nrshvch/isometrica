import engine from "engine/main";

function SmokeScript() {
    engine.Component.call(this);
}

SmokeScript.prototype = Object.create(engine.Component.prototype);

SmokeScript.prototype.ttl = 1600;
SmokeScript.prototype.startedAt = 0;
SmokeScript.prototype.spriten = 0;

//white, out of a chimney
SmokeScript.steam = ["smoke.png", "smoke1.png", "smoke2.png"];

//black, out of an engine on fire - greyer and thinner the higher it gets
SmokeScript.soot = ["smoke/soot0.png", "smoke/soot1.png", "smoke/soot2.png"];

//what the puff looks like as it rises, one picture after another
SmokeScript.prototype.looks = SmokeScript.steam;

//runs every time the puff is put back into the world out of the pool, and
//only the first time gives it something to be drawn with
SmokeScript.prototype.start = function () {
    var sprite = this.gameObject.spriteRenderer;

    if (sprite === undefined) {
        sprite = this.gameObject.addComponent(new engine.SpriteRenderer());
        sprite.layer = vkaria.layers.buildingsLayer;
    }

    //sprite.setSprite(vkaria.sprites.getSprite(SmokeScript.sprites[Math.round(Math.random()*2)]));
    sprite.setSprite(vkaria.sprites.getSprite(this.looks[0]));
    sprite.setPivot(4,4);

    this.spriten = 0;

    var time = this.gameObject.world.logic.time;
    this.startedAt = time.time;
}

SmokeScript.prototype.tick = function (time) {
    var d = time.dt/1000;
    this.gameObject.transform.translate(Math.random()*d,20*d, Math.random()*d, "world");

    var dtime = this.gameObject.world.logic.time.time - this.startedAt;

    if(this.spriten == 1 && dtime > this.ttl * 2/3){
        this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(this.looks[2]));
        this.spriten = 2;
    }else if(this.spriten == 0 && dtime > this.ttl * 1/3){
        this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(this.looks[1]));
        this.spriten = 1;
    }

    if (dtime > this.ttl)
        this.gameObject.destroy();
}

export default SmokeScript;
