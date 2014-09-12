/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    var Terrain = require("./terrain");
    var Events = require("events");
    var BuildingData = require("./buildingdata");
    var TileRadialIterator = require("./tileiteratorradial");

    function InfluenceMap(world){
        this.map = {};
        this.world = world;

        //Events.on(this.world, this.world.events.cityEstablished, onCityEstablished, this);
    }

    InfluenceMap.prototype.events = {
        areaChange: 0
    };

    /**
     * @type {World}
     */
    InfluenceMap.prototype.world = null;

    InfluenceMap.prototype.setInfluenceArea = function(city, influenceSources){
        for(var index in influenceSources){
            var area = calcInfluenceArea(index, influenceSources[index]);

            for(var j = 0, lj = area.length; j < lj; j++){
                var item = area[j];
                setInfluence(this.map, city, item.index, item.value);
            }
        }
        Events.fire(this,this.events.areaChange, city);
    };

    InfluenceMap.prototype.getInfluenceAreaData = function(city){
        var ret = [];
        for(var index in this.map){
            var cell = this.map[index];
            var influence = cell.influences[city];

            if(influence){
                ret[index] = influence.value;
            }
        }
        return ret;
    };

    InfluenceMap.prototype.getInfluenceArea = function(city){
        var ret = [];
        for(var index in this.map){
            var cell = this.map[index];
            var influence = cell.influences[city];

            if(influence){
                ret.push(index);
            }
        }
        return ret;
    };

    InfluenceMap.prototype.getTileOwner = function(tile){
        var pretenders = this.map[tile];
        if(pretenders !== undefined)
            pretenders = pretenders.influences;

        var best = null;
        for(var cityId in pretenders){
            var pretender = pretenders[cityId];
            if(best === null || best.value < pretender.value || (best.value === pretender.value && best.order < pretender.order))
                best = pretender;
        }
        return (best !== null && best.city) || -1;
    };

    InfluenceMap.prototype.registerCity = function(city){
        Events.on(city.buildingService, city.buildingService.events.new, onUpdate, this);
        Events.on(city.buildingService, city.buildingService.events.remove, onUpdate, this);

        onUpdate(city.buildingService,null,this);
    };

    function onCityEstablished(world, city, self){
        Events.on(city.buildingService, city.buildingService.events.new, onUpdate, self);
        Events.on(city.buildingService, city.buildingService.events.remove, onUpdate, self);

        onUpdate(city.buildingService,null,self);
    }

    function onUpdate(cityBuildings, args, self){
        self.map = {};//clear all

        calcCityInfluenceArea(self, cityBuildings);
    }

    function calcCityInfluenceArea(self, cityBuildings){
        //get array of influences
        var buildings = cityBuildings.getBuildings();
        var city = cityBuildings.city;
        var building;
        var influences = [];
        for(var i = 0, l = buildings.length; i < l; i++){
            building = buildings[i];
            var iter = building.occupiedTiles(), index;
            var radius = BuildingData[building.buildingCode].influenceRadius | 1;
            while((index = iter.next()) !== -1) {
                influences[index] = radius;
            }
        }

        //add city origin
        influences[city.tile()] = 3;

        self.setInfluenceArea(city.id, influences);
        //return self.world.influenceMap.getInfluenceArea(self.name);
    }

    /**
     * Claim your right to own this cell
     * @param map
     * @param city
     * @param index
     * @param value
     */
    function setInfluence(map, city, index, value){
        if(!map[index])
            map[index] = {
                count: 0,
                influences: {}
            };

        var cell = map[index];

        if(!cell.influences[city]) {
            cell.influences[city] = {
                city: city,
                order: cell.count++,
                value: value
            }
        }else{
            cell.influences[city].value += value;
        }
    }

    /**
     * calculate influence area of single source.
     * @param xy
     * @param influenceRadius
     * @constructor
     */
    function calcInfluenceArea(xy,influenceRadius){
        var r = [];
        var iter = new TileRadialIterator(xy, influenceRadius);
        var tile;

        while(!iter.done){
            tile = TileRadialIterator.next(iter);
            r.push({
                x: Terrain.extractX(tile),
                y: Terrain.extractY(tile),
                value: 1,
                index: tile
            });
        }

        return r;
    }

    return InfluenceMap;
});