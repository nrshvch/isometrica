define(['engine'], function (engine) {
    function EvaporatingTextScript(text, color) {
        this.text = text;
        this.color = color;
    }

    EvaporatingTextScript.prototype = Object.create(engine.Component.prototype);

    EvaporatingTextScript.prototype.ttl = 1400;
    EvaporatingTextScript.prototype.startedAt = 0;

    EvaporatingTextScript.prototype.start = function () {
        var textRenderer = this.gameObject.addComponent(new engine.TextRenderer());
        textRenderer.layer = vkaria.layers.overlayLayer;
        textRenderer.text = this.text;
        textRenderer.color = this.color;
        textRenderer.style = "bold 12px arial";

        var time = this.gameObject.world.logic.time;
        this.startedAt = time.time;
    }

    EvaporatingTextScript.prototype.tick = function () {
        this.gameObject.transform.translate(Math.random(), 1, Math.random(), "world");

        if (this.gameObject.world.logic.time.time - this.startedAt > this.ttl)
            this.gameObject.destroy();
    }

    return EvaporatingTextScript;
})
