import Core from "core/main";
import engine from "engine/main";
import Building from "./building";
import RoadNode from "./pathfinding/roadnode";
import RoadView from "./roadview";

var buildingData = Core.BuildingData,
    BuildingData = buildingData;
var Terrain = Core.Terrain;

function Road(root) {
    this.root = root;
    this.view = new RoadView();
    this.view.setRoad(this);
}

Road.prototype = Object.create(Building.prototype);

Road.prototype.typeCode = 91111;

Road.prototype.setData = function(data){
    this.data = data;
    this.staticData = BuildingData[data.buildingCode];
    //this.tile = vkaria.terrain.getTile(data.x, data.y).tileScript;

    if(this.node === null)
        this.node = new RoadNode(this);

    this.view.update();
    this.view.render();
};

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads, or a ramp on a slope.
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param isRoad {function(number): boolean}
 * @returns {number} a key of the road sprites (see RoadView)
 */
Road.profile = function (terrain, tile, isRoad) {
    var slopeId = terrain.tileSlope(tile),
        id;

    if (!Terrain.isSlope(slopeId)) {
        var a = isRoad(tile - 1),
            b = isRoad(tile - Terrain.dy),
            c = isRoad(tile + 1),
            d = isRoad(tile + Terrain.dy);

        id = 90000 + a * 1000 + b * 100 + c * 10 + d;

        //a road with no neighbours left looks the same as a freshly placed
        //lone one - there is no sprite for 90000, the standalone piece is x1
        if (id === 90000)
            id = 91111;
    } else if (slopeId === Terrain.SlopeType.AB) {
        id = 1;
    } else if (slopeId === Terrain.SlopeType.AC) {
        id = 2;
    } else if (slopeId === Terrain.SlopeType.CD) {
        id = 3;
    } else if (slopeId === Terrain.SlopeType.BD) {
        id = 4;
    }

    return id;
};

Road.prototype.updateProfile = function () {
    var roadman = this.root.roadman,
        id = Road.profile(this.root.core.terrain, this.data.tile, function (tile) {
            return roadman.getRoad(tile) !== null;
        });

    this.typeCode = id;

    this.view.update();
    this.view.render();

    return id;
};

export default Road;
