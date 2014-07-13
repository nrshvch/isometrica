define(function (require) {
    var Node = require("./node");

    function BuildingNode(building) {
        Node.call(this);
        this.building = building;

    }

    BuildingNode.prototype = Object.create(Node.prototype);


    BuildingNode.prototype.building = null;
    BuildingNode.prototype.road = false;

    BuildingNode.prototype.getConnectableNodes = function () {
        var sData = this.building.staticData;
        var data = this.building.data;
        var r = [];

        var entrances = sData.roadGates;
        if (entrances !== undefined) {
            //var eX = sData.roadEntrance & 0xFFFF;
            //var eY = sData.roadEntrance >> 16;
            //var x = eX + (eX === self.data.x ? -1 : 1);
            //var y = eY + (eY === self.data.y ? -1 : 1);

            for (var i = 0; i < entrances.length; i++) {
                var entrance = entrances[i];
                var x = entrance[0] + data.x;
                var y = entrance[1] + data.y;
                var road = vkaria.buildman.getRoad(x, y);

                if (road !== null) {
                    r.push(road.node);
                }
            }
        }

        return r;
    };

    BuildingNode.prototype.connect = function (node) {
        if (node.road === true) {
            var data = node.building.data,
                x = data.x,
                y = data.y;

            var sData = this.building.staticData;
            var data = this.building.data;
            var entrances = sData.roadGates;

            if (entrances !== undefined) {
                for (var i = 0; i < entrances.length; i++) {
                    var entrance = entrances[i];
                    var ex = entrance[0] + data.x;
                    var ey = entrance[1] + data.y;
                    if(x === ex && y === ey){
                        Node.prototype.connect.call(this, node);

                        return this;
                    }
                }
            }
        }
        return false;
    };

    BuildingNode.prototype.getGate = function(node){
        if(!node)
            return null;

        var h = node.building;

        var x = h.data.x,
            y = h.data.y,
            bx = this.building.data.x,
            by = this.building.data.y,
            gates = this.building.staticData.roadGates;

        for(var i = 0; i < gates.length; i++){
            var gate = gates[i];
            if(gate[0] === (x - bx) && gate[1] === (y-by)){
                return i;
            }
        }
    };

    BuildingNode.prototype.getPath = function(fromNode, toNode){
        var g1 = this.getGate(fromNode);
        var g2 = this.getGate(toNode);
        return this.building.getPath(g1,g2);
    };

    return BuildingNode;
});
