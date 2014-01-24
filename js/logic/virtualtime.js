define(function (require) {
    var EventManager = require("lib/eventmanager");

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

    function VirtualTime() {
        this.now = 0;

        this.day = 1;
        this.year = 1;
        this.month = 1;
        this.monthName = monthNames[0];
        this.daysInYear = 365;

        this.eventManager = new EventManager();
        this.events = {
            newDay: 0,
            newMonth: 1,
            newYear: 2
        };

        this.prevMonth = 0;
        this.prevYear = 0;
    }

    VirtualTime.prototype.start = function(){
      this.eventManager.dispatchEvent(this.events.newYear, this);
      this.eventManager.dispatchEvent(this.events.newMonth, this);
      this.eventManager.dispatchEvent(this.events.newDay, this);
    };

    VirtualTime.prototype.setTime = function(now){
        this.now = now;
        this.eventManager.dispatchEvent(this.events.newYear, this);
        this.eventManager.dispatchEvent(this.events.newMonth, this);
        this.eventManager.dispatchEvent(this.events.newDay, this);
    };

    //is supposed to be runned once in a second
    VirtualTime.prototype.tick = function () {
        this.advance();
    };

    VirtualTime.prototype.advance = function () {
        this.now += millisecondsInDay;

        var date = new Date(this.now);

        this.year = date.getFullYear() - 1969;
        this.month = date.getMonth() + 1;
        this.monthName = monthNames[this.month - 1];
        this.day = date.getDate();

        this.eventManager.dispatchEvent(this.events.newDay, this);

        if(this.month !== this.prevMonth){
            this.eventManager.dispatchEvent(this.events.newMonth, this);
            this.prevMonth = this.month;
        }

        if(this.year !== this.prevYear){
            this.eventManager.dispatchEvent(this.events.newYear, this);
            this.prevYear = this.year;
            this.daysInYear = daysInYear(this.year);
        }
    };

    VirtualTime.prototype.toString = function(){
        return "D" + this.day + "M" + this.month + "Y" + this.year;
    };

    VirtualTime.prototype.save = function(){
        return this.now;
    };

    VirtualTime.prototype.load = function(now){
        this.setTime(now);
        return true;
    };

    return VirtualTime;
});
