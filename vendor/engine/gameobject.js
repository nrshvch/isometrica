define(function (require) {
    var Transform = require("./components/transformcomponent");
    var namespace = require("namespace");
    namespace("Isometrica.Engine").GameObject = GameObject;

    function init(instance, name) {
        instance.instanceId = GameObject.prototype.instanceId++;
        instance.components = [];
        instance.transform = instance.addComponent(new Transform());

        instance.removeQueue = [];

        instance.name = name || "gameObject";
    }

    /**
     * Base object
     * @constructor
     */
    function GameObject(name) {
        init(this, name);
    }

    GameObject.init = init;

    var p = GameObject.prototype;


    p.hasUpdatableComponents = function () {
        var components = this.components,
            len = this.componentsCount,
            i;

        for (i = 0; i < len; i++)
            if (components[i].tick !== null)
                return true;

        return false;
    };

    p.getUpdatableComponents = function () {
        var components = this.components,
            component,
            len = this.componentsCount,
            i, result = [];

        for (i = 0; i < len; i++) {
            component = components[i];
            if (component.tick !== null)
                result.push[component];
        }

        return result;
    };

    p.updateSubscription = function () {
        if (this.world)
            if (this.hasUpdatableComponents()) {
                this.world.addEventListener(this.world.events.update, this.update);
            } else {
                this.world.removeEventListener(this.world.events.update, this.update);
            }
    };


    /**
     * @type {Number}
     */
    p.instanceId = 0;

    p._awaken = false;

    /**
     * If currently is started.
     * GameObject is started when game is run, or when gameObject is added in already running world.
     * @type {boolean}
     */
    p._started = false;

    /**
     * @type {string}
     */
    p.name = null;

    /**
     * Layer index
     * @type {int}
     */
    p.layer = 0;

    /**
     * Reference to world object
     * @public
     * @type {World}
     */
    p.world = null;

    /**
     * Transform component attached to this game object.
     * @type {Transform}
     */
    p.transform = null;

    /**
     * @type {Component[]}
     */
    p.components = null;

    /**
     * @type {number}
     */
    p.componentsCount = 0;

    /**
     * @private
     * @type {[]}
     */
    p.removeQueue = null;

    /**
     * @private
     * @type {boolean}
     */
    p.removeQueueWaiting = false;

    /**
     * Runs once, before start
     */
    p.awake = function () {
        var cmp, i;
        for (i = 0; i < this.componentsCount; i++) {
            cmp = this.components[i];

            if (cmp.awake !== null)
                cmp.awake();
        }
        this._awaken = true;
    };

    /**
     * Runs when game starts
     */
    p.start = function () {
        var cmp, i;
        for (i = 0; i < this.componentsCount; i++) {
            cmp = this.components[i];

            if (cmp.start !== null)
                cmp.start();
        }
        this._started = true;
    };

    /**
     * @param {World} world
     */
    p.setWorld = function (world) {
        this.world = world;

        //this.updateSubscription();
    };

    /**
     * @public
     * @param {Component} component
     * @return {*}
     */
    p.addComponent = function (component) {
        this.components[this.componentsCount++] = component;

        component.setGameObject(this);

        this._started && component.start !== null && component.start();

        //this.updateSubscription();

        return component;
    };

    p.removeComponent = function (component) {
        component.unsetGameObject();
        this.removeQueue.push(component);
        this.removeQueueWaiting = true;

        //this.updateSubscription();
    };

    /**
     * Method will return component of type of given constructor function
     * @param {function} Type
     * @returns {*}
     */
    p.getComponent = function (Type) {
        for (var i = 0; i < this.components.length; i++) {
            var component = this.components[i];
            if (component instanceof Type)
                return component;
        }
        return null;
    };

    p.tick = function (time) {
        var components = this.components,
            component,
            len = this.componentsCount,
            i;

        for (i = 0; i < len; i++) {
            component = components[i];
            if (component.tick !== null)
                component.tick(time);
            //(component.tick || dummy)(time); //this sometimes is faster because its one property request less
        }

        if (this.removeQueueWaiting) {
            var len = this.removeQueue.length;

            for (i = 0; i < len; i++) {
                this.components.splice(this.components.indexOf(this.removeQueue.pop()), 1);
                this.componentsCount--;
            }

            this.removeQueueWaiting = false;
        }
    }

    p.destroy = function () {
        this.world.removeGameObject(this);
        this.world = null;
    }

    return GameObject;
});