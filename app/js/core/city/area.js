/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    var TileIterator = require("../tileiterator");
    var Resource = require("../resourcecode");
    var Resources = require("../resources");

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
    Area.prototype.contains = function (x0, y0, w, l) {
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