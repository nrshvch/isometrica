define(function () {

    function Event() {
        this.idMap = {};
        this.idMetaMap = {};
        this.listeners = [];
    }

    Event.prototype.lastListenerId = 0;
    Event.prototype.listeners = null;
    Event.prototype.idMap = null;

    Event.prototype.addListener = function (listener, meta) {
        var id = this.lastListenerId++;
        this.idMap[id] = listener;
        this.idMetaMap[id] = meta;
        this.listeners.push(id);
        return id;
    };

    Event.prototype.removeListener = function (listenerOrId) {
        var listener = null, id = -1;

        if (typeof listenerOrId === "function") {
            listener = listenerOrId;
            for (id in this.idMap) {
                if (this.idMap[id] === listener)
                    break;
            }
        } else {
            id = listenerOrId;
            listener = this.idMap[id];
        }

        if (listener !== null && id !== -1) {
            delete this.idMap[id];
            delete this.idMetaMap[id];
            var index = this.listeners.indexOf(id);
            if (index !== -1) {
                this.listeners[index] = undefined;
            }
            return true;
        }

        return false;
    };

    Event.prototype.fire = function (sender, args) {
        var i = 0, l = this.listeners.length,
            listeners = this.listeners,
            idMap = this.idMap,
            idMetaMap = this.idMetaMap,
            listener, callback, meta,
            cleanUp = false;

        for (i = 0; i < l; i++) {
            listener = listeners[i];

            if(listener !== undefined){
                callback = idMap[listener];
                meta = idMetaMap[listener];
                callback(sender, args, meta);
            }else{
                cleanUp = true;
            }
        }

        if(cleanUp){
            for (i = l - 1; i !== -1; i--)
                if (listeners[i] === undefined)
                    listeners.splice(i, 1);
        }
    };

    var Events = {
        /**
         * Subscribe to event of a given object
         * @param obj {object}
         * @param event {string|number} Event id
         * @param callback {function}
         * @param meta {object} Data that will be passed to callback
         * @returns {number} Subscription id
         */
        subscribe: function (obj, event, callback, meta) {
            if (obj._events === undefined)
                obj._events = {};

            if (obj._events[event] === undefined)
                obj._events[event] = new Event();

            return obj._events[event].addListener(callback, meta);
        },
        /**
         * Unsubscribe from event of a given object
         * @param obj {object}
         * @param event {string|number} Event id
         * @param idOrListener {number|function} Subscription id or handler
         * @returns {boolean}
         */
        unsubscribe: function (obj, event, idOrListener) {
            if (obj._events !== undefined && obj._events[event] !== undefined) {
                return obj._events[event].removeListener(idOrListener);
            }
            return false;
        },
        /**
         * Dispatch an event of a given object
         * @param obj {object}
         * @param event {string|number} Event id
         * @param sender {object} Sender argument that will be passed to callback
         * @param args {object} Event arguments that will be passed to callback
         */
        fire: function (obj, event, sender, args) {
            if (obj._events !== undefined && obj._events[event] !== undefined) {
                obj._events[event].fire(sender, args);
            }
        }
    };

    return Events;
});
