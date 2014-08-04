define(function (require) {
    var BuildingCode = require('core/buildingcode'),
        ResearchDirection = require("./researchdirection");

    var data = {};

    data[ResearchDirection.municipal] = {
        levelItems: [
            [
                BuildingCode.cityHall,
                BuildingCode.road,
                BuildingCode.windTurbine,
                BuildingCode.waterTower
            ],
            [
                BuildingCode.waterPump,
                BuildingCode.smallCoalPlant,
            ]
        ]
    };

    data[ResearchDirection.housing] = {
        levelItems: [
            [BuildingCode.house2, BuildingCode.house0,BuildingCode.house3,BuildingCode.house4,BuildingCode.house5],
            [BuildingCode.house1],
            [BuildingCode.house3],
            [BuildingCode.house4, BuildingCode.house5],
        ]
    };

    data[ResearchDirection.commerce] = {
        levelItems: [
            [],
            [BuildingCode.smallMarket]
        ]
    };

    data[ResearchDirection.industry] = {
        levelItems: [
            [],
            [BuildingCode.farm],
            [BuildingCode.lumberMill],
            [BuildingCode.coalMine, BuildingCode.stoneQuarry, BuildingCode.ironMine, BuildingCode.gasWell],
            [BuildingCode.oilRig],
            [BuildingCode.uraniumMine]
        ]
    };

    return data;
});
