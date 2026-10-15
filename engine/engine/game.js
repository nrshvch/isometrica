define(function (require) {
    var namespace = require("namespace");
    var Graphics = require("./graphics");
    var Time = require("./time");
    var Scene = require("./world");

    var Engine = namespace("Isometrica.Engine");

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

            //at most FPS frames a second, whatever the screen's rate - a
            //frame of it now and then comes a hair early, so a little is
            //allowed for
            var now = performance.now();

            if (now - last < 1000 / FPS - SLACK)
                return;
            last = now;

            time.tick();
            scene.tick(time);
            graphics.render();
        }
    }

    //how many frames a second the game is drawn at, at most - and how many
    //milliseconds early a frame may come and still be drawn
    var FPS = 30,
        SLACK = 4;

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
