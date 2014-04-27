/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 27.04.14
 * Time: 23:11
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {

    var BuildingData = require("lib/buildingdata");
    var TileRatings = require("lib/tileratings");

    function RatingsMan(world){
        this._world = world;
        this._tilesRatings = new Array(world.size * world.size);

        this.onBuildingBuilt = function(sender,args){
            console.log("Ratingsman: OnBuild");
        };

        this.onBuildingRemoved = function(sender, args){
            console.log("Ratingsman: OnRemoved");
        };
    }

    var initializeRatings = function(ratingsman){
        var all = ratingsman._world.buildMan.byId;
        for(var i in all){
            if(all[i] != undefined)
                addRatings(all[i]);
        }
    };

    var addRatings = function(building){
        var x = building.x,
            y = building.y,
            w = BuildingData[building.buildingCode].sizeX;// & 0x0F,
            h = BuildingData[building.buildingCode].sizeY;// >> 4,
            index = x * this._world.size + y;

            this._tilesRatings[index] = TileRatings.copy(TileRatings.create(), BuildingData[building.buildingCode].effect);
    };

    var removeRatings = function(building){
        var x = building.x,
            y = building.y,
            w = BuildingData[building.buildingCode].sizeX;// & 0x0F,
            h = BuildingData[building.buildingCode].sizeY;// >> 4,
            index = x * this._world.size + y;

        delete this._tilesRatings[index];
    };

    var ratingsMan = RatingsMan.prototype;

    /**
     * Root object
     * @type {World}
     * @private
     */
    ratingsMan._world = null;

    ratingsMan._tilesRatings = null;

    ratingsMan.init = function(){
        initializeRatings(this);
        this._world.buildMan.addEventListener(this._world.buildMan.events.buildingBuilt, this.onBuildingBuilt);
        this._world.buildMan.addEventListener(this._world.buildMan.events.buildingRemoved, this.onBuildingRemoved);
    };

    ratingsMan.getRatings = function(x,y){
        var index = x * this._world.size + y;

        return this._tilesRatings[index];
    };

    return RatingsMan;
});