define(["./world"], function (World) {

    function Logic() {
        window.world = this.world = new World();
        this.now = Date.now();
    }

    //TODO TICK method could be replaced with tick event, it would save time spent on iterating over items that don't need tick
    Logic.prototype.tick = function (now) {
        var dt = now - this.now;

        if (dt >= 1000) {
            this.now += 1000;
            this.world.tick(this.now);
        }
    };

    return Logic;
});
