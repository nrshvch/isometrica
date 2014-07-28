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

    p.tick = function(){
        this.time += this.dt;
        this.now += this.dt;
    };

    return Time;
});