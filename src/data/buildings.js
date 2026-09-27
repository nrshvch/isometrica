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
        //a sapling costs a little less than felling a grown tree (Config.clearTileCost)
        constructionCost: {
            money: 20
        },
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
        constructionCost: {
            money: 20
        },
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
        //rock is hauled in, so it costs more than a tree
        constructionCost: {
            money: 50
        },
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
        //a road's piece follows its neighbours, never the way it was put down
        canRotate: false,
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
        //nobody who lives in a trailer needs a job in town to afford it
        needsJobs: false,
        //it sleeps a couple: the cheapest roof per head there is, paid for
        //with the view
        citizenCapacity: 2,
        constructionTime: 3000,
        constructionCost: {
            money: 150
        },
        name: "mobile house",
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
        //cheap enough to get by without a job in town, like a trailer
        needsJobs: false,
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
        //people in a house of their own are worth more a head to the treasury
        //than the same people stacked in flats
        taxPerResident: 2.5,
        citizenCapacity: 8,
        constructionTime: 3000,
        constructionCost: {
            money: 1200
        },
        name: "small residential house",
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
            money: 1600
        },
        name: "cottage house",
        //people in a house of their own are worth more a head to the treasury
        //than the same people stacked in flats
        taxPerResident: 2.5,
        citizenCapacity: 9,
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
            money: 2200
        },
        name: "two story house",
        //people in a house of their own are worth more a head to the treasury
        //than the same people stacked in flats
        taxPerResident: 2.5,
        citizenCapacity: 12,
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
        //people in a house of their own are worth more a head to the treasury
        //than the same people stacked in flats
        taxPerResident: 2.5,
        citizenCapacity: 9,
        constructionTime: 5000,
        constructionCost: {
            money: 1600
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
        //the city pays for its own offices - a flat sum for the building and
        //the block it was founded on, which the taxes of a single trailer
        //just cover: the first house keeps the town afloat, the second one
        //starts earning (nothing is due while the town stands empty)...
        demanding: {
            money: 4
        },
        //...and so much for every tile of land bought on top of that, which is
        //what makes sprawl expensive and a tight, tall city cheap to run
        upkeepPerTile: 1.5,
        //a few clerks, so that the first proper house in town has somebody
        //working before there is a shop to work in
        jobs: 4,
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

    //Commerce runs on the same curve as the houses: the smaller the building,
    //the sooner it earns itself back and the more it makes of every worker,
    //the bigger, the more it makes of every tile. A young city is short of
    //money and has land to spare, so it builds shops; once land costs a
    //fortune a block, it is worth sinking years into a tower.
    //
    //                cost   jobs  /tick  payback  per tile
    //  shop          1000    20     15      67       15
    //  bank          1800    30     20      90       20
    //  big shop      9000   140     96      94       24
    //  office       25000   200    110     227      110
    //
    //Every citizen in a house that needs jobs needs a job of their own, so the
    //job counts are generous - a street of houses gets by on a shop and a
    //bank, the way a real one would.

    //A corner shop: nobody lives in it, it just takes the city's money over the
    //counter and pays its share into the treasury - as long as customers can get
    //to it and there is water in the tap.
    buildingData[BuildingCode.shop] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.shop,
        classCode: BuildingClassCode.commerce,
        producing: {
            money: 15
        },
        //how many citizens it takes to run - it only makes its money with them in
        jobs: 20,
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 5000,
        constructionCost: {
            money: 1000
        },
        name: "shop",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 48,
                path: "buildings/shop.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    //a block of flats: a street's worth of people on four tiles - dearer per
    //head than any house, what it saves is land.
    //
    //Houses and flats are the same tier of building and pull opposite ways.
    //A house takes more land for the same people and pays more a head for it;
    //a block of flats is the cheap way to grow - little land, little tax, and
    //fifty more pairs of hands for the shops and offices, which is where the
    //city gets its money back. So a player with land to spare builds houses
    //and earns, and one hemmed in builds flats and grows.
    //
    //                   cost  heads  tax   heads   money   payback
    //                                /head /tile   /tile
    //  mobile house      150    2    2      2        4        38
    //  tiny house        300    3    2      3        6        50
    //  small house      1200    8    2.5    4       10        60
    //  cottage / house  1600    9    2.5    4.5     11.3      71
    //  two story        2200   12    2.5    6       15        73
    //  apartments       5000   50    1     12.5     12.5     100
    //
    //Tax is only half of what a head is worth: everybody in town can hold a
    //job, and a worker in an office is another $0.60 a tick on top. Counting
    //that, a tile of two story houses is worth about 18 a tick and a tile of
    //flats about 20 - near enough the same money, with the flats holding
    //twice the people and the houses paying for themselves sooner.
    //
    //The cottage and the house are the same building in two looks, so that a
    //street of them need not be the same house over and over.
    buildingData[BuildingCode.apartments] = {
        sizeX: 2,
        sizeY: 2,
        buildingCode: BuildingCode.apartments,
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        //the cheapest roof per head in the city, and the rents to match: what
        //the treasury gets out of a block of flats is its people's work, not
        //their taxes
        taxPerResident: 1,
        citizenCapacity: 50,
        constructionTime: 15000,
        constructionCost: {
            money: 5000
        },
        name: "apartment block",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 16,
                path: "buildings/apartments-0-0.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 0,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 61,
                path: "buildings/apartments-0-1.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 17,
                path: "buildings/apartments-1-0.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 60,
                path: "buildings/apartments-1-1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    //pays better than a shop over the same bit of pavement
    buildingData[BuildingCode.bank] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.bank,
        classCode: BuildingClassCode.commerce,
        producing: {
            money: 20
        },
        jobs: 30,
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 8000,
        constructionCost: {
            money: 1800
        },
        name: "bank",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 49,
                path: "buildings/bank.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    //a supermarket with a car park of its own: out-earns a row of banks on the
    //same land, but it takes a long while to save up for
    buildingData[BuildingCode.bigShop] = {
        sizeX: 2,
        sizeY: 2,
        buildingCode: BuildingCode.bigShop,
        classCode: BuildingClassCode.commerce,
        producing: {
            money: 96
        },
        jobs: 140,
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 10000,
        constructionCost: {
            money: 9000
        },
        name: "big shop",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 16,
                path: "buildings/bigshop-0-0.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 0,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 49,
                path: "buildings/bigshop-0-1.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 14,
                path: "buildings/bigshop-1-0.png",
                layer: RenderLayer.buildingsLayer
            },
            {
                x: 1,
                y: 0,
                z: 1,
                pivotX: 32,
                pivotY: 46,
                path: "buildings/bigshop-1-1.png",
                layer: RenderLayer.buildingsLayer
            }
        ]
    };

    //nothing makes more money than an office tower, and nothing costs more to
    //put up - a late-game building, not a first one
    buildingData[BuildingCode.office] = {
        sizeX: 1,
        sizeY: 1,
        buildingCode: BuildingCode.office,
        classCode: BuildingClassCode.commerce,
        producing: {
            money: 110
        },
        //five apartment blocks' worth of people go to work in it
        jobs: 180,
        demanding: {},
        requires: {
            road: true,
            water: true
        },
        constructionTime: 20000,
        constructionCost: {
            money: 25000
        },
        name: "office tower",
        sprites: [
            {
                x: 0,
                y: 0,
                z: 0,
                pivotX: 32,
                pivotY: 101,
                path: "buildings/office.png",
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
