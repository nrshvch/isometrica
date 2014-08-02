//TODO think about making research based on direction, instead of researching individual buildings

define(function (require) {
    var BuildingCode = require('lib/buildingcode'),
        BuildingData = require('lib/buildingdata'),
        EventManager = require("lib/eventmanager"),
        ResearchState = require("lib/researchstate");

    function BuildingResearch(world) {
        EventManager.call(this);

        this.events = {
            researchComplete: 0,
            researchUpdate: 1,
            researchStart: 2
        };

        this.world = world;

        this.info = {};

        for(var key in BuildingCode){
            var index = BuildingCode[key];
            this.info[index] = {
                buildingCode: index,
                buildingKey: key,
                state: BuildingData[index].researchState || ResearchState.unavailable,
                startTime: 0,
                time: BuildingData[index].researchTime || 3000
            };
        }

        this.queue = [];
    }

    BuildingResearch.prototype = Object.create(EventManager.prototype);

    BuildingResearch.prototype.research = function(buildingCode){
        var item = this.info[buildingCode];
        if(item.state === ResearchState.available){
            var research = this.info[buildingCode];
            research.state = ResearchState.running;
            research.startTime = this.world.now;
            this.queue.push(research);
            this.dispatchEvent(this.events.researchUpdate, this.info[buildingCode]);
            this.dispatchEvent(this.events.researchStart, this.info[buildingCode]);
            return true;
        }
        return false;
    };

    BuildingResearch.prototype.getInfo = function(buildingCode){
        return this.info[buildingCode];
    };

    BuildingResearch.prototype.tick = function(now){
        if(this.queue.length !== 0){
            for(var i = 0, l = this.queue.length, research; i < l; i++){
                research = this.queue[i];

                if(research.startTime + research.time <= now){
                    research.state = ResearchState.finished;

                    //remove from queue.
                    this.queue.splice(i, 1);

                    //as we've modified the array we're iterating, we need to update i and l loop variables
                    i--;
                    l--;

                    this.dispatchEvent(this.events.researchComplete, this.info[research.buildingCode]);
                }
            }
        }
    };

    //TODO FIX save/load building subposition
    BuildingResearch.prototype.save = function(){
        var save = {};
        for(var key in this.info){
            save[key] = {
                buildingCode: this.info[key].buildingCode,
                buildingKey: key,
                state: this.info[key].state
            }
        }
        return save;
    };

    BuildingResearch.prototype.load = function(data){
        for(var key in data){
            var item = data[key];
            this.info[key].buildingCode = item.buildingCode;
            this.info[key].buildingKey = item.buildingKey;
            this.info[key].state = item.state;
        }
    };

    return BuildingResearch;
});
