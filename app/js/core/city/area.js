/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    var TileIterator = require("../tileiterator");
    var Resource = require("../resourcecode");
    var Terrain = require("../terrain");

    var namespace = require("namespace");
    var CityService = namespace("Isometrica.Core.CityService");
    CityService.Area = Area;

    var AREA_TILE_COST_PER_TURN = 0.025;

    function Area(city) {
        this._city = city;
    }

    /**
     * @type {City}
     * @private
     */
    Area.prototype._city = null;

    /**
     * @param x0 {number}
     * @param y0 {number]
     * @param w {number]
     * @param l {number}
     * @returns {boolean}
     */
    Area.prototype.contains = function (a,b,c,d) {
        var x0, y0, w, l;

        if(arguments.length === 2) {
            x0 = Terrain.extractX(a);
            y0 = Terrain.extractY(a);
            w  = Terrain.extractX(b);
            l = Terrain.extractX(b);
        }else{
            x0 = a; y0 = b; w = c; l = d;
        }

        return isInsideCityBorders(this, x0, y0, w, l);
    };

    Area.prototype.getInfluenceArea = function(){
        return this._city.world.influenceMap.getInfluenceArea(this._city.id);
    };

    Area.prototype.getInfluenceAreaData = function(){
        return this._city.world.influenceMap.getInfluenceAreaData(this._city.id);
    };

    Area.prototype.init = function(){
        var world = this._city.world;
        Events.on(world, world.events.tick, onTick, this);
    };

    Area.prototype.getAreaCost = function(){
        return calculateAreaCost(this);
    };

    function isInsideCityBorders(self, x0, y0, w, l) {
        var city = self._city;

        w = w || 1;
        l = l || 1;

        if(arguments.length === 2){
            y0 = x0 >>> 16;
            x0 = x0 & 0xFFFF;
        }

        var inside = true;
        var iterator = new TileIterator(x0, y0, w, l);
        var area = city.world.influenceMap.getInfluenceAreaData(city.id);
        while (!iterator.done) {
            var tile = iterator.next();

            if (area[tile] === undefined) {
                inside = false;
                break;
            }
        }
        return inside;
    }

    function calculateAreaCost(self) {
        var area = self.getInfluenceArea();
        var n = area.length;
        self.areaCost = n * AREA_TILE_COST_PER_TURN;
    }

    function onTick(sender, args, self){
        var money = {};
        money[Resource.money] = calculateAreaCost(self);
        self._city.resourcesModule.sub(money);
    }

    return Area;
});