define(["./Logic", "./Graphics"], function (Logic, Graphics) {
    /**
     * @constructor
     */
    function Game() {
        this.logic = new Logic(this);
        this.graphics = new Graphics(this);

        var self = this,
            logic = this.logic,
            graphics = this.graphics;

        this.tick = function(){
            logic.tick();
            graphics.render();

            requestAnimFrame(self.tick);
        }
    }

    var p = Game.prototype;

    /**
     * @type {Logic}
     */
    p.logic = null;

    /**
     * @type {Graphics}
     */
    p.graphics = null;

    /**
     * @type {void}
     */
    p.run = function () {
        this.logic.start();
        this.graphics.start();
        this.tick();
    }

    p.rafHandler = null;

    /**
     * @type {void}
     */
    //p.mainLoop =

    return Game;
});
