/* TODO gameObject's components should be grouped in global groups
* that way same components would be accessible anytime & from one place
* TODO Tick should be event. Not method.
* TODO rename to "scene"
*/

define(function (require) {
    var Octree = require('./lib/octree'),
        EventManager = require("events");

    /**
     * @param {Logic} logic
     * @constructor
     */
    function World(logic, useOctree) {
        EventManager.call(this);

        this.logic = logic;
        this.gameObjects = [];
        this.tickers = [];

        if (useOctree === true)
            q = this.octree = new Octree(64,1000,45)
    }

    var p = World.prototype = Object.create(EventManager.prototype);

    p.events = {
        awake: 0,
        start: 1,
        update: 2
    }

    /**
     * @type {Logic}
     */
    p.logic = null;

    /**
     * Reference to octree which will be used to partition space of the world
     * @type {null}
     * @private
     */
    p.octree = null;

    /**
     * @type {GameObject[]}
     * @private
     */
    p.gameObjects = null;

    /**
     * @type {number}
     * @private
     */
    p.gameObjectsCount = 0;

    /**
     * Flat, precomputed list of gameObjects that currently have at least one
     * tickable component. Kept up to date via registerTicker/unregisterTicker
     * (see GameObject#updateSubscription) so p.tick() never has to call into
     * -- or check components of -- gameObjects that do nothing every frame.
     * @type {GameObject[]}
     * @private
     */
    p.tickers = null;

    /**
     * @type {number}
     * @private
     */
    p.tickersCount = 0;

    /**
     * Index in tickers of the gameObject being ticked right now, or -1 outside
     * of p.tick(). Lets unregisterTicker() keep the loop from skipping anybody
     * when a gameObject goes mid-tick.
     * @private
     * @type {number}
     */
    p._tickCursor = -1;

    /**
     * @private
     * @type {boolean}
     */
    p._started = false;

    p._awaken = false;

    /**
     * Array with gameObjects
     * @param {GameObject} gameObject
     */
    p.addGameObject = function (gameObject) {
        if (gameObject.world === this)
            return;

        this.gameObjects[this.gameObjectsCount++] = gameObject;
        gameObject.setWorld(this);

        if (this.octree !== null) {
            var pos = gameObject.transform.getPosition();

                var item = new Octree.Item(pos[0], pos[1], pos[2]);

                gameObject.item = item;
                item.gameObject = gameObject;


                this.octree.insert(item);
                var octree = this.octree;
                gameObject.transform.addEventListener(gameObject.transform.events.update, function (transform) {
                    octree.remove(item);
                    var p = transform.getPosition();
                    item.x = p[0];
                    item.y = p[1];
                    item.z = p[2];
                    octree.insert(item);
                });
        }

        if(this._awaken)
            gameObject.awake();

        if (this._started)
            gameObject.start();

        if (gameObject.transform.children.length !== 0) {
            for (var i = 0; i < gameObject.transform.children.length; i++) {
                var child = gameObject.transform.children[i].gameObject;
                this.addGameObject(child);
            }
        }
    };

    /**
     * Puts game object in queue to remove.
     * Game object will be removed at the end of tick
     * @param {GameObject} gameObject
     */
    /**
     * Takes the gameObject out of the world there and then, children and all:
     * it is neither ticked nor drawn from now on, and it can be added again
     * straight away - an object pool may hand it back out within the same
     * tick. It lets go of whatever it hangs on; its own children stay on it,
     * and come back with it if it is added again. Removing one that is not in
     * the world does nothing.
     *
     * @param {GameObject} gameObject
     */
    p.removeGameObject = function (gameObject) {
        if (gameObject.world !== this)
            return;

        take(this, gameObject);
        gameObject.transform.destroy();
    };

    function take(world, gameObject) {
        var children = gameObject.transform.children,
            child, i;

        //children first, because they may be dependant on GO
        for (i = 0; i < children.length; i++) {
            child = children[i].gameObject;

            if (child.world === world)
                take(world, child);
        }

        world.unregisterTicker(gameObject);
        world.gameObjects.splice(world.gameObjects.indexOf(gameObject), 1);
        world.gameObjectsCount--;
        gameObject.world = null;

        if (world.octree !== null)
            world.octree.remove(gameObject.item);
    }

    p.retrieve = function (gameObject) {
        if (this.octree !== null) {
            var items = this.octree.retrieve(gameObject.item);
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                items[i] = item.gameObject;
            }
            return items;
        }
        return this.gameObjects;//.slice(0); //slice(0) pollutes heap and does a sawtooth with GC
    };

    p.run = function(){
        this.awake();
        this.start();
    };

    /**
     * Runs awake methods of all components.
     * NOTICE! If some gameObject or component are being added in awake,
     * it will be pushed at the end of gameObject or componet array and it's awake method
     * will be called from the same loop.
     */
    p.awake = function(){
        for (var i = 0; i < this.gameObjectsCount; i++) {
            this.gameObjects[i].awake();
        }
        this._awaken = true;
    };

    p.start = function () {
        for (var i = 0; i < this.gameObjectsCount; i++) {
            this.gameObjects[i].start();
        }
        this._started = true;
    };

    /**
     * Registers a gameObject to receive tick() calls. No-op if it's already
     * registered.
     * @param {GameObject} gameObject
     */
    p.registerTicker = function (gameObject) {
        if (gameObject._tickerIndex !== undefined)
            return;

        gameObject._tickerIndex = this.tickersCount;
        this.tickers[this.tickersCount++] = gameObject;
    };

    /**
     * Unregisters a gameObject from tick() calls. No-op if it isn't
     * registered. Swaps the last entry into the freed slot so removal stays
     * O(1) instead of an indexOf + splice.
     *
     * Mid-tick, the ones up to the cursor have had their turn and the rest
     * have not, and a swap must not mix them up: a gap at or before the cursor
     * is first moved onto it - the one ticking now takes the gap - and the
     * cursor steps back, so the last entry swapped in there still gets its
     * turn.
     * @param {GameObject} gameObject
     */
    p.unregisterTicker = function (gameObject) {
        var idx = gameObject._tickerIndex,
            tickers = this.tickers,
            cursor = this._tickCursor,
            moved, last;

        if (idx === undefined)
            return;

        if (idx < cursor) {
            moved = tickers[cursor];
            tickers[idx] = moved;
            moved._tickerIndex = idx;
            idx = cursor;
        }

        if (idx <= cursor)
            this._tickCursor--;

        last = tickers.pop();
        if (idx < tickers.length) {
            tickers[idx] = last;
            last._tickerIndex = idx;
        }
        this.tickersCount--;

        gameObject._tickerIndex = undefined;
    };

    p.tick = function (time) {
        var tickers = this.tickers;

        // tickersCount is read fresh every iteration (not cached) because a
        // gameObject can unregister itself -- or another gameObject -- from
        // within its own tick(), which shrinks this list in place; the cursor
        // is a field so that unregisterTicker() can move it back when it does.
        try {
            for (this._tickCursor = 0; this._tickCursor < this.tickersCount; this._tickCursor++)
                tickers[this._tickCursor].tick(time);
        } finally {
            this._tickCursor = -1;
        }
    };

    p.findByName = function (name) {
        var result = [],
            gameObjects = this.gameObjects,
            len = this.gameObjectsCount,
            gameObject,
            i;

        for (i = 0; i < len; i++) {
            gameObject = gameObjects[i];
            if (gameObject.name === name) {
                result.push(gameObject);
            }
        }

        if (result.length === 1)
            return result[0];
        else if (result.length > 1)
            return result;
        else
            return false;
    }

    return World;
});