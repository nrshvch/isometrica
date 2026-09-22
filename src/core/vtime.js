import Events from "events";

//The clock the city runs on: one tick of the world is one hour. Nothing keeps
//a date any more - the game only ever shows the time of day - so this counts
//hours and says which one of the day it is now.
var millisecondsInHour = 3600000,
    hoursInDay = 24;

    function VTime(world) {
        this.now = 0;

        this.hour = 0;
        this.day = 1;

        Events.subscribe(world, world.events.tick, function(sender, args, self){
            self.tick();
        },this);
    }

    var events = VTime.events = VTime.prototype.events = {
        advance: 3,
        newDay: 0
    };

    //how much game time one tick of the world is worth
    VTime.millisecondsPerTick = millisecondsInHour;

    VTime.prototype.constructor = VTime;

    VTime.prototype.start = function(){
        Events.fire(this,this.events.newDay, this.now);
    };

    VTime.prototype.setTime = function(now){
        this.now = now;
        this.hour = Math.floor(now / millisecondsInHour) % hoursInDay;
        this.day = Math.floor(now / (millisecondsInHour * hoursInDay)) + 1;
        Events.fire(this,this.events.newDay, this.now);
    };

    //is supposed to be runned once in a second
    VTime.prototype.tick = function () {
        this.advance();
    };

    VTime.prototype.advance = function () {
        this.now += millisecondsInHour;
        this.hour = (this.hour + 1) % hoursInDay;

        Events.fire(this,this.events.advance, this);

        if(this.hour === 0){
            this.day++;
            Events.fire(this,this.events.newDay, this.now);
        }
    };

    VTime.prototype.toString = function(){
        return this.toHM();
    };

    /**
     * The time of day, as it is shown: "00:00" to "23:00".
     */
    VTime.prototype.toHM = function(){
        return (this.hour < 10 ? "0" : "") + this.hour + ":00";
    };

    VTime.prototype.save = function(){
        return this.now;
    };

    VTime.prototype.load = function(now){
        this.setTime(now);
        return true;
    };

export default VTime;
