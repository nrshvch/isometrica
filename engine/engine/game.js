define(function (require) {
    var namespace = require("namespace");
    var Graphics = require("./graphics");
    var Time = require("./time");
    var Scene = require("./world");
    var Stats = require("./stats");

    var Engine = namespace("Isometrica.Engine");

    //what a frame takes: all of it, the world going on, and it drawn
    var FRAME = Stats.section("frame"),
        UPDATE = Stats.section("update"),
        RENDER = Stats.section("render");

    /**
     * @constructor
     */
    function Game() {
        this.scene = new Scene(this);
        this.graphics = new Graphics(this);
        this.time = new Time();

        this.logic = {world:this.scene};

        var self = this,
            time = this.time,
            scene = this.scene,
            graphics = this.graphics,
            last = -Infinity;

        this.tick = function(){
            //paused: the loop stops here, until resume starts it again
            if (self.paused) {
                self.running = false;
                return;
            }

            requestAnimFrame(self.tick);

            //at most fps frames a second, whatever the screen's rate - a
            //frame of it now and then comes a hair early, so a little is
            //allowed for
            var now = performance.now();

            if (now - last < 1000 / self.fps - SLACK && !self.uncapped)
                return;
            last = now;

            Stats.begin(FRAME);
            time.tick();
            Stats.begin(UPDATE);
            scene.tick(time);
            Stats.end(UPDATE);
            Stats.begin(RENDER);
            graphics.render();
            Stats.end(RENDER);
            Stats.end(FRAME);
            Stats.frame();
        }
    }

    //how many milliseconds early a frame may come and still be drawn
    var SLACK = 4;

    Engine.Game = Game;

    var p = Game.prototype;

    p.time = null;

    /**
     * @type {Logic}
     */
    p.scene = null;

    /**
     * @type {Graphics}
     */
    p.graphics = null;

    /**
     * @type {void}
     */
    p.run = function () {
        this.scene.run();
        this.graphics.start();
        this.running = true;
        this.tick();
    };

    /**
     * Whether the loop is held, and whether it is still going round - it
     * stops at its next turn once paused.
     * @type {boolean}
     */
    p.paused = false;
    p.running = false;

    /**
     * How many frames a second it is drawn at, at most - fewer to go easier
     * on a phone's battery while less is going on (the game's to say).
     * Whatever moves goes by the time gone, not by the frames, so it moves
     * as far in a second however many there are.
     * @type {number}
     */
    p.fps = 30;

    /**
     * Whether it is drawn as often as the screen is, rather than at most fps
     * frames a second - to see how much time a frame leaves (a debug panel's).
     * @type {boolean}
     */
    p.uncapped = false;

    /**
     * Holds the loop: nothing moves and nothing is drawn until resume -
     * for while the page is out of sight.
     */
    p.pause = function () {
        this.paused = true;
    };

    p.resume = function () {
        this.paused = false;

        if (!this.running) {
            this.running = true;
            this.tick();
        }
    };

    return Game;
});
