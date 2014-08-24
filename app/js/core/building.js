/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 20.09.13
 * Time: 18:56
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var BuildingState = require("core/buildingstate");
    var Resources = require("core/resources");
    /**
     * @type {ResourceCode}
     */
    var ResourceCode = require("./resourcecode");
    var Events = require("events");
    /**
     * @type {BuildingClassCode}
     */
    var BuildingClassCode = require("core/buildingclasscode");
    var BuildingData = require("./buildingdata");
    var TileIterator = require("./tileiterator");
    /**
     * @type {TileIteratorRadial}
     */
    var TileIteratorRadial = require("./tileiteratorradial");
    /**
     * @type {TerrainType}
     */
    var TerrainType = require("./terraintype");
    /**
     * @type {GatherReq}
     */
    var GatherReq = require("./gatherreq");
    var Terrain = require("./terrain");

    var buildingData = BuildingData;

    var events = {
        update: 0,
        stateChange: 1,
    };

    function Building(buildingCode, world) {
        this.id = Building.lastId++
        this.producing = {};
        this.demanding = {};

        if (buildingCode !== undefined && world !== undefined)
            this.init(world, buildingCode);
    }

    Building.lastId = 0;

    Building.prototype.buildingCode = -1;
    Building.prototype.world = null;
    Building.prototype.id = null;
    Building.prototype.tile = null;
    Building.prototype._state = BuildingState.none;
    Building.prototype.rotation = 0;
    Building.prototype.timeCreated = null;  //real time
    Building.prototype.createdAt = null; //game time
    Building.prototype.demanding = null;
    Building.prototype.producing = null;
    Building.prototype.permanent = true;

    Building.events = Building.prototype.events = events;

    Building.prototype.init = function (world, code, tile, rot) {
        this.world = world;
        this.tile = tile;
        this.timeCreated = this.timeCreated || Date.now();
        this.createdAt = this.createdAt || this.world.time.now;
        this.rotation = rot || false;
        this.buildingCode = code;

        var data = BuildingData[code];

        this._state = data.constructionTime === 0 ? BuildingState.ready : BuildingState.underConstruction;
        updateEffectOnTileParams(this);

        if (data.classCode !== BuildingClassCode.tree) {
            Events.once(this, "dispose", onDispose, Events.on(this.world, this.world.events.tick, onTick, this));
        }
    };

    Building.prototype.dispose = function () {
        Events.fire(this, "dispose");
    };

    Building.prototype.citizenCapacity = function () {
        var cap = 0;
        var data = BuildingData[this.buildingCode];

        if (this._state == BuildingState.ready)
            cap = data.citizenCapacity || 0;

        return cap;
    };

    /**
     *
     * @returns {Iterator}
     */
    Building.prototype.occupiedTiles = function () {
        var data = BuildingData[this.buildingCode];

        return new TileIterator(this.tile, data.sizeX, data.sizeY);
    };

    Building.prototype.getCity = function(){
        var world = this.world, city = null,
            cityId = world.influenceMap.getTileOwner(this.tile);

        if (cityId !== -1)
            city = world.getCity(cityId);

        return city;
    };

    Building.prototype.getState = function(){
        return this._state;
    };

    Building.prototype.toJSON = function () {
        return {
            x: this.x,
            y: this.y,
            state: this._state,
            subPosX: this.subPosX,
            subPosY: this.subPosY,
            rotation: this.rotation,
            buildingCode: this.buildingCode
        }
    };

    Building.fromJSON = function (json) {

    };

    function onDispose(self, args, tickSubscriptionId) {
        Events.off(self.world, self.world.events.tick, tickSubscriptionId);

        self._state = BuildingState.none;
        updateEffectOnTileParams(self);
    }

    function checkFullfilRequirements(self) {
        var world = self.world;
        var data = BuildingData[self.buildingCode];

        if (!world)
            throw "World is not set yet";

        if (data.requirement === GatherReq.inGrassLand) {
            var occupiedIterator = self.occupiedTiles();

            while (!occupiedIterator.done) {
                var tile = occupiedIterator.next();
                var terrainType = world.terrain.getTerrainType(tile);
                if (terrainType !== TerrainType.grass)
                    return false;
            }
        } else if (data.requirement === GatherReq.nearTree) {
            var iter = new TileIterator(self.tile - Terrain.dx, self.tile - Terrain.dy, data.sizeX + 2, data.sizeY + 2);
            while (!iter.done) {
                var tile = iter.next();
                var b = world.buildings.get(tile);
                if (b !== null) {
                    var d = BuildingData[b.buildingCode];
                    if (d.classCode === BuildingClassCode.tree)
                        return true;
                }
            }
        } else if (data.requirement === GatherReq.nearWater) {
            var iter = new TileIterator(self.tile - Terrain.dx, self.tile - Terrain.dy, data.sizeX + 2, data.sizeY + 2);
            while (!iter.done) {
                var tile = iter.next();
                var t = world.terrain.getTerrainType(tile);
                if (t === TerrainType.water || t === TerrainType.shore) {
                    return true;
                }
            }
        }

        return true;
    }

    /**
     * Updates params of tiles that are affected by effect of this building
     * @param self
     */
    function updateEffectOnTileParams(self) {
        var key = "building_" + self.id;
        var paramsMan = self.world.tileParams;
        var circle, tile, data, tilesParams, effect, effectRadius;

        data = BuildingData[self.buildingCode];
        effect = data.tileEffect || null;
        effectRadius = data.tileEffectRadius || 1;

        if (self._state === BuildingState.ready) {
            if (effect !== null) {
                if (paramsMan.has(key))
                    paramsMan.remove(key);

                circle = new TileIteratorRadial(self.tile, effectRadius);
                tilesParams = {};

                while (!circle.done) {
                    tile = TileIteratorRadial.next(circle);
                    tilesParams[tile] = effect;
                }

                paramsMan.add(key, tilesParams);
            }
        } else {
            if (effect !== null && paramsMan.has(key))
                paramsMan.remove(key);
        }
    }

    function onTick(sender, args, self) {
        self.getCity();

        var data = BuildingData[self.buildingCode];

        if (self._state === BuildingState.underConstruction && self.timeCreated + data.constructionTime <= Date.now()) {
            self._state = BuildingState.ready;
            updateEffectOnTileParams(self);
            Events.fire(self, events.update, self);
            Events.fire(self, events.stateChange, self._state);
        }

        produce(self);
        demand(self);
    }

    function produce(self) {
        Resources.clear(self.producing);

        var data = BuildingData[self.buildingCode];
        var city = self.getCity();

        if (self._state == BuildingState.ready && (data.requirement === undefined || data.requirement === GatherReq.none || checkFullfilRequirements(self))) {
            Resources.add(self.producing, self.producing, data.producing);
            city.resources.add(self.producing);
        }
    }

    function demand(self) {
        Resources.clear(self.demanding);

        var data = BuildingData[self.buildingCode];
        var city = self.getCity();

        if (self._state == BuildingState.ready) {
            Resources.add(self.demanding, self.demanding, data.demanding);
            city.resources.sub(self.demanding);
        }
    }

    return Building;
});