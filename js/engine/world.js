/* TODO gameObject's components should be grouped in global groups
* that way same components would be accessible anytime & from one place
* TODO Tick should be event. Not method.
* TODO ..ooor we can create collection of updatable components right when GO is added, doing update == null check just once.
* TODO rename to "scene"
*/

define(function (require) {
    var Octree = require('./lib/Octree'),
        EventManager = require("lib/eventmanager");

    /**
     * @param {Logic} logic
     * @constructor
     */
    function World(logic, useOctree) {
        EventManager.call(this);

        this.logic = logic;
        this.gameObjects = [];

        if (useOctree === true)
            q = this.octree = new Octree(64,1000,45)

        this.removeQueue = [];
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
        //TODO check if gameObject is already present
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
    p.removeGameObject = function (gameObject) {
        //put GO's children in queue first, because they may be dependant on GO
        //therefore should be deleted first
        if (gameObject.transform.children.length !== 0) {
            for (var i = 0; i < gameObject.transform.children.length; i++) {
                var child = gameObject.transform.children[i].gameObject;
                this.removeGameObject(child);
            }
        }

        this.removeQueue.push(gameObject);
        this.removeQueueWaiting = true;
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
        return this.gameObjects.slice(0);
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

    p.tick = function (time) {
        var i,
            len = this.gameObjectsCount,
            gos = this.gameObjects;

        for (i = 0; i < len; i++)
            gos[i].tick(time);

        if (this.removeQueueWaiting) {
            var len = this.removeQueue.length,
                gameObject;

            for (i = 0; i < len; i++) {
                gameObject = this.removeQueue.pop();
                gameObject.transform.destroy(); //TODO: refactor this with event.
                this.gameObjects.splice(this.gameObjects.indexOf(gameObject), 1);
                this.gameObjectsCount--;

                //remove from tree
                if(this.octree !== null){
                    this.octree.remove(gameObject.item);
                }
            }

            this.removeQueueWaiting = false;
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