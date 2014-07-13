define(function (require) {
    var BuildingNode = require("./buildingnode"),
        Node = require("./node"),
        engine = require("engine");

    function RoadNode(road) {
        BuildingNode.call(this, road);
    }

    RoadNode.prototype = Object.create(BuildingNode.prototype);
    RoadNode.prototype.road = true;

    RoadNode.prototype.getConnectableNodes = function () {
        var result = [];

        var x = this.building.data.x,
            y = this.building.data.y,
            buildman = vkaria.buildman,
            building;

        building = buildman.getBuilding(x + 1, y);
        if (building !== null) {
            result.push(building.node);
        }

        building = buildman.getBuilding(x, y + 1);
        if (building !== null) {
            result.push(building.node);
        }

        building = buildman.getBuilding(x - 1, y);
        if (building !== null) {
            result.push(building.node);
        }

        building = buildman.getBuilding(x, y - 1);
        if (building !== null) {
            result.push(building.node);
        }

        return result;
    };

    RoadNode.prototype.connect = Node.prototype.connect;

    return RoadNode;
});
