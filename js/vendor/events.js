define(function () {

    var lastId = 0;
    //subscriptions
    var subs = {};

    /**
     * Subscribe to event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param callback {function}
     * @param meta {object} Data that will be passed to callback
     * @returns {number} Subscription id
     */
    function addListener(obj, eventType, listener, meta) {
        if (obj._events === undefined)
            obj._events = {};

        if (obj._events[eventType] === undefined)
            obj._events[eventType] = [];

        var event = obj._events[eventType];

        if (typeof listener !== "function")
            throw "Event handler should be a function";

        var id = lastId++;
        subs[id] = {
            listener: listener,
            meta: meta
        };
        event.push(id);
        return id;
    }

    /**
     * Unsubscribe from event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param idOrListener {number|function} Subscription id or handler
     * @returns {boolean}
     */
    function removeListener(obj, eventType, listenerOrId) {
        if(obj._events === undefined || obj._events[eventType] === undefined)
            return false;

        var event = obj._events[eventType];

        var id = -1;

        if (typeof listenerOrId === "function") {
            for(var i = 0, l = event.length; i < l; i++){
                id = event[i];
                if (id !== undefined && subs[id].listener === listenerOrId) {
                    break;
                }
            }
        } else {
            id = listenerOrId;
        }

        if (id !== -1) {
            delete subs[id];
            var index = event.indexOf(id);
            if (index !== -1) {
                event[index] = undefined;
            }
            return true;
        }

        return false;
    }

    /**
     * Dispatch an event of a given object
     * @param obj {object}
     * @param event {string|number} Event id
     * @param sender {object} Sender argument that will be passed to callback
     * @param args {object} Event arguments that will be passed to callback
     */
    function fire(obj, eventType, args) {
        if(obj._events === undefined || obj._events[eventType] === undefined)
            return;

        var listeners = obj._events[eventType];

        var i, l = listeners.length,
            id, subscription,
            cleanUp = false;

        for (i = 0; i < l; i++) {
            id = listeners[i];

            if (id !== undefined) {
                subscription = subs[id];
                subscription.listener(obj, args, subscription.meta);
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

    var Events = EventEmmiter;
    Events.EventEmmiter = EventEmmiter;

    Events.addListener = Events.on = addListener;

    Events.removeListener = Events.off = removeListener;

    Events.emit = Events.fire = fire;

    /**
     * @deprecated
     * @type {addListener|*}
     */
    Events.subscribe = Events.on;
    /**
     * @deprecated
     * @type {removeListener|*}
     */
    Events.unsubscribe = Events.off;

    function EventEmmiter(){}

    EventEmmiter.prototype.addEventListener = EventEmmiter.prototype.addListener = function(event, listener, meta){
        return addListener(this, event, listener, meta);
    };

    EventEmmiter.prototype.removeEventListener = EventEmmiter.prototype.removeListener = function(event, listenerOrId){
        return removeListener(this, event, listenerOrId);
    };

    EventEmmiter.prototype.dispatchEvent = EventEmmiter.prototype.emit = function(event, args){
        return fire(this, event, args);
    };

    window.Events = Events;

    return Events;
});
