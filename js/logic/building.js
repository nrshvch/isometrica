/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 20.09.13
 * Time: 18:56
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var BuildingCode = require("lib/buildingcode"),
        BuildingState = require("lib/buildingstate"),
        Resources = require("lib/resources"),
        EventManager = require("lib/eventmanager"),
        BuildingClassCode = require("lib/buildingclasscode"),
        buildingData = require("lib/buildingdata"),
        ResourceCode = require("lib/resourcecode");

    var dateBuffer1 = new Date(),
        dateBuffer2 = new Date(),
        resourcesBuffer1 = Resources.create();


    function Building(buildingCode) {
        this.id = Building.lastId++;

        EventManager.call(this);


        this.data = buildingData[buildingCode];

        this.state = this.data.constructionTime === 0 ? BuildingState.ready : BuildingState.underConstruction;

        var self = this;
        this.findResourceTileHandler = function (tile) {
            return tile.resource === self.data.gather;
        };
        this.findTreeTileHandler = function (tile) {
            var b = tile.getBuilding();
            return b && (b.data.classCode === BuildingClassCode.tree);
        };
    }

    Building.lastId = 0;

    Building.prototype = Object.create(EventManager.prototype);

    Building.prototype.id = null;
    Building.prototype.x = null;
    Building.prototype.y = null;
    Building.prototype.tile = null;
    Building.prototype.state = BuildingState.none;
    Building.prototype.subPosX = 0;
    Building.prototype.subPosY = 0;
    Building.prototype.rotation = 0;
    Building.prototype.timeCreated = null;  //real time
    Building.prototype.createdAt = null; //game time
    Building.prototype.condition = 1;
    Building.prototype.data = null;
    Building.prototype.canGather = false; //indicates that there is resource vein near to gather from
    Building.prototype.events = {
        update: 0
    };

    Building.prototype.init = function(){

    };

    Building.prototype.setTile = function (tile) {
        this.world = tile.world;
        this.tile = tile;
        this.x = tile.x;
        this.y = tile.y;

        this.timeCreated = this.timeCreated || this.world.now;
        this.createdAt = this.createdAt || this.world.time.now;

        //set canGather flag, so we know if there is resource near
        //except for wood, because it isn't a resource, but building, that can be removed.
        //for wood, canGather is always false.
        if (this.data.gather !== null && this.data.gather !== ResourceCode.wood) {
            this.canGather = false;
            this.canGather = tile.tiles.searchSquareRadius(this.x, this.y, 3, this.findResourceTileHandler);
        }
    };

    Building.prototype.setSubPosition = function (subX, subY) {
        this.subPosX = subX;
        this.subPosY = subY;
    };

    Building.prototype.rotate = function (value) {
        if(value !== undefined)
            return this.rotation = value;
        else
            return this.rotation = !this.rotation;
    };

    Building.prototype.produce = function () {
        if (this.state == BuildingState.ready && (this.data.gather !== null || this.data.producing !== Resources.zero)) {
            Resources.copy(resourcesBuffer1, Resources.zero);
            Resources.add(resourcesBuffer1, resourcesBuffer1, this.data.producing);

            //Resources cannot be removed. canGather flag was predefined when building was set.
            if (this.data.gather !== null && this.canGather)
                resourcesBuffer1[this.data.gather] += 1;

            /* When gathering wood, it is required to have trees around current building.
             * But trees can be removed, so we need to check them each time when producing.
             * */
            if (this.data.gather === ResourceCode.wood && this.tile.tiles.searchSquareRadius(this.x, this.y, 3, this.findTreeTileHandler))
                resourcesBuffer1[this.data.gather] += 1;

            return resourcesBuffer1;
        } else {
            return Resources.zero;
        }
    };

    Building.prototype.demand = function () {
        if (this.state == BuildingState.ready) {
            return this.data.demanding;
        } else {
            return Resources.zero;
        }
    };

    Building.prototype.tick = function () {
        if (this.state === BuildingState.underConstruction && this.timeCreated + this.data.constructionTime <= this.world.now) {
            this.state = BuildingState.ready;
            this.dispatchEvent(this.events.update, this);
        }

        this.condition -= 0.0000274; //approx. -1% per game year.
    };

    Building.serialize = function (building) {
        return {
            id: building.id,
            x: building.x,
            y: building.y,
            buildingCode: building.data.buildingCode,
            state: building.state
        };
    };

    Building.deserialize = function (data) {
        var d = data,
            b = new Building(d.buildingCode);

        b.id = d.id;
        b.x = d.x;
        b.y = d.y;
        b.state = d.state;

        return b;
    };

    return Building;
});