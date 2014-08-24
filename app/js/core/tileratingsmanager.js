/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 27.04.14
 * Time: 23:11
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var Events = require("events");
    var BuildingData = require("./buildingdata");
    var TileRatings = require("./tileratings");

    function RatingsMan(world) {
        this._world = world;
        this._tilesRatings = new Array();

        var self = this;
        this.onBuildingBuilt = function (sender, args) {
            addRatings(self, args);
        };

        this.onBuildingRemoved = function (sender, args) {
            removeRatings(self, args);
        };
    }

    var defaultRatings = TileRatings.create();
    defaultRatings.values[TileRatings.TileRatingEnum.Ecology] = 100;

    var initializeRatings = function (self) {
        var all = self._world.buildMan.byId;
        for (var i in all) {
            if (all[i] != undefined){
                addRatings(self, all[i]);
            }
        }
    };

    var addRatings = function (self, building) {

        if(building == undefined)
            return;

        var data = BuildingData[building.buildingCode],
            effect = data.effect,
            affectedTiles = getAffectedTiles(self, building);

        if (effect !== undefined && affectedTiles !== null) {
            for(var i = 0; i < affectedTiles.length; i++){
                var item = affectedTiles[i];
                var index = item.x + item.y * self._world.size;

                var ratings = null;
                if(self._tilesRatings[index] == undefined){
                    ratings = self._tilesRatings[index] = TileRatings.copy(TileRatings.create(), defaultRatings);
                }else{
                    ratings = self._tilesRatings[index];
                }

                TileRatings.add(ratings, ratings, effect);
            }
        }
    };

    var getAffectedTiles = function(sender, self, building){
        if(building === undefined)
            return null;

        var affectedTiles = [];

        var data = BuildingData[building.data.buildingCode],
            radius = data.effectRadius || 1,
            posX = building.x,
            posY = building.y,
            sizeX = data.sizeX,
            sizeY = data.sizeY;

        var x0 = posX - radius,
            y0 = posY - radius,
            x1 = posX + sizeX + radius,
            y1 = posY + sizeY + radius,
            w = x1 - x0,
            h = y1 - y0,
            i = 0, dx = 0, dy = 0,
            l = w * h,
            x = x0, y = y0;

        for(i = 0; i < l; i++){
            dy = (i / w) | 0;
            dx = i - dy * w;

            x = x0 + dx;
            y = y0 + dy;

            if(x >= 0 && x < self._world.size && y >= 0 && y < self._world.size)
                affectedTiles.push({x:x,y:y});
        }

        return affectedTiles;
    };

    var removeRatings = function (self, building) {
        var affected = getAffectedTiles(self, building);
        var effect = BuildingData[building.buildingCode].effect;

        if(affected !== null && effect !== undefined){
            for(var i = 0; i < affected.length; i++){
                var item = affected[i];
                var index = item.x + item.y * self._world.size;

                if(self._tilesRatings[index] !== undefined)
                    TileRatings.sub(self._tilesRatings[index], self._tilesRatings[index], effect);
            }
        }
    };

    var ratingsMan = RatingsMan.prototype;

    /**
     * Root object
     * @type {World}
     * @private
     */
    ratingsMan._world = null;

    ratingsMan._tilesRatings = null;

    ratingsMan.init = function () {
        initializeRatings(this);
        var buildman = this._world.buildings;
        Events.on(buildman, buildman.events.buildingBuilt, this.onBuildingBuilt,this);
        Events.on(buildman, buildman.events.buildingBuilt, this.onBuildingRemoved,this);

        //this._world.buildMan.addEventListener(this._world.buildMan.events.buildingBuilt, this.onBuildingBuilt);
        //this._world.buildMan.addEventListener(this._world.buildMan.events.buildingRemoved, this.onBuildingRemoved);
    };

    ratingsMan.getRatings = function (x, y) {
        var index = x  + this._world.size * y;
        var r = this._tilesRatings[index];

        if(r === undefined)
            r = defaultRatings;

        var r1 = TileRatings.copy(TileRatings.create(), r);
        clampRatings(r1);
        return r1;
    };

    /**
     * Get specific rating value of tile
     * @param x {number}
     * @param y {number}
     * @param {TileRatings.TileRatingEnum} ratingType
     * @returns {number}
     */
    ratingsMan.getRating = function(x, y, ratingType){
        var index = x + this._world.size * y;
        var ratings = this._tilesRatings[index];
        var rating = 0;

        if(ratings === undefined){
          rating = defaultRatings.values[ratingType];
        }else{
            rating = ratings.values[ratingType];
        }

        rating = Math.min(100, Math.max(0, rating));
        return rating;
    };

    function clampRatings(r){
        for(var key in TileRatings.TileRatingEnum){
            var index = TileRatings.TileRatingEnum[key];
            r.values[index] = Math.min(100, Math.max(0, r.values[index]));
        }
    }

    return RatingsMan;
});