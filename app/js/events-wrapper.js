//This wrapper is neccessary in order to provide compatibility across all my code, because at different times I've used different approaches of managing events
define(function (require) {
    var Events = require("vendor/events");

    function EventEmmiter() {
    }

    EventEmmiter.event = Events.event;

    EventEmmiter.EventEmmiter = EventEmmiter;

    EventEmmiter.addListener = EventEmmiter.on = Events.on;

    EventEmmiter.once = EventEmmiter.once = Events.once;

    EventEmmiter.removeListener = EventEmmiter.off = Events.off;

    EventEmmiter.emit = EventEmmiter.fire = Events.fire;

    /**
     * @deprecated
     * @type {addListener|*}
     */
    EventEmmiter.subscribe = Events.on;
    /**
     * @deprecated
     * @type {removeListener|*}
     */
    EventEmmiter.unsubscribe = Events.off;

    EventEmmiter.prototype.addEventListener = EventEmmiter.prototype.addListener = function (event, listener, meta) {
        return Events.on(this, event, listener, meta);
    };

    EventEmmiter.prototype.removeEventListener = EventEmmiter.prototype.removeListener = function (event, listenerOrId) {
        return Events.off(this, event, listenerOrId);
    };

    EventEmmiter.prototype.dispatchEvent = EventEmmiter.prototype.emit = function (event, args) {
        return Events.fire(this, event, args);
    };

    EventEmmiter.prototype.once = function (event, listener, meta) {
        return Events.on(this, event, listener, meta, true);
    };

    return window.Events = EventEmmiter;
});