define(function (require) {
    var namespace = require("namespace");

    require("data/data"); //for sake of compatibility
    require("data/buildingclasscode"); //for sake of compatibility
    require("data/buildingclassdata"); //for sake of compatibility
    require("./logic");
    require("./terraintype");
    require("./ambient");
    require("./building");
    //require("data/buildingclasscode");
    //require("./buildingclassdata");
    require("./buildingcode");
    require("./buildingpositioning");
    require("./buildings");
    require("./buildingstate");
    require("./city");
    require("./config");
    require("./construction");
    require("./errorcode");
    require("./gatherreq");
    require("./influencemap");
    require("./logic");
    require("./msgsrv");
    require("./researchdirection");
    require("./researchstate");
    require("./resourcecode");
    require("./resources");
    require("./terrain");
    require("./terraintype");
    require("./tileiterator");
    require("./tileiteratoraction");
    require("./tileiteratorradial");
    require("./tiletype");
    require("./vtime");
    require("./city/area");
    require("./city/citybuildings");
    require("./city/citypopulation");
    require("./city/cityresources");
    require("./city/citystats");
    require("./city/citytilesparams");
    require("./city/laboratory");
    require("./world/marketsrv");
    require("./world/tileparam");
    require("./world/tileparams");
    require("./world/tileparamsmanager");

    return namespace("Isometrica.Core");
});
