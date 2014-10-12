define(function (require) {
    var Events = require("events");

    var millisecondsInDay = 86400000,
        monthNames = [ "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December" ];

    function daysInYear(year) {
        if(year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
            // Leap year
            return 366;
        } else {
            // Not a leap year
            return 365;
        }
    }

    function VTime(world) {
        this.now = 0;

        this.day = 1;
        this.year = 1;
        this.month = 1;
        this.monthName = monthNames[0];
        this.daysInYear = 365;

        this.prevMonth = 0;
        this.prevYear = 0;

        Events.subscribe(world, world.events.tick, function(sender, args, self){
            self.tick();
        },this);
    }

    var events = VTime.events = VTime.prototype.events = {
        advance: 3,
        newDay: 0,
        newMonth: 1,
        newYear: 2
    };

    VTime.prototype.start = function(){
        Events.fire(this,this.events.newYear, this.now);
        Events.fire(this,this.events.newMonth, this.now);
        Events.fire(this,this.events.newDay, this.now);
    };

    VTime.prototype.setTime = function(now){
        this.now = now;
        Events.fire(this,this.events.newYear, this.now);
        Events.fire(this,this.events.newMonth, this.now);
        Events.fire(this,this.events.newDay, this.now);
    };

    //is supposed to be runned once in a second
    VTime.prototype.tick = function () {
        this.advance();
    };

    VTime.prototype.advance = function () {
        this.now += millisecondsInDay;

        var date = new Date(this.now);

        this.year = date.getFullYear() - 1969;
        this.month = date.getMonth() + 1;
        this.monthName = monthNames[this.month - 1];
        this.day = date.getDate();

        Events.fire(this,this.events.advance, this);

        Events.fire(this,this.events.newDay, this.now);

        if(this.month !== this.prevMonth){
            Events.fire(this,this.events.newMonth, this.now);
            this.prevMonth = this.month;
        }

        if(this.year !== this.prevYear){
            Events.fire(this,this.events.newYear, this.now);
            this.prevYear = this.year;
            this.daysInYear = daysInYear(this.year);
        }
    };

    VTime.prototype.toString = function(){
        return "D" + this.day + "M" + this.month + "Y" + this.year;
    };

    VTime.prototype.save = function(){
        return this.now;
    };

    VTime.prototype.load = function(now){
        this.setTime(now);
        return true;
    };

    return VTime;
});
