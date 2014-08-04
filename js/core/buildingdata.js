//TODO add shack http://en.wikipedia.org/wiki/Shack
//TODO add oldschool trailer house

//TODO !!! BUILDINGDATA HAS CIRCULAR DEPENDENCIES -> Core need BuildingData and vice versa; ATM it works as it is, but be awared

define(function (require) {
    var BuildingCode = require("core/buildingcode"),
        BuildingClassCode = require("core/buildingclasscode"),
        Resources = require("core/resources"),
        ResourceCode = require("core/resourcecode"),
        ResearchState = require("core/researchstate"),
        RenderLayer = require("client/renderlayer"),
        TileRatings = require("./tileratings"),
        namespace = require("namespace");

    var Core = namespace("Isometrica.Core");

    var buildingData = Core.BuildingData = {};

    buildingData[BuildingCode.tree1] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.tree1,
        classCode: BuildingClassCode.tree,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 0,
        constructionCost: Resources.zero,
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "tree",
        gather: null,
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
        ],
        effect: TileRatings.create((function(){
            var o = {};
            o[TileRatings.TileRatingEnum.Ecology] = 10;
            return o;
        })()),
        effectRadius: 2
    };

    buildingData[BuildingCode.tree2] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.tree2,
        classCode: BuildingClassCode.tree,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 0,
        constructionCost: Resources.zero,
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "tree",
        gather: null,
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
        ],
        effect: TileRatings.create((function(){
            var o = {};
            o[TileRatings.TileRatingEnum.Ecology] = 10;
            return o;
        })()),
        effectRadius: 2
    };

    buildingData[BuildingCode.cliff] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.cliff,
        classCode: BuildingClassCode.tree,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 0,
        constructionCost: Resources.zero,
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "cliff",
        gather: null,
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
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 0,
        constructionCost: Resources.create({
            stone: 1,
            money: 1
        }),
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "road",
        gather: null,
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
            [1,0], [0,-1], [-1,0], [0,1]
        ],
        waypoints: {},
        effect: TileRatings.create((function(){
            var o = {};
            o[TileRatings.TileRatingEnum.Ecology] = -1;
            return o;
        })())
    };


    buildingData[BuildingCode.house0] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.house0,
        classCode: BuildingClassCode.house,
        producing: Resources.create({
            stone: 1,
            wood: 1,
            iron: 1
        }),
        demanding: Resources.create({
            water: 1
        }),
        citizenCapacity: 1,
        constructionTime: 3000,
        constructionCost: Resources.create({
            stone: 8,
            wood: 8
        }),
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "mobile house",
        gather: null,
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
            [-1,0]//,[0,-1],[1,0],[0,1]
        ],
        effect: TileRatings.create((function(){
            var o = {};
            o[TileRatings.TileRatingEnum.Ecology] = -1;
            o[TileRatings.TileRatingEnum.Crime] = 1;
            return o;
        })())
    };

    buildingData[BuildingCode.house1] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.house1,
        classCode: BuildingClassCode.house,
        producing: Resources.zero,
        demanding: Resources.zero,
        citizenCapacity: 1,
        constructionTime: 3000,
        constructionCost: Resources.create({
            stone: 10,
            wood: 10,
            money: 10
        }),
        researchState: ResearchState.available,
        researchTime: 2000,
        researchCost: Resources.create({
            money: 200
        }),
        name: "tiny house",
        gather: null,
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
        size: 0x21,
        sizeX: 1,
        sizeY: 2,
        buildingCode: BuildingCode.house2,
        classCode: BuildingClassCode.house,
        producing: Resources.create({
            money: 5
        }),
        demanding: Resources.create({
            food: 5,
            electricity: 1,
            water: 1
        }),
        citizenCapacity: 3,
        constructionTime: 3000,
        constructionCost: Resources.create({
            money: 1000,
            wood: 100,
            stone: 100,
            iron: 100
        }),
        researchState: ResearchState.available,
        researchTime: 5000,
        researchCost: Resources.create({
            money: 500
        }),
        name: "small residential house",
        gather: null,
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
        size: 0x12,
        sizeX: 2,
        sizeY: 1,
        buildingCode: BuildingCode.house3,
        classCode: BuildingClassCode.house,
        producing: Resources.create({
            money: 10
        }),
        demanding: Resources.create({
            food: 10,
            electricity: 2,
            water: 2
        }),
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 1500,
            wood: 150,
            stone: 50,
            iron: 150
        }),
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: Resources.create({
            money: 1500
        }),
        name: "cottage house",
        citizenCapacity: 4,
        gather: null,
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
        smokeSource: [1.25,2.5,0.85]
    };

    buildingData[BuildingCode.house4] = {
        size: 0x21,
        sizeX: 1,
        sizeY: 2,
        buildingCode: BuildingCode.house4,
        classCode: BuildingClassCode.house,
        producing: Resources.create({
            money: 10
        }),
        demanding: Resources.create({
            food: 10,
            electricity: 2,
            water: 2
        }),
        citizenCapacity: 4,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 1500,
            wood: 50,
            stone: 150,
            iron: 150
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({
            money: 1500
        }),
        name: "two story house",
        citizenCapacity: 6,
        gather: null,
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
        smokeSource: [0.75,3.5,1.25]
    };

    buildingData[BuildingCode.house5] = {
        size: 0x12,
        sizeX: 2,
        sizeY: 1,
        buildingCode: BuildingCode.house5,
        classCode: BuildingClassCode.house,
        producing: Resources.create({
            money: 10
        }),
        demanding: Resources.create({
            food: 10,
            electricity: 2,
            water: 2
        }),
        citizenCapacity: 6,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 1500,
            wood: 50,
            stone: 150,
            iron: 150
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({
            money: 1500
        }),
        name: "house",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.cityHall,
        classCode: BuildingClassCode.municipal,
        producing: Resources.create({
            money: 1,
            food: 3,
            stone: 1,
            wood: 1
        }),
        demanding: Resources.zero,
        constructionTime: 3000,
        constructionCost: Resources.create({
            stone: 20,
            wood: 20
        }),
        researchState: ResearchState.finished,
        researchTime: 3000,
        researchCost: Resources.zero,
        name: "city hall",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.farm,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 3000,
        constructionCost: Resources.zero,
        researchState: ResearchState.available,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "farm",
        gather: null,
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



    buildingData[BuildingCode.smallCoalPlant] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.smallCoalPlant,
        classCode: BuildingClassCode.municipal,
        producing: Resources.create({
            electricity: 5
        }),
        demanding: Resources.create({
            coal: 1
        }),
        constructionTime: 10000,
        constructionCost: Resources.create({
            money: 100,
            stone: 10
        }),
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: Resources.create({money: 100}),
        name: "small coal plant",
        gather: null,
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
        size: 0x33,
        sizeX: 3,
        sizeY: 3,
        buildingCode: BuildingCode.windTurbine,
        classCode: BuildingClassCode.municipal,
        producing: Resources.create({
            electricity: 5
        }),
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 50,
            iron: 50
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 100}),
        name: "wind turbine",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.waterTower,
        classCode: BuildingClassCode.municipal,
        producing: Resources.create({
            water: 5
        }),
        demanding: Resources.zero,
        constructionTime: 10000,
        constructionCost: Resources.create({
            money: 50,
            stone: 50
        }),
        researchState: ResearchState.finished,
        researchTime: 5000,
        researchCost: Resources.create({money: 100}),
        name: "water tower",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.waterPump,
        classCode: BuildingClassCode.municipal,
        producing: Resources.create({
            water: 10
        }),
        demanding: Resources.zero,
        constructionTime: 10000,
        constructionCost: Resources.create({
            money: 100,
            stone: 40,
            iron: 40
        }),
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: Resources.create({money: 100}),
        name: "water pump station",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.smallMarket,
        classCode: BuildingClassCode.commerce,
        producing: Resources.create({
            money: 100
        }),
        demanding: Resources.zero,
        constructionTime: 10000,
        constructionCost: Resources.create({
            money: 50
        }),
        researchState: ResearchState.available,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        name: "small market",
        gather: null,
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.lumberMill,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 3000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 0,
        researchCost: Resources.zero,
        name: "lumber mill",
        gather: ResourceCode.wood,
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

    buildingData[BuildingCode.oilRig] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.oilRig,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 10000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.oil,
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

    buildingData[BuildingCode.coalMine] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.coalMine,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.coal,
        name: "coal mine",
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
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.stoneQuarry,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.stone,
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

    buildingData[BuildingCode.uraniumMine] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.uraniumMine,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.uranium,
        name: "uranium mine",
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

    buildingData[BuildingCode.gasWell] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.gasWell,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.gas,
        name: "gas well",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 21,
                path: "buildings/testbuilding2.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    buildingData[BuildingCode.ironMine] = {
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.ironMine,
        classCode: BuildingClassCode.industry,
        producing: Resources.zero,
        demanding: Resources.zero,
        constructionTime: 5000,
        constructionCost: Resources.create({
            money: 100
        }),
        researchState: ResearchState.finished,
        researchTime: 10000,
        researchCost: Resources.create({money: 200}),
        gather: ResourceCode.iron,
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
