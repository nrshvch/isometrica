//TODO add shack http://en.wikipedia.org/wiki/Shack
//TODO add oldschool trailer house

//TODO !!! BUILDINGDATA HAS CIRCULAR DEPENDENCIES -> Core need BuildingData and vice versa; ATM it works as it is, but be aware

define(function (require) {
    var namespace = require("namespace");
    var BuildingCode = require("core/buildingcode");
    var BuildingClassCode = require("core/buildingclasscode");
    /**
     * @type {ResearchDirection}
     */
    var ResearchDirection = require("./researchdirection")
    /**
     * @type {ResearchState}
     */
    var ResearchState = require("core/researchstate");
    var RenderLayer = require("client/renderlayer");
    /**
     * @type {GatherReq}
     */
    var GatherReq = require("./gatherreq");
    /**
     * @type {ResourceCode}
     */
    var ResourceCode = require("./resourcecode");
    /**
     * @type {BuildingPositioning}
     */
    var BuildingPositioning = require("./buildingpositioning");

    var Core = namespace("Isometrica.Core");

    var buildingData = Core.BuildingData = {};

    buildingData[BuildingCode.tree1] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.tree1,
        classCode: BuildingClassCode.tree,
        producing: {},
        demanding: {},
        constructionTime: 0,
        constructionCost: {},
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: {},
        name: "tree",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 34,
                pivotY: 53,
                path: "tree1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.tree2] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.tree2,
        classCode: BuildingClassCode.tree,
        producing: {},
        demanding: {},
        constructionTime: 0,
        constructionCost: {},
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: {},
        name: "tree",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 34,
                pivotY: 53,
                path: "tree2.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.cliff] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.cliff,
        classCode: BuildingClassCode.tree,
        producing: {},
        demanding: {},
        constructionTime: 0,
        constructionCost: {},
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: {},
        name: "cliff",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 24,
                path: "cliff.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.road] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.road,
        classCode: BuildingClassCode.road,
        producing: {},
        demanding: {},
        constructionTime: 0,
        constructionCost: {
            stone: 1,
            money: 1
        },
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: {},
        name: "road",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 24,
                path: "road/x1.png",
                layer: RenderLayer.roadLayer
            }
        ],
        roadGates: [
            [1, 0],
            [0, -1],
            [-1, 0],
            [0, 1]
        ],
        waypoints: {},
        tileEffect: {
            eco: -1,
            crime: 1
        },
        tileEffectRadius: 1
    };


    buildingData[BuildingCode.house0] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.house0,
        classCode: BuildingClassCode.house,
        producing: {
            stone: 1,
            wood: 1,
            iron: 1
        },
        demanding: {
            water: 1
        },
        citizenCapacity: 1,
        constructionTime: 3000,
        constructionCost: {
            stone: 8,
            wood: 8
        },
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: {},
        name: "mobile house",
        canRotate: true,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 23,
                path: "buildings/house0.png",
                layer: RenderLayer.buildingsLayer
            }
        ],
        spritesRotate: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 23,
                path: "buildings/house0r.png",
                layer: RenderLayer.buildingsLayer
            }
        ],
        roadGates: [
            [-1, 0]//,[0,-1],[1,0],[0,1]
        ],
        tileEffect: {
            "eco": -10,
            "crime": 1
        },
        tileEffectRadius: 2
    };

    buildingData[BuildingCode.house1] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.house1,
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        citizenCapacity: 1,
        constructionTime: 3000,
        constructionCost: {
            stone: 10,
            wood: 10,
            money: 10
        },
        researchState: ResearchState.available,
        researchTime: 2000,
        researchCost: {
            money: 200
        },
        researchLevel: 1,
        researchDirection: ResearchDirection.housing,
        name: "tiny house",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 27,
                pivotY: 23,
                path: "buildings/house1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.house2] = {
        sizeX: 1,
        sizeY: 2,
        buildingCode: BuildingCode.house2,
        classCode: BuildingClassCode.house,
        producing: {
            money: 5
        },
        demanding: {
            food: 5,
            electricity: 1,
            water: 1
        },
        citizenCapacity: 3,
        constructionTime: 3000,
        constructionCost: {
            money: 1000,
            wood: 100,
            stone: 100,
            iron: 100
        },
        researchState: ResearchState.available,
        researchTime: 5000,
        researchCost: {
            money: 500
        },
        name: "small residential house",
        canRotate: true,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 31,
                path: "buildings/house2-2.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 0,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 26,
                path: "buildings/house2-1.png",
                layer: RenderLayer.buildingsLayer
            }
        ],
        spritesRotate: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 31,
                path: "buildings/house2r-2.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 26,
                path: "buildings/house2r-1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.house3] = {
        sizeX: 2,
        sizeY: 1,
        buildingCode: BuildingCode.house3,
        classCode: BuildingClassCode.house,
        producing: {
            money: 10
        },
        demanding: {
            food: 10,
            electricity: 2,
            water: 2
        },
        constructionTime: 5000,
        constructionCost: {
            money: 1500,
            wood: 150,
            stone: 50,
            iron: 150
        },
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: {
            money: 1500
        },
        name: "cottage house",
        citizenCapacity: 4,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 19,
                path: "buildings/house3-1.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 40,
                path: "buildings/house3-2.png",
                layer: RenderLayer.buildingsLayer
            }
        ],
        smokeSource: [1.25, 2.5, 0.85]
    };

    buildingData[BuildingCode.house4] = {
        sizeX: 1,
        sizeY: 2,
        buildingCode: BuildingCode.house4,
        classCode: BuildingClassCode.house,
        producing: {
            money: 10
        },
        demanding: {
            food: 10,
            electricity: 2,
            water: 2
        },
        citizenCapacity: 4,
        constructionTime: 5000,
        constructionCost: {
            money: 1500,
            wood: 50,
            stone: 150,
            iron: 150
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {
            money: 1500
        },
        name: "two story house",
        citizenCapacity: 6,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 28,
                path: "buildings/house4-1.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 0,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 41,
                path: "buildings/house4-2.png",
                layer: RenderLayer.buildingsLayer
            }
        ],
        smokeSource: [0.75, 3.5, 1.25]
    };

    buildingData[BuildingCode.house5] = {
        sizeX: 2,
        sizeY: 1,
        buildingCode: BuildingCode.house5,
        classCode: BuildingClassCode.house,
        producing: {
            money: 10
        },
        demanding: {
            food: 10,
            electricity: 2,
            water: 2
        },
        citizenCapacity: 6,
        constructionTime: 5000,
        constructionCost: {
            money: 1500,
            wood: 50,
            stone: 150,
            iron: 150
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {
            money: 1500
        },
        name: "house",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 35,
                path: "buildings/house5-1.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 31,
                path: "buildings/house5-2.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };


    buildingData[BuildingCode.cityHall] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.cityHall,
        classCode: BuildingClassCode.municipal,
        producing: {
            money: 1,
            food: 3,
            stone: 1,
            wood: 1
        },
        demanding: {},
        constructionTime: 3000,
        constructionCost: {
            stone: 20,
            wood: 20
        },
        researchState: ResearchState.finished,
        researchTime: 3000,
        researchCost: {},
        name: "city hall",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 46,
                path: "buildings/cityhall.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.farm] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.farm,
        classCode: BuildingClassCode.industry,
        producing: {},
        demanding: {},
        constructionTime: 3000,
        constructionCost: {},
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: {},
        name: "farm",
        requirement: GatherReq.inGrassLand,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.windTurbine] = {
        sizeX: 3,
        sizeY: 3,
        buildingCode: BuildingCode.windTurbine,
        classCode: BuildingClassCode.municipal,
        producing: {
            electricity: 5
        },
        demanding: {
            money: 1
        },
        constructionTime: 5000,
        constructionCost: {
            money: 50,
            iron: 50
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {money: 100},
        name: "wind turbine",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.waterTower] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.waterTower,
        classCode: BuildingClassCode.municipal,
        producing: {
            water: 5
        },
        demanding: {
            money: 1
        },
        constructionTime: 10000,
        constructionCost: {
            money: 50,
            stone: 50
        },
        researchState: ResearchState.finished,
        researchTime: 5000,
        researchCost: {money: 100},
        name: "water tower",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 18,
                pivotY: 64,
                path: "buildings/watertower.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.waterPump] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.waterPump,
        classCode: BuildingClassCode.municipal,
        producing: {
            water: 15
        },
        demanding: {
            money: 2
        },
        constructionTime: 10000,
        constructionCost: {
            money: 100,
            stone: 40,
            iron: 40
        },
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: {money: 100},
        name: "water pump station",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.smallMarket] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.smallMarket,
        classCode: BuildingClassCode.commerce,
        producing: {
            money: 100
        },
        demanding: {},
        constructionTime: 10000,
        constructionCost: {
            money: 50
        },
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: {money: 200},
        name: "small market",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };


    //Gatherers
    buildingData[BuildingCode.lumberMill] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.lumberMill,
        classCode: BuildingClassCode.industry,
        producing: {
            wood: 5
        },
        demanding: {},
        constructionTime: 3000,
        constructionCost: {
            money: 100
        },
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: {},
        name: "lumber mill",
        requirement: GatherReq.nearTree,
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.oilWell] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.oilWell,
        classCode: BuildingClassCode.industry,
        positioning: BuildingPositioning.resource,
        resource: ResourceCode.oil,
        producing: {
            oil: 5
        },
        demanding: {},
        constructionTime: 10000,
        constructionCost: {
            money: 100
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {money: 200},
        requirement: GatherReq.oilTile,
        name: "oil rig",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.stoneQuarry] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.stoneQuarry,
        classCode: BuildingClassCode.industry,
        positioning: BuildingPositioning.resource,
        resource: ResourceCode.stone,
        producing: {
            stone: 5
        },
        demanding: {},
        constructionTime: 5000,
        constructionCost: {
            money: 100
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {money: 200},
        requirement: GatherReq.stoneTile,
        name: "stone quarry",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 30,
                path: "buildings/testbuilding0.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.ironMine] = {
        sizeX: 1,
        sizeY: 1,
        positioning: BuildingPositioning.resource,
        resource: ResourceCode.iron,
        buildingCode: BuildingCode.ironMine,
        classCode: BuildingClassCode.industry,
        producing: {
            iron: 5
        },
        demanding: {},
        constructionTime: 5000,
        constructionCost: {
            money: 100
        },
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: {money: 200},
        requirement: GatherReq.ironTile,
        name: "iron mine",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 26,
                path: "buildings/testbuilding1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    return buildingData;
});
