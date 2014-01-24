define(function(require){
    var types = new Array(4),
        BuildingCode = require("lib/buildingcode");

    types[BuildingCode.tree1] = require("./tree1");
    types[BuildingCode.tree2] = require("./tree2");
    types[BuildingCode.house] = require("./house");
    types[BuildingCode.cityHall] = require("./cityhall");

    return types;
});
