define(['engine/main'], function (engine) {
    function SmokeScript() {
        engine.Component.call(this);
    }

    SmokeScript.prototype = Object.create(engine.Component.prototype);

    SmokeScript.prototype.ttl = 1600;
    SmokeScript.prototype.startedAt = 0;
    SmokeScript.prototype.spriten = 0;

    SmokeScript.prototype.start = function () {
        var sprite = this.gameObject.addComponent(new engine.SpriteRenderer());
        sprite.layer = vkaria.layers.buildingsLayer;

        //sprite.setSprite(vkaria.sprites.getSprite(SmokeScript.sprites[Math.round(Math.random()*2)]));
        sprite.setSprite(vkaria.sprites.getSprite("smoke.png"));
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
            this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("smoke2.png"));
            this.spriten = 2;
        }else if(this.spriten == 0 && dtime > this.ttl * 1/3){
            this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("smoke1.png"));
            this.spriten = 1;
        }

        if (dtime > this.ttl)
            this.gameObject.destroy();
    }

    return SmokeScript;
})
