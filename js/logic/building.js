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


    function Building(buildingCode, world) {
        this.id = Building.lastId++;

        this.world = world;


        EventManager.call(this);

        this.producing = Resources.create();
        this.demanding = Resources.create();

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

        this.onWorldTick = function (sender, args) {
            self.tick();
        };

        this.world.eventManager.addEventListener(this.world.events.tick, this.onWorldTick);
    }

    Building.lastId = 0;

    Building.prototype = Object.create(EventManager.prototype);

    Building.prototype.world = null;
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
    //Building.prototype.condition = 1;
    Building.prototype.data = null;
    Building.prototype.canGather = false; //indicates that there is resource vein near to gather from
    Building.prototype.events = {
        update: 0
    };
    Building.prototype.demanding = null;
    Building.prototype.producing = null;

    Building.prototype.init = function () {

    };

    Building.prototype.setTile = function (tile) {
        this.world = tile.world;
        this.tile = tile;
        this.x = tile.x;
        this.y = tile.y;

        this.timeCreated = this.timeCreated || this.world.now;
        this.createdAt = this.createdAt || this.world.time.now;

        //set canGather flag, so we know if there is a resource
        if (this.data.gather !== null) {
            this.canGather = (tile.resource === this.data.gather) || this.data.gather == ResourceCode.wood;
        }
    };

    Building.prototype.setSubPosition = function (subX, subY) {
        this.subPosX = subX;
        this.subPosY = subY;
    };

    Building.prototype.citizenCapacity = function () {
        var cap = 0;

        if (this.state == BuildingState.ready)
            cap = this.data.citizenCapacity || 0;

        return cap;
    };

    Building.prototype.rotate = function (value) {
        if (value !== undefined)
            return this.rotation = value;
        else
            return this.rotation = !this.rotation;
    };

    Building.prototype.produce = function () {
        Resources.copy(this.producing, Resources.zero);
        if (this.state == BuildingState.ready && (this.data.gather !== null || this.data.producing !== Resources.zero)) {
            Resources.add(this.producing, this.producing, this.data.producing);

            //Resources cannot be removed. canGather flag was predefined when building was set.
            if (this.canGather && this.data.gather !== null)
                this.producing[this.data.gather] += 1;

            /*
             if (this.data.gather === ResourceCode.wood && this.tile.tiles.searchSquareRadius(this.x, this.y, 3, this.findTreeTileHandler))
             resourcesBuffer1[this.data.gather] += 1;
             */
        }
    };

    Building.prototype.demand = function () {
        Resources.copy(this.demanding, this.demanding, Resources.zero);
        if (this.state == BuildingState.ready) {
            Resources.add(this.demanding, this.demanding, this.data.demanding);
        }
    };

    Building.prototype.tick = function () {
        if (this.state === BuildingState.underConstruction && this.timeCreated + this.data.constructionTime <= this.world.now) {
            this.state = BuildingState.ready;
            this.dispatchEvent(this.events.update, this);
        }

        this.produce();
        this.demand();

        //this.condition -= 0.0000274; //approx. -1% per game year.
    };

    Building.prototype.onRemove = function () {
        this.world.eventManager.removeEventListener(this.world.events.tick, this.onWorldTick);
    };

    Building.prototype.toJSON = function () {
        return {
            x: this.tile.x,
            y: this.tile.y,
            state: this.state,
            subPosX: this.subPosX,
            subPosY: this.subPosY,
            rotation: this.rotation,
            buildingCode: this.data.buildingCode
        }
    };

    Building.fromJSON = function(json){

    };

    return Building;
});