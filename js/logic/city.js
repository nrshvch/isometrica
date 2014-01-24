//TODO add resource market
//TODO add city population. Population growth should raise the need of housing, that way stimulating player to continue city building.
//TODO what about culture? This would make a purpose to build "special" buildings, like churches, museums.

define(function (require) {
    var validator = require('./lib/validator'),
        BuildingCode = require('lib/buildingcode'),
        buildingData = require('lib/buildingdata'),
        Resources = require('lib/resources'),
        EventManager = require('lib/eventmanager'),
        BuildingResearch = require("./buildingresearch"),
        Building = require("./building"),
        Laboratory = require("./laboratory"),
        ResearchState = require("lib/researchstate");

    var resourceBuffer1 = Resources.create(),
        resourceBuffer2 = Resources.create(),
        resourceBuffer3 = Resources.create(),
        resourceBuffer4 = Resources.create(),
        dateBuffer1 = new Date(),
        dateBuffer2 = new Date;

    function City(world) {
        EventManager.call(this);

        this.events = {
            update: 0
        };

        this.timeEstablished = world.time.milliseconds;

        this.world = world;
        this.buildings = [];

        this.buildingByClass = [];
        for (var key in BuildingCode) {
            this.buildingByClass[BuildingCode[key]] = [];
        }

        this.resources = Resources.create({
            money: 999000,
            wood: 50,
            food: 50,
            stone: 50,
            iron: 50,
            coal: 50,
            electricity: 50,
            oil: 50,
            gas: 50,
            water: 50
        });

        this.resourceDemand = Resources.create();
        this.resourceProduce = Resources.create();
        this.maintenanceCost = Resources.create();

        this.laboratory = new BuildingResearch(this.world);
        this.lab = new Laboratory(this.world);

        var time = world.time;
        this.resources2 = Resources.clone(this.resources);
        var self = this;
        time.eventManager.addEventListener(time.events.newMonth, function (sender, args) {
            Resources.sub(self.resources2, self.resources, self.resources2)
            self.resources2 = Resources.copy(self.resources2, self.resources);
        });


        var self = this;
        this.onBuildingRemoved = function (building) {
            var index = self.buildings.indexOf(building);
            if (index >= 0) {
                self.buildings.splice(index, 1);

                if (building.constructor.buildingCode === BuildingCode.cityHall) {
                    self.cityHall = null;
                }
            }
        };

        this.world.buildings.addEventListener(this.world.buildings.events.buildingRemoved, this.onBuildingRemoved);
    }

    City.prototype = Object.create(EventManager.prototype);

    City.prototype.name = "";
    City.prototype.cityHall = null;
    City.prototype.buildings = null;
    City.prototype.position = null;

    City.prototype.setPosition = function(tile){
        this.position = tile;
    };

    City.prototype.setName = function(name){
        this.name = name;
    };

    City.prototype.addMoney = function (amount) {
        if (validator.isNumber(amount)) {
            this.resources[Resources.ResourceCode.money] += amount;
            this.dispatchEvent(this.events.update, this);
            return true;
        }
        return false;
    };

    City.prototype.subMoney = function (amount) {
        if (validator.isNumber(amount, 0, this.resources[Resources.ResourceCode.money])) {
            this.resources[Resources.ResourceCode.money] -= amount;
            this.dispatchEvent(this.events.update, this);
            return true;
        }
        return false;
    };

    City.prototype.subResources = function (resources) {
        Resources.sub(this.resources, this.resources, resources);
        this.dispatchEvent(this.events.update, this);
    };

    City.prototype.addResources = function (resources) {
        Resources.add(this.resources, this.resources, resources);
        this.dispatchEvent(this.events.update, this);
    };

    City.prototype.tick = function (now) {
        this.lab.tick(now);

        var now = this.world.time.now,
            dateNow = dateBuffer1,
            dateThen = dateBuffer2;

        dateNow.setTime(now);

        Resources.copy(this.resourceDemand, Resources.zero);
        Resources.copy(this.resourceProduce, Resources.zero);
        Resources.copy(this.maintenanceCost, Resources.zero);

        for (var i = 0; i < this.buildings.length; i++) {
            var building = this.buildings[i];
            building.tick();

            var produced = building.produce(),
                demand = building.demand();

            Resources.add(this.resources, this.resources, produced);
            Resources.sub(this.resources, this.resources, demand);

            Resources.add(this.resourceDemand, this.resourceDemand, demand);
            Resources.add(this.resourceProduce, this.resourceProduce, produced);


            //building maintenance cost
            //After 10 years of building exploitation it starts to require maintenance costs.
            //Max.maintenance cost per year is 25% of building construction cost.
            //Maintenance cost starts from 1% and raises to max in 50 years, after maintenance started.
            dateThen.setTime(building.createdAt);
            var dYear = dateNow.getYear() - dateThen.getYear() - 10,
                percent;

            if (dYear > 0) {
                if (dYear <= 50) {
                    percent = 25 * dYear / 50;
                } else if (dYear > 50) {
                    percent = 25;
                }

                //amount of resources to take, daily
                var n = (percent / 100) / this.world.time.daysInYear;

                Resources.mul(resourceBuffer1, building.data.constructionCost, n);
                Resources.add(this.maintenanceCost, this.maintenanceCost, resourceBuffer1);
            }

        }
        Resources.sub(this.resources, this.resources, this.maintenanceCost);
        this.dispatchEvent(this.events.update, this);
    };

    City.prototype.clearTile = function (x, y) {
        var tile = this.world.tiles.get(x, y);
        tile.clear();
        this.subMoney(1);
        return true;
    };

    City.prototype.build = function (buildingCode, baseTile, rotate) {
        if (buildingCode === BuildingCode.cityHall && this.cityHall !== null)
            throw "Only one city hall is allowed!";

        var BuildingType = buildingData[buildingCode],
            data = BuildingType,
            availableBuildingList = this.lab.getAvailableBuildings();

        if (availableBuildingList.indexOf(buildingCode) === -1)
            throw "You can't build this!";

        var resources = this.resources,
            enoughResources = Resources.every(data.constructionCost, function (element, index) {
                if(element === 0)
                    return true;
                else
                    return element <= resources[index];
            });



        //if (BuildingType.price <= this.resources[Resources.ResourceCode.money]) {
        if (enoughResources) {
            var building = this.world.buildings.build(buildingCode, baseTile.x, baseTile.y, rotate);

            this.subResources(data.constructionCost);
            this.buildings.push(building);
            this.buildingByClass[data.buildingCode].push(building);

            if (building.data.buildingCode === BuildingCode.cityHall)
                this.cityHall = building;

            return true;
        } else
            throw "Not enough resources!";

        return false;
    };

    City.prototype.research = function (buildingCode) {
        var data = buildingData[buildingCode],
            resources = this.resources,
            enoughResources = data.researchCost.every(function (element, index) {
                return element <= resources[index];
            });

        if (enoughResources) {
            this.laboratory.research(buildingCode);
            this.subResources(data.researchCost);
        } else {
            throw "Not enough resources!";
        }
    };

    City.prototype.buyResource = function (resourceCode, amount) {
        var cost = this.world.resourceMarket.buyCost(resourceCode, amount);

        if (this.resources[Resources.ResourceCode.money] >= cost) {
            this.subMoney(cost);
            return true;
        } else
            return false;

    };

    City.prototype.sellResource = function (resourceCode, amount) {
        var cost = this.world.resourceMarket.sellCost(resourceCode, amount);

        this.addMoney(cost);

        return true;
    };

    City.prototype.save = function(){
        var buildings = [];

        for(var index in this.buildings){
            buildings.push(Building.serialize(this.buildings[index]));
        }

        var save = {
            name: this.name,
            x: this.position.x,
            y: this.position.y,
            timeEstablished: this.timeEstablished,
            resources: this.resources,
            cityHall: (this.cityHall && Building.serialize(this.cityHall)) || null,
            buildings: buildings,
            laboratory: this.lab.save()
        }
        return save;
    };

    City.prototype.load = function(data){
        this.setName(data.name);
        this.setPosition(this.world.tiles.get(data.x, data.y));
        this.timeEstablished = data.timeEstablished;
        this.resources = data.resources;
        this.cityHall = (data.cityHall && this.world.buildings.buildingIdToBuildingMap[data.cityHall.id]) || null;

        for(var index in data.buildings){
            var b = this.world.buildings.buildingIdToBuildingMap[data.buildings[index].id];

            this.buildings.push(b);
            this.buildingByClass[b.data.buildingCode].push(b);
        }

        this.laboratory.load(data.lab);
    };

    return City;
});
