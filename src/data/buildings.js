//TODO add shack http://en.wikipedia.org/wiki/Shack
//TODO add oldschool trailer house

//TODO !!! BUILDINGDATA HAS CIRCULAR DEPENDENCIES -> Core need BuildingData and vice versa; ATM it works as it is, but be aware

import namespace from "namespace";
import BuildingCode from "data/buildingcode";
import BuildingClassCode from "./classcode";
/**
 * @type {ResearchDirection}
 */
import ResearchDirection from "core/researchdirection";
/**
 * @type {ResearchState}
 */
import ResearchState from "core/researchstate";
import RenderLayer from "client/renderlayer";
/**
 * @type {GatherReq}
 */
import GatherReq from "core/gatherreq";
/**
 * What the gatherers below stand on, once they are woken up again.
 * @type {DepositCode}
 */
import DepositCode from "core/depositcode";
/**
 * @type {BuildingPositioning}
 */
import BuildingPositioning from "core/buildingpositioning";

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
        hidden: true,
        size: 0x11,
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.road,
        classCode: BuildingClassCode.road,
        producing: {},
        //a street is the city's to keep up, and there are always a lot of them
        demanding: {
            money: 0.5
        },
        constructionTime: 0,
        constructionCost: {
            money: 25
        },
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
        producing: {},
        demanding: {},
        //a trailer needs nothing of anybody - park it in a field and someone
        //will live in it, which is what a city has before it has streets
        requires: {},
        //it sleeps a couple: the cheapest roof per head there is, paid for
        //with the view
        citizenCapacity: 2,
        constructionTime: 3000,
        constructionCost: {
            money: 150
        },
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
        //a cottage on a lane, drawing from a well of its own
        requires: {
            road: true
        },
        citizenCapacity: 3,
        constructionTime: 3000,
        constructionCost: {
            money: 300
        },
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
        producing: {},
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        citizenCapacity: 5,
        constructionTime: 3000,
        constructionCost: {
            money: 600
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
        producing: {},
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 5000,
        constructionCost: {
            money: 800
        },
        name: "cottage house",
        citizenCapacity: 6,
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
        producing: {},
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 5000,
        constructionCost: {
            money: 1400
        },
        name: "two story house",
        citizenCapacity: 10,
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
        producing: {},
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        citizenCapacity: 8,
        constructionTime: 5000,
        constructionCost: {
            money: 1100
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
        producing: {},
        //the city pays for its own offices - a flat sum for the building...
        demanding: {
            money: 2
        },
        //...and so much for every tile of land it has to administer, which is
        //what makes sprawl expensive and a tight, tall city cheap to run
        upkeepPerTile: 0.15,
        constructionTime: 3000,
        //it comes with the city, so there is nobody to bill for it
        constructionCost: {},
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

    // buildingData[BuildingCode.farm] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.farm,
    //     classCode: BuildingClassCode.industry,
    //     producing: {},
    //     demanding: {},
    //     constructionTime: 3000,
    //     constructionCost: {},
    //     name: "farm",
    //     requirement: GatherReq.inGrassLand,
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };

    // buildingData[BuildingCode.windTurbine] = {
    //     sizeX: 3,
    //     sizeY: 3,
    //     buildingCode: BuildingCode.windTurbine,
    //     classCode: BuildingClassCode.municipal,
    //     producing: {
    //         electricity: 5
    //     },
    //     demanding: {
    //         money: 1
    //     },
    //     constructionTime: 5000,
    //     constructionCost: {
    //         money: 50,
    //         iron: 50
    //     },
    //     name: "wind turbine",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };

    //The one thing that turns money into something the houses need. It waters
    //the ground around it - see core/city/citywater - so where it goes matters
    //as much as whether the city can afford to run it.
    buildingData[BuildingCode.waterTower] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.waterTower,
        classCode: BuildingClassCode.municipal,
        producing: {},
        demanding: {
            money: 5
        },
        //how far it waters, in tiles
        waterRadius: 6,
        constructionTime: 10000,
        constructionCost: {
            money: 250
        },
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

    // buildingData[BuildingCode.waterPump] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.waterPump,
    //     classCode: BuildingClassCode.municipal,
    //     producing: {
    //         water: 15
    //     },
    //     demanding: {
    //         money: 2
    //     },
    //     constructionTime: 10000,
    //     constructionCost: {
    //         money: 100,
    //         stone: 40,
    //         iron: 40
    //     },
    //     name: "water pump station",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };
    //
    // buildingData[BuildingCode.smallMarket] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.smallMarket,
    //     classCode: BuildingClassCode.commerce,
    //     producing: {
    //         money: 100
    //     },
    //     demanding: {},
    //     constructionTime: 10000,
    //     constructionCost: {
    //         money: 50
    //     },
    //     name: "small market",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };
    //
    //
    // //Gatherers
    // buildingData[BuildingCode.lumberMill] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.lumberMill,
    //     classCode: BuildingClassCode.industry,
    //     producing: {
    //         wood: 5
    //     },
    //     demanding: {},
    //     constructionTime: 3000,
    //     constructionCost: {
    //         money: 100
    //     },
    //     name: "lumber mill",
    //     requirement: GatherReq.nearTree,
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };
    //
    // buildingData[BuildingCode.oilWell] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.oilWell,
    //     classCode: BuildingClassCode.industry,
    //     positioning: BuildingPositioning.resource,
    //     resource: DepositCode.oil,
    //     producing: {
    //         oil: 5
    //     },
    //     demanding: {},
    //     constructionTime: 10000,
    //     constructionCost: {
    //         money: 100
    //     },
    //     requirement: GatherReq.oilTile,
    //     name: "oil rig",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };
    //
    // buildingData[BuildingCode.stoneQuarry] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     buildingCode: BuildingCode.stoneQuarry,
    //     classCode: BuildingClassCode.industry,
    //     positioning: BuildingPositioning.resource,
    //     resource: DepositCode.stone,
    //     producing: {
    //         stone: 5
    //     },
    //     demanding: {},
    //     constructionTime: 5000,
    //     constructionCost: {
    //         money: 100
    //     },
    //     requirement: GatherReq.stoneTile,
    //     name: "stone quarry",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 30,
    //             path: "buildings/testbuilding0.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };
    //
    // buildingData[BuildingCode.ironMine] = {
    //     sizeX: 1,
    //     sizeY: 1,
    //     positioning: BuildingPositioning.resource,
    //     resource: DepositCode.iron,
    //     buildingCode: BuildingCode.ironMine,
    //     classCode: BuildingClassCode.industry,
    //     producing: {
    //         iron: 5
    //     },
    //     demanding: {},
    //     constructionTime: 5000,
    //     constructionCost: {
    //         money: 100
    //     },
    //     requirement: GatherReq.ironTile,
    //     name: "iron mine",
    //     sprites: [
    //         {
    //             x: 0,
    //             y: 0,
    //             z: 0,
    //             pivotX: 32,
    //             pivotY: 26,
    //             path: "buildings/testbuilding1.png",
    //             layer: RenderLayer.buildingsLayer
    //         }
    //     ]
    // };

export default buildingData;
