define(function(require) {
    var Time = require("./time"),
        World = require("./world"),
        config = require("./config");

    /**
     * @param {Game} game
     * @constructor
     */
    function Logic(game) {
        this.game = game;
        this.time = new Time();
        this.world = new World(this, config.useOctree || false);
    }

    var p = Logic.prototype;

    /**
     * @type {Game}
     */
    p.game = null;

    /**
     * The scene
     * @type {null}
     */
    p.world = null;

    /**
     * @type {Time}
     */
    p.time = null;

    p.start = function () {
        this.world.awake();
        this.world.start();
    };

    /**
     * @return {void}
     */
    p.tick = function () {
        var now = Date.now(), i = 0;
        var frameTime = now - this.time.now,
            dtime, dt = this.time.dt;

        while (frameTime >= dt) {
            frameTime -= dt;
            this.time.now += dt;
            this.time.time += dt;
            this.world.tick(this.time);

            if (i++ > 200) {
                break;
            }
        }
    };

    return Logic;
});