// events - entry point
// Exposes the raw API from ./events wrapped in an EventEmmiter-compatible
// facade, because different eras of the code built on this package used
// different styles of managing events. Both the engine and its consumers
// require this facade under the bare id "events".
define(function (require) {
    var RawEvents = require("./events");

    function EventEmmiter() {
    }

    EventEmmiter.event = RawEvents.event;
    EventEmmiter.EventEmmiter = EventEmmiter;
    EventEmmiter.addListener = EventEmmiter.on = RawEvents.on;
    EventEmmiter.once = RawEvents.once;
    EventEmmiter.removeListener = EventEmmiter.off = RawEvents.off;
    EventEmmiter.emit = EventEmmiter.fire = RawEvents.fire;
    /** @deprecated */
    EventEmmiter.subscribe = RawEvents.on;
    /** @deprecated */
    EventEmmiter.unsubscribe = RawEvents.off;

    EventEmmiter.prototype.addEventListener = EventEmmiter.prototype.addListener = function (event, listener, meta) {
        return RawEvents.on(this, event, listener, meta);
    };

    EventEmmiter.prototype.removeEventListener = EventEmmiter.prototype.removeListener = function (event, listenerOrId) {
        return RawEvents.off(this, event, listenerOrId);
    };

    EventEmmiter.prototype.dispatchEvent = EventEmmiter.prototype.emit = function (event, args) {
        return RawEvents.fire(this, event, args);
    };

    EventEmmiter.prototype.once = function (event, listener, meta) {
        return RawEvents.on(this, event, listener, meta, true);
    };

    return EventEmmiter;
});
