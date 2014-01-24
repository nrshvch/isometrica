//TODO время изучения и прогресс должны хранится в таком формате, чтобы можно было бзе проблем начать изучать из сэйвгэйма

define(function (require) {
    var BuildingCode = require('lib/buildingcode'),
        BuildingClassCode = require("lib/buildingclasscode"),
        BuildingData = require('lib/buildingdata'),
        EventManager = require("lib/eventmanager"),
        ResearchState = require("lib/researchstate"),
        ResearchData = require("lib/researchdata"),
        ResearchDirection = require("lib/researchdirection");

    function Lab(world) {
        EventManager.call(this);

        this.events = {
            researchComplete: 0,
            researchUpdate: 1,
            researchStart: 2,
            buildingInvented: 3
        };

        this.world = world;

        this.dirData = {};

        this.dirData[ResearchDirection.municipal] = {
            level: 0,
            direction: ResearchDirection.municipal,
            state: ResearchState.available,
            progress: 0,
            time: 10000
        };

        this.dirData[ResearchDirection.housing] = {
            level: 0,
            direction: ResearchDirection.housing,
            state: ResearchState.available,
            progress: 0,
            time: 10000
        };

        this.dirData[ResearchDirection.commerce] = {
            level: 0,
            direction: ResearchDirection.commerce,
            state: ResearchState.available,
            progress: 0,
            time: 10000
        };

        this.dirData[ResearchDirection.industry] = {
            level: 0,
            direction: ResearchDirection.industry,
            state: ResearchState.available,
            progress: 0,
            time: 10000
        };

        this.researchedItems = [];

        this._openItems(ResearchDirection.municipal, 0, true);
        this._openItems(ResearchDirection.housing, 0, true);
        this._openItems(ResearchDirection.commerce, 0, true);
        this._openItems(ResearchDirection.industry, 0, true);

        this.queue = [];
    }

    Lab.prototype = Object.create(EventManager.prototype);

    Lab.prototype._research = function (direction, progress) {
        progress = progress || 0;
        var research = this.dirData[direction];

        research.state = ResearchState.running;
        research.startTime = this.world.now;
        research.endTime = this.world.now + ( research.time * (1 - progress) );

        this.queue.push(research);
    };

    Lab.prototype.research = function (direction) {
        var research = this.dirData[direction];

        if (research.state === ResearchState.available) {
            this._research(direction);
            this.dispatchEvent(this.events.researchStart, this, research);
        } else if (research.state === ResearchState.running) {
            throw "Research is already going on!";
            //} else if (research.state === ResearchState.finished) {
            //  throw "Research is already complete!";
        } else if (research.state === ResearchState.unavailable) {
            throw "Research is unavailable!";
        }
    };

    Lab.prototype.tick = function (now) {
        if (this.queue.length !== 0) {
            for (var i = 0, l = this.queue.length, research; i < l; i++) {
                research = this.queue[i];

                if (research.endTime <= now) {
                    research.state = ResearchState.available;
                    research.level++;
                    research.progress = 0;
                    research.time = Math.pow(2, research.level) * 10000;


                    //remove from queue.
                    this.queue.splice(i, 1);

                    //as we've modified the array we're iterating, we need to update i and l loop variables
                    i--;
                    l--;

                    this.dispatchEvent(this.events.researchComplete, this, research);

                    this._openItems(research.direction, research.level);
                }else{
                    research.progress = 1 - ((research.endTime - now) / research.time);
                }
            }
        }
    };

    Lab.prototype._openItems = function (direction, level, quiet) {
        quiet = quiet || false;
        var data = ResearchData[direction];
        var items = data.levelItems[level];

        for (var key in items) {
            this.researchedItems.push(items[key]);
            quiet || this.dispatchEvent(this.events.buildingInvented, this, {
                buildingCode: items[key]
            });
        }
    };

    Lab.prototype.getAvailableBuildings = function () {
        return this.researchedItems.slice(0);
    };

    //TODO this should return some serialized data
    Lab.prototype.getResearchData = function () {
        return this.dirData;
    };

    //TODO fix saves for new lab
    //TODO FIX save/load building subposition
    Lab.prototype.save = function () {
        var save = this.dirData;
        return save;
    };

    Lab.prototype.load = function (data) {
        for (var dir in ResearchDirection) {
            var m = data[dir];

            if (m.level !== 0) {
                for (var i = 1; i <= m.level; i++) {
                    this._openItems(dir, i, true);
                }
            }

            if (m.state === ResearchState.running) {
                this._research(m.level + 1, m.progress);
            }
        }
    };

    return Lab;
});
