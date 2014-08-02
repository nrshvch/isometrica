define(function (require) {
    var Events = require("lib/events");

    function EventManager() {
        //this.eventListeners = [];
    }

    var p = EventManager.prototype;

    p.eventListeners = null;

    p.addEventListener = function (eventCode, callback) {
        return Events.subscribe(this, eventCode, callback, null);
    }

    p.dispatchEvent = function (eventCode, eventArgs) {
        Events.fire(this, eventCode, eventArgs);
    }

    p.removeEventListener = function (eventCode, callback) {
        return Events.unsubscribe(this, eventCode, callback);
    }

    return EventManager;
});
