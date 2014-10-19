/**
 * Created by denis on 8/27/14.
 */
define(function (require) {
    var ConstructionData = require("data/data");
    var TileIterator = require("./tileiterator");
    var Terrain = require("./terrain");
    var ConstructionState = require("./buildingstate");

    var id;

    var events = {
        stateChange: 0
    };

    function constructor(self){
        self.id = id++;
    }

    function init(self, world, code, tile, rot){
        self.data = ConstructionData[code];
        self.world = world;
        self.tile = tile;
        self.buildingCode = code;
        self.rotation = rot || 0;

        if(self.data.constructionTime === 0){
            self._state = ConstructionState.ready;
        }else{
            self._state = ConstructionState.underConstruction;
            setTimeout(function(){
                self._state = ConstructionState.ready;
                Events.fire(self, events.stateChange, self._state);
            }, self.data.constructionTime);
        }
    }
    
    function Construction() {
        constructor(this);
    }

    Construction.constructor = constructor;
    Construction.events = events;
    Construction.init = init;

    Construction.prototype.id = -1;
    Construction.prototype.tile = -1;
    Construction.prototype.rotation = 0;
    Construction.prototype.data = null;
    Construction.prototype.world = null;
    Construction.prototype.buildingCode = -1;
    Construction.prototype._state = ConstructionState.none;

    Construction.prototype.init = function(world, code, tile, rot){
        return init(this, world, code, tile, rot);
    };

    Construction.prototype.getState = function(){
        return this._state;
    };

    Construction.prototype.getCity = function(){
        var world = this.world, city = null,
            cityId = world.influenceMap.getTileOwner(this.tile);

        if (cityId !== -1)
            city = world.cities.getCity(cityId);

        return city;
    };

    /**
     *
     * @returns {TileIterator}
     */
    Construction.prototype.occupiedTiles = function () {
        return new TileIterator(this.tile, this.tile + (this.data.sizeX - 1) + (this.data.sizeY - 1) * Terrain.dy);
    };

    return Construction;
});