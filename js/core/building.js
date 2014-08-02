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
        Events = require("lib/events"),
        BuildingClassCode = require("lib/buildingclasscode"),
        buildingData = require("lib/buildingdata"),
        ResourceCode = require("lib/resourcecode"),
        Terrain = require("./terrain");

    var BuildingData = buildingData;

    function Building(buildingCode, world) {
        this.id = Building.lastId++;

        this.world = world;

        this.producing = Resources.create();
        this.demanding = Resources.create();

        this.data = buildingData[buildingCode];
        this.buildingCode = buildingCode;

        this.state = this.data.constructionTime === 0 ? BuildingState.ready : BuildingState.underConstruction;

        if(this.data.classCode !== BuildingClassCode.tree)
            this.tickSubscriptionId = Events.subscribe(this.world, this.world.events.tick, this.onTick, this);
    }

    Building.lastId = 0;

    Building.prototype.buildingCode = -1;
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
    Building.prototype.data = null;
    Building.prototype.events = {
        update: 0
    };
    Building.prototype.demanding = null;
    Building.prototype.producing = null;

    Building.prototype.init = function () {

    };

    Building.prototype.setPosition = function (x,y) {
        //this.world = tile.world;
        this.x = x;
        this.y = y;

        this.timeCreated = this.timeCreated || Date.now();
        this.createdAt = this.createdAt || this.world.time.now;
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
        }
    };

    Building.prototype.demand = function () {
        Resources.copy(this.demanding, Resources.zero);
        if (this.state == BuildingState.ready) {
            Resources.add(this.demanding, this.demanding, this.data.demanding);
        }
    };

    Building.prototype.onTick = function(sender, args, self){
        self.tick();
    };

    Building.prototype.tick = function () {
        if (this.state === BuildingState.underConstruction && this.timeCreated + this.data.constructionTime <= Date.now()) {
            this.state = BuildingState.ready;
            Events.fire(this, this.events.update, this);
        }

        this.produce();
        this.demand();
    };

    Building.prototype.onRemove = function () {
        Events.unsubscribe(this.world, this.world.events.tick, this.tickSubscriptionId);
    };

    /**
     *
     * @returns {Iterator}
     */
    Building.prototype.occupiedTiles = function(){
        var data = BuildingData[this.buildingCode];

        return new Terrain.TerrainIterator(this.x, this.y, data.sizeX, data.sizeY);
    };

    Building.prototype.toJSON = function () {
        return {
            x: this.x,
            y: this.y,
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