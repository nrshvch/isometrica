/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    var Terrain = require("./terrain");
    var Events = require("events");
    var BuildingData = require("./buildingdata");

    function InfluenceMap(world){
        this.map = {};
        this.world = world;

        Events.on(this.world, this.world.events.cityEstablished, onCityEstablished, this);
    }

    InfluenceMap.prototype.events = {
        areaChange: 0
    };

    /**
     * @type {World}
     */
    InfluenceMap.prototype.world = null;

    function onCityEstablished(world, city, self){
        Events.on(city, city.events.buildingBuilt, onUpdate, self);
        Events.on(city, city.events.buildingRemoved, onUpdate, self);

        onUpdate(city,null,self);
    }

    function onUpdate(city, args, self){
        console.log("influence zone update");

        self.map = {};//clear all

        calcCityInfluenceArea(self, city);
    }

    function calcCityInfluenceArea(self, city){
        //get array of influences
        var buildings = city.getBuildings();
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
        influences[Terrain.convertToIndex(city.x,city.y)] = 3;

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
        var x = Terrain.extractX(xy);
        var y = Terrain.extractY(xy);
        var r = [];
        var iter = new Terrain.TerrainIterator(x - influenceRadius, y - influenceRadius, 1 + influenceRadius * 2, 1 + influenceRadius * 2);
        var index;

        while((index = iter.next()) !== -1){
            var _x = Terrain.extractX(index);
            var _y = Terrain.extractY(index);
            var d = Math.sqrt(Math.pow(_x-x, 2) + Math.pow(_y-y,2));

            if(d > influenceRadius)continue;
            var value = influenceRadius + 1 - d;
            r.push({
                x: _x,
                y: _y,
                value: value,
                index: index
            });

        }

        return r;
    }

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

    return InfluenceMap;
});