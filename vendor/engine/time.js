define(function () {
    /**
     * @constructor
     */
    function Time() {
        // real (wall-clock) timestamp of the last tick, used only to measure dt
        this._lastReal = Date.now();
        this.now = Date.now();
    }

    var p = Time.prototype;

    /**
     * milliseconds since start
     * @type {Number}
     */
    p.time = 0;

    /**
     * @type {Number}
     */
    p.now = 0;

    /**
     * milliseconds elapsed since the previous tick, measured against the
     * wall clock so speeds stay the same regardless of frame rate
     * @type {Number}
     */
    p.dt = 0;

    // Cap a single tick's elapsed time so a stalled tab (backgrounded,
    // debugger paused, ...) doesn't dump one huge dt on resume and make
    // everything jump.
    var MAX_DT = 200;

    p.tick = function(){
        var real = Date.now();
        this.dt = Math.min(real - this._lastReal, MAX_DT);
        this._lastReal = real;

        this.time += this.dt;
        this.now += this.dt;
    };

    return Time;
});