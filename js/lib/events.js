define(function () {

    function Event() {
        this.idMap = {};
        this.listeners = [];
    }

    Event.prototype.lastListenerId = 0;
    Event.prototype.listeners = null;
    Event.prototype.idMap = null;

    function addListener(event, listener, meta) {
        if (typeof listener !== "function")
            throw "Event handler should be a function";

        var id = event.lastListenerId++;
        event.idMap[id] = {
            listener: listener,
            meta: meta
        };
        event.listeners.push(id);
        return id;
    }

    function removeListener(event, listenerOrId) {
        var id = -1;

        if (typeof listenerOrId === "function") {
            for (id in event.idMap) {
                if (event.idMap[id].listener === listenerOrId) {
                    id = parseInt(id, 10);
                    break;
                }
            }
        } else {
            id = listenerOrId;
        }

        if (id !== -1) {
            delete event.idMap[id];
            var index = event.listeners.indexOf(id);
            if (index !== -1) {
                event.listeners[index] = undefined;
            }
            return true;
        }

        return false;
    }

    function fire(event, sender, args) {
        var i, l = event.listeners.length,
            listeners = event.listeners,
            idMap = event.idMap,
            listener, callback, meta,
            cleanUp = false;

        for (i = 0; i < l; i++) {
            listener = listeners[i];

            if (listener !== undefined) {
                callback = idMap[listener].listener;
                meta = idMap[listener].meta;
                callback(sender, args, meta);
            } else {
                cleanUp = true;
            }
        }

        if (cleanUp) {
            for (i = l - 1; i !== -1; i--)
                if (listeners[i] === undefined)
                    listeners.splice(i, 1);
        }
    }

    var Events = {}

    /**
     * @deprecated
     * Subscribe to event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param callback {function}
     * @param meta {object} Data that will be passed to callback
     * @returns {number} Subscription id
     */
    Events.subscribe = function (obj, event, callback, meta) {
        if (obj._events === undefined)
            obj._events = {};

        if (obj._events[event] === undefined)
            obj._events[event] = new Event();

        return addListener(obj._events[event], callback, meta);
    };

    /**
     * @deprecated
     * Unsubscribe from event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param idOrListener {number|function} Subscription id or handler
     * @returns {boolean}
     */
    Events.unsubscribe = function (obj, event, idOrListener) {
        if (obj._events !== undefined && obj._events[event] !== undefined) {
            return removeListener(obj._events[event], idOrListener);
        }
        return false;
    };

    /**
     * @deprecated
     * Dispatch an event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param sender {object} Sender argument that will be passed to callback
     * @param args {object} Event arguments that will be passed to callback
     */
    Events.fire = function (obj, event, args) {
        if (obj._events !== undefined && obj._events[event] !== undefined) {
            fire(obj._events[event], obj, args);
        }
    };

    Events.on = Events.subscribe;
    Events.addListener = Events.subscribe;
    Events.removeListener = Events.unsubscribe;
    Events.emit = Events.fire;

    return Events;
});
