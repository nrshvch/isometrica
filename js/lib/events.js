define(function () {

    function Event() {
        this.idMap = {};
        this.idMetaMap = {};
        this.listeners = [];
    }

    Event.prototype.lastListenerId = 0;
    Event.prototype.listeners = null;
    Event.prototype.idMap = null;

    function addListener (event, listener, meta) {
        var id = event.lastListenerId++;
        event.idMap[id] = listener;
        event.idMetaMap[id] = meta;
        event.listeners.push(id);
        return id;
    }

    function removeListener (event, listenerOrId) {
        var listener = null, id = -1;

        if (typeof listenerOrId === "function") {
            listener = listenerOrId;
            for (id in event.idMap) {
                if (event.idMap[id] === listener){
                    id = parseInt(id, 10);
                    break;
                }
            }
        } else {
            id = listenerOrId;
            listener = event.idMap[id];
        }

        if (listener !== null && id !== -1) {
            delete event.idMap[id];
            delete event.idMetaMap[id];
            var index = event.listeners.indexOf(id);
            if (index !== -1) {
                event.listeners[index] = undefined;
            }
            return true;
        }

        return false;
    }

    function fire (event, sender, args) {
        var i = 0, l = event.listeners.length,
            listeners = event.listeners,
            idMap = event.idMap,
            idMetaMap = event.idMetaMap,
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
    }

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

            return addListener(obj._events[event], callback, meta);
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
                return removeListener(obj._events[event], idOrListener);
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
                fire(obj._events[event], sender, args);
            }
        },
        fireAsync: function (obj, event, sender, args){
            if (obj._events !== undefined && obj._events[event] !== undefined) {
                setTimeout(function(){
                    fire(obj._events[event], sender, args);
                },0);
            }
        }
    };

    return Events;
});
