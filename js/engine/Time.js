define(function () {
    /**
     * @constructor
     */
    function Time() {
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
     * @type {Number}
     */
    p.dt = 60;

    return Time;
});