define(function () {
    function EventManager() {
        this.eventListeners = [];
    }

    var p = EventManager.prototype;

    p.eventListeners = null;

    p.addEventListener = function (eventCode, callback) {
        var listeners = this.eventListeners[eventCode];

        if (listeners !== undefined)
            listeners[listeners.length] = callback;
        else
            listeners = [callback];

        this.eventListeners[eventCode] = listeners;
    }

    p.dispatchEvent = function (eventCode, sender, eventArgs) {
        var listeners = this.eventListeners[eventCode],
            listenersNumber;

        if (listeners === undefined || (listenersNumber = listeners.length) === 0)
            return;

        //if listener removes itself while this loop is still running
        //it can cause problems because of array being reindexed.
        //As far as listener removing only itself, the backward iteration should avoid that problems.
        //But we should count with possibility that one handler could remove other handler of same event.
        var cleanUp = false;

        for (var i = 0, listener; i < listenersNumber; i++) {
            listener = listeners[i];
            if (listener !== undefined)
                listener(eventArgs);
            else
                cleanUp = true;
        }

        if (cleanUp)
            for (var i = listenersNumber - 1; i !== -1; i--)
                if (listeners[i] === undefined)
                    listeners.splice(i, 1);
    }

    p.removeEventListener = function (eventCode, callback) {
        //this.eventListeners[eventCode].splice(this.eventListeners[eventCode].indexOf(callback), 1);
        if(this.eventListeners[eventCode]){
            this.eventListeners[eventCode][this.eventListeners[eventCode].indexOf(callback)] = undefined;
            return true;
        }

        return false;
    }

    return EventManager;
});
