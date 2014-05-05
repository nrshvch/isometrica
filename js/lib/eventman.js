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
                this.listeners.splice(index, 1);
            }
            return true;
        }

        return false;
    };
    //TODO: manage situations when listener remove self
    Event.prototype.fire = function (sender, args) {
        var i = 0, l = this.listeners.length, listeners = this.listeners;

        for (i = 0; i < l; i++) {
            var listener = listeners[i];
            var callback = this.idMap[listener];
            var meta = this.idMetaMap[listener];
            callback(sender, args, meta);
        }
    };

    var Eventman = {
        addListener: function (obj, event, callback, meta) {
            if (obj._events === undefined)
                obj._events = {};

            if (obj._events[event] === undefined)
                obj._events[event] = new Event();

            return obj._events[event].addListener(callback, meta);
        },
        removeListener: function(obj, event, idOrListener){
            if(obj._events !== undefined && obj._events[event] !== undefined){
                return obj._events[event].removeListener(idOrListener);
            }
            return false;
        },
        dispatchEvent: function (obj, event, sender, args) {
            if(obj._events !== undefined && obj._events[event] !== undefined){
                obj._events[event].fire(sender, args);
            }
        }
    };

    return Eventman;
});
