//TODO время изучения и прогресс должны хранится в таком формате, чтобы можно было бзе проблем начать изучать из сэйвгэйма

define(function (require) {
    var Events = require("events"),
        ResearchState = require("../researchstate"),
        Direction = require("../researchdirection"),
        BuildingData = require("data/buildings"),
        VTime = require("../vtime");

    var namespace = require("namespace");
    var CityService = namespace("Isometrica.Core.CityService");
    CityService.Laboratory = Lab;

    var DirectionData = {};
    DirectionData[Direction.municipal] = {
        time: 10000,
        cost: 100,
        items: []
    };
    DirectionData[Direction.housing] = {
        time: 10000,
        cost: 100,
        items: []
    };
    DirectionData[Direction.industry] = {
        time: 10000,
        cost: 100,
        items: []
    };
    DirectionData[Direction.commerce] = {
        time: 10000,
        cost: 100,
        items: []
    };

    for (var code in BuildingData) {
        var b = BuildingData[code];
        var dir = b.researchDirection || Direction.municipal;
        var lvl = b.researchLevel || 0;
        var a = DirectionData[dir];
        var b = a.items[lvl] || (a.items[lvl] = []);

        b.push(parseInt(code, 10));
    }

    function openItems(self, direction, level, quiet) {
        quiet = quiet || false;
        var data = DirectionData[direction];
        if (data === undefined || data.items === undefined || data.items[level] === undefined)
            return false;

        var items = data.items[level], isNew;

        for (var key in items) {
            isNew = self.researchedItems[key] !== true;

            if (isNew) {
                self.researchedItems[key] = true;

                quiet || Events.fire(self, events.buildingInvented, parseInt(key, 10));
            }
        }
    }

    var events = {
        researchComplete: 0,
        researchUpdate: 1,
        researchStart: 2,
        buildingInvented: 3
    };

    function Lab(city) {
        this.world = city.world;
        this.city = city;

        this.dirData = {};

        this.dirData[Direction.municipal] = {
            level: 0,
            direction: Direction.municipal,
            state: ResearchState.available,
        };

        this.dirData[Direction.housing] = {
            level: 0,
            direction: Direction.housing,
            state: ResearchState.available,
        };

        this.dirData[Direction.commerce] = {
            level: 0,
            direction: Direction.commerce,
            state: ResearchState.available,
        };

        this.dirData[Direction.industry] = {
            level: 0,
            direction: Direction.industry,
            state: ResearchState.available,
        };

        this.researchedItems = [];

        openItems(this, Direction.municipal, 0, true);
        openItems(this, Direction.housing, 0, true);
        openItems(this, Direction.commerce, 0, true);
        openItems(this, Direction.industry, 0, true);
    }

    Lab.events = events;

    Lab.prototype.research = function (direction) {
        var research = this.dirData[direction];
        var data = DirectionData[direction];

        if (research.state === ResearchState.available) {
            research(this, direction);
        } else if (research.state === ResearchState.running) {
            //throw "Research is already going on!";
        } else if (research.state === ResearchState.unavailable) {
            //throw "Research is unavailable!";
        }

        var lvl = research.level + 1;
        var time = lvl * data.time;
        var cost = lvl * data.cost;

        research.state = ResearchState.running;
        research.startTime = Date.now();
        research.endTime = research.startTime + time;

        this.city.resourcesService.subMoney(cost);

        var self = this;

        setTimeout(function () {
            research.state = ResearchState.available;
            research.level = lvl;

            openItems(self, direction, lvl);
        }, time);
    };

    Lab.prototype.getAvailableBuildings = function () {
        return this.researchedItems;
    };

    Lab.prototype.getResearchProgress = function (direction) {
        var research = this.dirData[direction];
        var time = research.endTime - research.startTime;
        return (Date.now() - research.startTime) / time;
    };

    Lab.prototype.getResearchData = function () {
        return this.dirData;
    };

    return Lab;
});
