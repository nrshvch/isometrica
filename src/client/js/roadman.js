/**
 * Created by denis on 9/18/14.
 */
import Events from "events";
import Buildman from "./buildman";
import Core from "core/main";

var BuildingClassCode = Core.BuildingClassCode;
var Terrain = Core.Terrain;

function getRoad(self, tile) {
    var road = self._roads[tile];
    return road || null;
}

function addRoad(self, tile, road) {
    if (self._roads[tile] === undefined) {
        self._index[tile] = self._tiles.length;
        self._tiles.push(tile);
    }

    self._roads[tile] = road;
}

function removeRoad(self, tile){
    if (self._roads[tile] === undefined)
        return;

    //the last tile takes the place of the one going, so the list stays packed
    var i = self._index[tile],
        last = self._tiles.pop();

    if (last !== tile) {
        self._tiles[i] = last;
        self._index[last] = i;
    }

    delete self._index[tile];
    delete self._roads[tile];
}

function updateRoadsNear(self, tile) {
    var road;
    (road = getRoad(self, tile + 1)) !== null && road.updateProfile();
    (road = getRoad(self, tile + Terrain.dy)) !== null && road.updateProfile();
    (road = getRoad(self, tile - 1)) !== null && road.updateProfile();
    (road = getRoad(self, tile - Terrain.dy)) !== null && road.updateProfile();
}

function onBuildingLoad(sender, building, self){
    var model = building.model();
    var data = model.data;

    if(data.classCode === BuildingClassCode.road){
        addRoad(self, model.tile, building);

        updateRoadsNear(self, model.tile);

        building.updateProfile();
    }
}

function onBuildingUnload(sender, building, self){
    var model = building.model();
    var data = model.data;

    if(data.classCode === BuildingClassCode.road){
        removeRoad(self, model.tile);

        //the same event carries both a demolished road and one whose chunk is
        //just being unloaded; only a demolished one is gone from the core, and
        //only then should the junctions around it fall back to simpler pieces
        if(self.root.core.buildingService.get(model.tile) === null)
            updateRoadsNear(self, model.tile);
    }
}

function Roadman(root) {
    this.root = root;
    this._roads = {};
    //every loaded road tile, packed, for picking one at random
    this._tiles = [];
    this._index = {};
}

Roadman.prototype.init = function () {
    var buildman = this.root.buildman;

    Events.on(buildman, Buildman.events.buildingLoad, onBuildingLoad, this);
    Events.on(buildman, Buildman.events.buildingUnload, onBuildingUnload, this);

    //a road whose view was made before this ran never worked out which piece
    //to draw, and would sit there as a lone crossroads for good - so anything
    //already standing is taken over here rather than trusted to arrive
    var views = buildman.getBuildingViews();

    for (var i = 0; i < views.length; i++)
        onBuildingLoad(buildman, views[i], this);
};

Roadman.prototype.getRoad = function(tile){
    return getRoad(this, tile);
};

/**
 * How many road tiles are loaded right now.
 */
Roadman.prototype.getRoadCount = function () {
    return this._tiles.length;
};

/**
 * Every loaded road tile. The list itself, not a copy - whoever gets it reads
 * it and leaves it alone.
 *
 * @returns {number[]}
 */
Roadman.prototype.getRoadTiles = function () {
    return this._tiles;
};

/**
 * A loaded road tile picked at random, or -1 when there is none.
 */
Roadman.prototype.getRandomRoadTile = function () {
    var tiles = this._tiles;

    return tiles.length === 0 ? -1 : tiles[Math.random() * tiles.length | 0];
};

export default Roadman;
