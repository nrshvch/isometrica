import engine from "engine/main";

/**
 * A short lived text that floats up from its spawn point and disappears,
 * the way construction costs pop up in Transport Tycoon.
 *
 * @param text {string}
 * @param color {string} any canvas fillStyle
 */
function EvaporatingTextScript(text, color) {
    this.text = text;
    this.color = color;
}

EvaporatingTextScript.prototype = Object.create(engine.Component.prototype);

EvaporatingTextScript.prototype.ttl = 1800;
//world units per second, same order of magnitude as the smoke particles
EvaporatingTextScript.prototype.speed = 16;
EvaporatingTextScript.prototype.startedAt = 0;

EvaporatingTextScript.prototype.start = function () {
    var textRenderer = this.gameObject.addComponent(new engine.TextRenderer());
    textRenderer.layer = vkaria.layers.overlayLayer;
    textRenderer.text = this.text;
    textRenderer.color = this.color;
    textRenderer.style = "bold 16px Courier New";
    textRenderer.strokeStyle = "black";
    textRenderer.lineWidth = 4;

    var time = this.gameObject.world.logic.time;
    this.startedAt = time.time;
}

EvaporatingTextScript.prototype.tick = function (time) {
    //time dependent, so the text floats at the same pace on any framerate
    this.gameObject.transform.translate(0, this.speed * time.dt / 1000, 0, "world");

    if (this.gameObject.world.logic.time.time - this.startedAt > this.ttl)
        this.gameObject.destroy();
}

export default EvaporatingTextScript;
