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
        this.slots = new Float64Array(0);
        this.stale = [];

        if (useOctree === true)
            q = this.octree = new Octree(64,1000,45)
    }

    /**
     * How many numbers each gameObject's slot takes, see p.slots
     * @type {number}
     */
    var SLOT_SIZE = World.SLOT_SIZE = 8;

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
     * How many of gameObjects' slots are empty. Taking a gameObject out only
     * empties its slot, and the list is closed up the next time it is read -
     * in the same order, which is the order the layers that are not depth
     * sorted are drawn in. A chunk of ground going with everything on it,
     * thousands at once, then costs one pass over the list rather than one
     * indexOf and splice each.
     * @private
     * @type {number}
     */
    p._holes = 0;

    /**
     * What the renderer culls by, kept flat so that it can go over every
     * gameObject there is without touching a single one of them: a slot of
     * SLOT_SIZE numbers per gameObject, the one at gameObjects[i] starting at
     * i * SLOT_SIZE. What is in a slot is the renderer's business (see
     * Canvas2dRenderer); the world only keeps the slots lined up with
     * gameObjects, and lists in p.stale the gameObjects whose slot has gone
     * out of date - see p.invalidate and p.refreshSlots.
     * @type {Float64Array}
     */
    p.slots = null;

    /**
     * gameObjects whose slot is out of date, p.staleCount of them; each one
     * has _staleIn set to this world while it is listed here
     * @type {GameObject[]}
     * @private
     */
    p.stale = null;

    /**
     * @type {number}
     * @private
     */
    p.staleCount = 0;

    /**
     * Array with gameObjects
     * @param {GameObject} gameObject
     */
    p.addGameObject = function (gameObject) {
        if (gameObject.world === this)
            return;

        gameObject._worldIndex = this.gameObjects.length;
        this.gameObjects.push(gameObject);
        this.gameObjectsCount++;
        gameObject.setWorld(this);

        reserveSlots(this, this.gameObjects.length);
        this.invalidate(gameObject);

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
        world.gameObjects[gameObject._worldIndex] = null;
        world._holes++;
        world.gameObjectsCount--;
        gameObject.world = null;

        if (world.octree !== null)
            world.octree.remove(gameObject.item);
    }

    function compact(world) {
        var gameObjects = world.gameObjects,
            slots = world.slots,
            len = gameObjects.length,
            gameObject, i, n, from, to, k;

        if (world._holes === 0)
            return;

        for (i = 0, n = 0; i < len; i++) {
            gameObject = gameObjects[i];
            if (gameObject !== null) {
                //its slot goes along with it
                if (n !== i) {
                    from = i * SLOT_SIZE;
                    to = n * SLOT_SIZE;
                    for (k = 0; k < SLOT_SIZE; k++)
                        slots[to + k] = slots[from + k];
                }

                gameObject._worldIndex = n;
                gameObjects[n++] = gameObject;
            }
        }

        gameObjects.length = n;
        world._holes = 0;
    }

    /**
     * Makes room in p.slots for count gameObjects - by half again as many, so
     * a world that keeps growing reallocates now and then, not every time.
     */
    function reserveSlots(world, count) {
        var slots;

        if (count * SLOT_SIZE <= world.slots.length)
            return;

        slots = new Float64Array(Math.max(count + (count >> 1), 1024) * SLOT_SIZE);
        slots.set(world.slots);
        world.slots = slots;
    }

    /**
     * Has the slot of gameObject, which is in this world, brought up to date
     * the next time p.refreshSlots runs. Whatever changes what the renderer
     * culls a gameObject by calls this: the gameObject coming into the world,
     * moving (see TransformComponent), getting or losing a component (see
     * GameObject#addComponent), a sprite changing its picture or pivot (see
     * SpriteRenderer).
     * @param {GameObject} gameObject
     */
    p.invalidate = function (gameObject) {
        if (gameObject._staleIn === this)
            return;

        gameObject._staleIn = this;
        this.stale[this.staleCount++] = gameObject;
    };

    /**
     * Calls refresh(slots, offset, gameObject) for every gameObject still in
     * the world whose slot went out of date since the last time - offset
     * being where that slot starts in slots - and forgets them.
     * @param {function(Float64Array, number, GameObject)} refresh
     */
    p.refreshSlots = function (refresh) {
        var stale = this.stale,
            count = this.staleCount,
            gameObject, i;

        compact(this);

        for (i = 0; i < count; i++) {
            gameObject = stale[i];
            stale[i] = null;

            //listed twice, or listed by another world since
            if (gameObject._staleIn !== this)
                continue;

            gameObject._staleIn = null;

            if (gameObject.world === this)
                refresh(this.slots, gameObject._worldIndex * SLOT_SIZE, gameObject);
        }

        this.staleCount = 0;
    };

    p.retrieve = function (gameObject) {
        compact(this);

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
        compact(this);

        for (var i = 0; i < this.gameObjects.length; i++) {
            if (this.gameObjects[i] !== null)
                this.gameObjects[i].awake();
        }
        this._awaken = true;
    };

    p.start = function () {
        compact(this);

        for (var i = 0; i < this.gameObjects.length; i++) {
            if (this.gameObjects[i] !== null)
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
        compact(this);

        var result = [],
            gameObjects = this.gameObjects,
            len = gameObjects.length,
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