define(function (require) {
    var Pathfinder = require("./pathfinder");
    var underscore = require("underscore"),
        BuildingClassCode = require("lib/buildingclasscode");

    function Pathman() {
        this.nodes = [];
        this.lastNodeId = 0;
    }

    Pathman.prototype.start = function () {
        var self = this;

        vkaria.buildman.addEventListener(vkaria.buildman.events.buildingAdded, function(buildman, building){
            console.log(building);
            if(building.staticData.classCode !== BuildingClassCode.tree)
                self.addNode(building.node);
        });

        vkaria.buildman.addEventListener(vkaria.buildman.events.buildingRemoved, function(buildman, building){
            if(building.staticData.classCode !== BuildingClassCode.tree)
                self.removeNode(building.node);
        });
    };

    Pathman.prototype.addNode = function (node) {
        this.nodes.push(node);
        node.addTo(this);
    };

    Pathman.prototype.removeNode = function (node) {
        node.remove();
        this.nodes.splice(this.nodes.indexOf(node), 1);
    };

    //macro pathfinding
    //Для макро патфайндинга каждое здание - один целый нод
    //При микро патфайндинге дом уже раскалдывается на ячейки и производиться другой поиск пути
    //TODO: только перекрётски и дома должны быть нодами, а дороги должны создавать линки между нодами.
    Pathman.prototype.findNodes = function (start, end) {
        return Pathfinder.search(start, end, function(node0, node1){
            var a = node0.building;
            var b = node1.building;
            return Pathfinder.manhattan(a.x, a.y, b.x, b.y);
        });
    };

    //micro pathfinding
    Pathman.prototype.refinePath = function (nodePath) {
        var node0, node1, node2,
            waypoints = [];

        for (var i = 0; i < nodePath.length; i++) {
            node0 = nodePath[i];
            node1 = nodePath[i+1];
            node2 = nodePath[i+2];

            //waypoints.push(node0.host.gameObject.transform.getPosition());
            //continue;

            if(node1 && node2){
                //node0 = node0.host;
                //node1 = node1.host;
                //node2 = node2.host;

                var path = node1.getPath(node0, node2);

                for(var j = 0; j<path.length;j++)
                    waypoints.push(path[j]);
            }else if(node1){
                //node0 = node0.host;
                //node1 = node1.host;

                var path = node1.getPath(node0);

                for(var j = 0; j<path.length;j++)
                    waypoints.push(path[j]);
            }
        }

        return waypoints;
    };

    Pathman.prototype.findWaypoints = function (startWP, endWP) {
        var startX = Math.round(startWP[0] / vkaria.config.tileSize),
            startY = Math.round(startWP[2] / vkaria.config.tileSize),
            endX = Math.round(endWP[0] / vkaria.config.tileSize),
            endY = Math.round(endWP[2] / vkaria.config.tileSize),
            startTile = vkaria.tilesman.getTile(startX, startY).tileScript,
            endTile = vkaria.tilesman.getTile(endX, endY).tileScript;

        console.time("pathfind1");
        var nodes = this.findNodes(startTile.node, endTile.node);
        console.timeEnd("pathfind1");
        console.time("pathfind2");
        var path = this.refinePath(nodes);
        console.timeEnd("pathfind2");

        return path;
    };

    Pathman.prototype.findPath = function () {


        var n1 = this.nodes[_.random(this.nodes.length)];
        var n2 = this.nodes[_.random(this.nodes.length)];

        var path = null;
        if(n1 && n2){// && n1.building && n2.building){
            path = this.findNodes(n1,n2);
        }
                 /*
        var x = _.random(vkaria.buildman.roadByXY.length);
        var row = vkaria.buildman.roadByXY[x];
        if(row){
        var y = _.random(row.length);
        var n1 = vkaria.tilesman.getTile(x,y).tileScript.node;
        }else{
            return [];
        }

        var x = _.random(vkaria.buildman.roadByXY.length);
        var row = vkaria.buildman.roadByXY[x];
        if(row){
        var y = _.random(row.length);
        var n2 = vkaria.tilesman.getTile(x,y).tileScript.node;
        }else{
            return [];
        }      */

        //var n1 = this.nodes[0];
        //var n2 = this.nodes[this.nodes.length - 1];



        //var path = Pathfinder.search(n1, n2, function () {
          //  return false
        //});

        if(path){
        var path = this.refinePath(path);
        }
        //var path = this.findWaypoints(n1.host.gameObject.transform.getPosition(), n2.host.gameObject.transform.getPosition());


        return path;
    };



    return Pathman;
});
