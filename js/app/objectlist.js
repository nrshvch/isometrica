//TODO buildings could be generated from buildingData
define(function(require){
    var BuildingCode = require("lib/buildingcode"),
        buildings = {};

    buildings[BuildingCode.tree1] = require("./gameObjects/tree1");
    buildings[BuildingCode.tree2] = require("./gameObjects/tree2");
    buildings[BuildingCode.cliff] = require("./gameObjects/buildings/cliff");
    buildings[BuildingCode.house0] = require("./gameObjects/buildings/house0");
    buildings[BuildingCode.house1] = require("./gameObjects/buildings/house1");
    buildings[BuildingCode.house2] = require("./gameObjects/buildings/house2");
    buildings[BuildingCode.house3] = require("./gameObjects/buildings/house3");
    buildings[BuildingCode.house4] = require("./gameObjects/buildings/house4");
    buildings[BuildingCode.house5] = require("./gameObjects/buildings/house5");
    buildings[BuildingCode.road] = require("./gameObjects/road");
    buildings[BuildingCode.bridge] = require("./gameObjects/bridges/bridge");
    buildings[BuildingCode.cityHall] = require("./gameObjects/buildings/cityhall");
    buildings[BuildingCode.farm] = require("./gameObjects/house");
    buildings[BuildingCode.lumberMill] = require("./gameObjects/house");
    buildings[BuildingCode.windTurbine] = require("./gameObjects/buildings/test0");
    buildings[BuildingCode.smallCoalPlant] = require("./gameObjects/buildings/test0");
    buildings[BuildingCode.waterTower] = require("./gameObjects/buildings/watertower");
    buildings[BuildingCode.waterPump] = require("./gameObjects/buildings/test0");
    buildings[BuildingCode.smallMarket] = require("./gameObjects/buildings/test0");

    //gatherers
    buildings[BuildingCode.oilRig] = require("./gameObjects/buildings/test0");
    buildings[BuildingCode.lumberMill] = require("./gameObjects/buildings/test1");
    buildings[BuildingCode.coalMine] = require("./gameObjects/buildings/test2");
    buildings[BuildingCode.stoneQuarry] = require("./gameObjects/buildings/test0");
    buildings[BuildingCode.uraniumMine] = require("./gameObjects/buildings/test1");
    buildings[BuildingCode.gasWell] = require("./gameObjects/buildings/test2");
    buildings[BuildingCode.ironMine] = require("./gameObjects/buildings/test1");

    return buildings;
});
