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
            graphics = this.graphics;

        this.tick = function(){
            requestAnimFrame(self.tick);

            time.tick();
            scene.tick(time);
            graphics.render();
        }
    }

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
        this.tick();
    };

    return Game;
});
