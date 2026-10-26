define(function (require) {
    var namespace = require("namespace");
    var EventManager = require("events");

    namespace("Isometrica.Engine").Component = Component;

    /**
     * @constructor
     */
    function Component() {}

    var p = Component.prototype = Object.create(EventManager.prototype);

    /**
     * @type {GameObject}
     * @read-only
     */
    p.gameObject = null;

    p.enabled = true;

    p.setGameObject = function(gameObject){
        this.gameObject = gameObject;
    };

    p.unsetGameObject = function(){
        this.gameObject = null;
    };

    /**
     * Runs before any start
     * @type {function}
     */
    p.awake = null;

    /**
     * Runs when game starts
     */
    p.start = null;

    /**
     * Runs on every game logic tick
     * @type {function}
     */
    p.tick = null;

    /**
     * What the time it ticks is put down to in a debug panel (World tick,
     * Stats), all of its kind together - or null for its gameObject's name
     * @type {string}
     */
    p.profileName = null;

    return Component;
});