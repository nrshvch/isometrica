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
import Flats from "./flats";
import Offices from "./offices";
import Shops from "./shops";
import Houses from "./houses";
import Parks from "./parks";
import Trees from "./trees";

var Core = namespace("Isometrica.Core");

var buildingData = (Core.BuildingData = {});

//one of the trees, picked at random the way a house is (see house) - and
//the same ones the world grows on its own (see core/ambient)
buildingData[BuildingCode.tree] = {
  //not offered: the world grows them by itself
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.tree,
  classCode: BuildingClassCode.tree,
  producing: {},
  demanding: {},
  constructionTime: 0,
  //a sapling costs a little less than felling a grown tree (Config.clearTileCost)
  constructionCost: {
    money: 200,
  },
  name: "tree",
  //painted, see data/trees
  variants: Trees.variants(RenderLayer.buildingsLayer),
};

buildingData[BuildingCode.cliff] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.cliff,
  classCode: BuildingClassCode.tree,
  producing: {},
  demanding: {},
  constructionTime: 0,
  //rock is hauled in, so it costs more than a tree
  constructionCost: {
    money: 500,
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
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 24,
      path: "cliffr.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
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
    money: 5,
  },
  constructionTime: 0,
  constructionCost: {
    money: 500,
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
      layer: RenderLayer.roadLayer,
    },
  ],
  roadGates: [
    [1, 0],
    [0, -1],
    [-1, 0],
    [0, 1],
  ],
  waypoints: {},
  tileEffect: {
    eco: -1,
    crime: 1,
  },
  tileEffectRadius: 1,
};

buildingData[BuildingCode.house0] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
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
  constructionTime: 30000,
  constructionCost: {
    money: 1500,
  },
  name: "shanty",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 23,
      path: "buildings/house0.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 23,
      path: "buildings/house0r.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  roadGates: [
    [-1, 0], //,[0,-1],[1,0],[0,1]
  ],
  tileEffect: {
    eco: -10,
    crime: 1,
  },
  tileEffectRadius: 2,
};

buildingData[BuildingCode.house1] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.house1,
  classCode: BuildingClassCode.house,
  producing: {},
  demanding: {},
  //a cottage on a lane, drawing from a well of its own
  requires: {
    road: true,
  },
  //cheap enough to get by without a job in town, like a trailer
  needsJobs: false,
  citizenCapacity: 3,
  constructionTime: 30000,
  constructionCost: {
    money: 3000,
  },
  name: "cottage",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 27,
      pivotY: 23,
      path: "buildings/house1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 25,
      pivotY: 23,
      path: "buildings/house1r.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

buildingData[BuildingCode.house2] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 1,
  sizeY: 2,
  buildingCode: BuildingCode.house2,
  classCode: BuildingClassCode.house,
  producing: {},
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  //people in a house of their own are worth more a head to the treasury
  //than the same people stacked in flats
  taxPerResident: 25,
  citizenCapacity: 8,
  constructionTime: 30000,
  constructionCost: {
    money: 12000,
  },
  name: "residential house",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 31,
      path: "buildings/house2-2.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 26,
      path: "buildings/house2-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 31,
      path: "buildings/house2r-2.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 26,
      path: "buildings/house2r-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

//A building type rather than a building: the player puts down a villa and
//it goes up as one of its variants, picked at random - so that a street of
//them need not be the same house over and over, and nobody has to pick
//one by one. The variants are buildings of their own, each with a name,
//and only differ from one another in how they are drawn.
buildingData[BuildingCode.house] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 2,
  sizeY: 1,
  buildingCode: BuildingCode.house,
  classCode: BuildingClassCode.house,
  producing: {},
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  constructionTime: 50000,
  constructionCost: {
    money: 22000,
  },
  name: "villa",
  //people in a house of their own are worth more a head to the treasury
  //than the same people stacked in flats
  taxPerResident: 25,
  citizenCapacity: 12,
  //each a building of its own - its code and name, and what it has to be
  //drawn by: sprites, and smokeSource where it has a chimney. One that
  //is turned was painted for the footprint turned round, and is drawn
  //turned round to fit
  variants: [
    //red roof, one storey
    {
      buildingCode: BuildingCode.house3,
      name: "bungalow",
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 19,
          path: "buildings/house3-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 1,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 40,
          path: "buildings/house3-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      spritesRotate: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 19,
          path: "buildings/house3r-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 0,
          y: 0,
          z: 1,
          pivotX: 32,
          pivotY: 40,
          path: "buildings/house3r-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      smokeSource: [1.25, 2.5, 0.85],
    },
    //two storeys, ivy up the front
    {
      buildingCode: BuildingCode.house4,
      name: "townhouse",
      turned: true,
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 28,
          path: "buildings/house4-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 0,
          y: 0,
          z: 1,
          pivotX: 32,
          pivotY: 41,
          path: "buildings/house4-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      spritesRotate: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 31,
          pivotY: 28,
          path: "buildings/house4r-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 1,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 41,
          path: "buildings/house4r-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      smokeSource: [0.75, 3.5, 1.25],
    },
    //dark roof, dormer windows
    {
      buildingCode: BuildingCode.house5,
      name: "chalet",
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 35,
          path: "buildings/house5-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 1,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 31,
          path: "buildings/house5-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      spritesRotate: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 35,
          path: "buildings/house5r-1.png",
          layer: RenderLayer.buildingsLayer,
        },
        {
          x: 0,
          y: 0,
          z: 1,
          pivotX: 31,
          pivotY: 31,
          path: "buildings/house5r-2.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
    },
  ],
};

buildingData[BuildingCode.cityHall] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
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
    money: 40,
  },
  //...and so much for every tile of land bought on top of that, which is
  //what makes sprawl expensive and a tight, tall city cheap to run
  upkeepPerTile: 15,
  //a few clerks, so that the first proper house in town has somebody
  //working before there is a shop to work in
  jobs: 4,
  constructionTime: 30000,
  //it comes with the city, so there is nobody to bill for it
  constructionCost: {},
  name: "town hall",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 46,
      path: "buildings/cityhall.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 46,
      path: "buildings/cityhallr.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

//Commerce runs on the same curve as the houses: the smaller the building,
//the sooner it earns itself back and the more it makes of every worker,
//the bigger, the more it makes of every tile. A young city is short of
//money and has land to spare, so it builds shops; once land costs a
//fortune a block, it is worth sinking years into a tower.
//
//                 cost   jobs  /tick  payback  per tile
//  store         10000    20    150      67       150
//  mall          90000   140    960      94       240
//  offices      250000   200   1100     227      1100
//
//Every citizen in a house that needs jobs needs a job of their own, so the
//job counts are generous - a street of houses gets by on a couple of
//shops, the way a real one would.

//A corner shop: nobody lives in it, it just takes the city's money over the
//counter and pays its share into the treasury - as long as customers can get
//to it and there is water in the tap.
buildingData[BuildingCode.smallCommerce] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.smallCommerce,
  classCode: BuildingClassCode.commerce,
  producing: {
    money: 150,
  },
  //how many citizens it takes to run - it only makes its money with them in
  jobs: 20,
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  constructionTime: 50000,
  constructionCost: {
    money: 10000,
  },
  name: "small commerce",
  //a small business on the corner, whatever it is - put down as one of
  //these at random, the same building by the numbers (see house)
  variants: [
    {
      buildingCode: BuildingCode.shop,
      name: "store",
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 48,
          path: "buildings/shop.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      spritesRotate: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 48,
          path: "buildings/shopr.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
    },
    {
      buildingCode: BuildingCode.bank,
      name: "bank",
      sprites: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 49,
          path: "buildings/bank.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
      spritesRotate: [
        {
          x: 0,
          y: 0,
          z: 0,
          pivotX: 32,
          pivotY: 49,
          path: "buildings/bankr.png",
          layer: RenderLayer.buildingsLayer,
        },
      ],
    },
  ],
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
//  shanty           1500    2    20      2       40       38
//  cottage          3000    3    20      3       60       50
//  residential     12000    8    25      4      100       60
//  villa           22000   12    25      6      150       73
//  flats           50000   50    10     12.5    125      100
//
//Tax is only half of what a head is worth: everybody in town can hold a
//job, and a worker in an office is another $6 a tick on top. Counting
//that, a tile of houses is worth about 180 a tick and a tile of
//flats about 200 - near enough the same money, with the flats holding
//twice the people and the houses paying for themselves sooner.
buildingData[BuildingCode.apartments] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 2,
  sizeY: 2,
  buildingCode: BuildingCode.apartments,
  classCode: BuildingClassCode.house,
  producing: {},
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  //the cheapest roof per head in the city, and the rents to match: what
  //the treasury gets out of a block of flats is its people's work, not
  //their taxes
  taxPerResident: 10,
  citizenCapacity: 50,
  constructionTime: 150000,
  constructionCost: {
    money: 50000,
  },
  name: "flats",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 16,
      path: "buildings/apartments-0-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 61,
      path: "buildings/apartments-0-1.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 17,
      path: "buildings/apartments-1-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 60,
      path: "buildings/apartments-1-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 16,
      path: "buildings/apartmentsr-0-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 61,
      path: "buildings/apartmentsr-1-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 17,
      path: "buildings/apartmentsr-0-1.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 60,
      path: "buildings/apartmentsr-1-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

buildingData[BuildingCode.bigShop] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 2,
  sizeY: 2,
  buildingCode: BuildingCode.bigShop,
  classCode: BuildingClassCode.commerce,
  producing: {
    money: 960,
  },
  jobs: 140,
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  constructionTime: 100000,
  constructionCost: {
    money: 90000,
  },
  name: "mall",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 16,
      path: "buildings/bigshop-0-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 49,
      path: "buildings/bigshop-0-1.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 14,
      path: "buildings/bigshop-1-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 46,
      path: "buildings/bigshop-1-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 16,
      path: "buildings/bigshopr-0-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 49,
      path: "buildings/bigshopr-1-0.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 0,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 14,
      path: "buildings/bigshopr-0-1.png",
      layer: RenderLayer.buildingsLayer,
    },
    {
      x: 1,
      y: 0,
      z: 1,
      pivotX: 32,
      pivotY: 46,
      path: "buildings/bigshopr-1-1.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

//nothing makes more money than an office tower, and nothing costs more to
//put up - a late-game building, not a first one
buildingData[BuildingCode.office] = {
  //drawn by hand: kept for the cities that have it, no longer offered
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.office,
  classCode: BuildingClassCode.commerce,
  producing: {
    money: 1100,
  },
  //five apartment blocks' worth of people go to work in it
  jobs: 180,
  demanding: {},
  requires: {
    road: true,
    water: true,
  },
  constructionTime: 200000,
  constructionCost: {
    money: 250000,
  },
  name: "offices",
  sprites: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 101,
      path: "buildings/office.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
  spritesRotate: [
    {
      x: 0,
      y: 0,
      z: 0,
      pivotX: 32,
      pivotY: 101,
      path: "buildings/officer.png",
      layer: RenderLayer.buildingsLayer,
    },
  ],
};

// buildingData[BuildingCode.farm] = {
//     sizeX: 1,
//     sizeY: 1,
//     buildingCode: BuildingCode.farm,
//     classCode: BuildingClassCode.industry,
//     producing: {},
//     demanding: {},
//     constructionTime: 30000,
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
//         money: 10
//     },
//     constructionTime: 50000,
//     constructionCost: {
//         money: 500,
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
    money: 50,
  },
  //how far it waters, in tiles
  waterRadius: 6,
  constructionTime: 100000,
  constructionCost: {
    money: 2500,
  },
  name: "water tower",
  //drawn out of parts, see shared/gen/utilities and client/compoundbuilding
  compound: {
    gen: "utilities",
    footprint: "watertower",
    sizeX: 1,
    sizeY: 1,
  },
};

//The pump station: what a town grown past its water towers waters itself
//with - three times as far as a tower, at four times its upkeep.
buildingData[BuildingCode.waterPump] = {
  sizeX: 2,
  sizeY: 2,
  buildingCode: BuildingCode.waterPump,
  classCode: BuildingClassCode.municipal,
  producing: {},
  demanding: {
    money: 4 * buildingData[BuildingCode.waterTower].demanding.money,
  },
  //how far it waters, in tiles
  waterRadius: 3 * buildingData[BuildingCode.waterTower].waterRadius,
  constructionTime: 160000,
  constructionCost: {
    money: 12000,
  },
  name: "pump station",
  //drawn out of parts, see shared/gen/utilities and client/compoundbuilding
  compound: {
    gen: "utilities",
    footprint: "pumpstation",
    sizeX: 2,
    sizeY: 2,
  },
};

// buildingData[BuildingCode.smallMarket] = {
//     sizeX: 1,
//     sizeY: 1,
//     buildingCode: BuildingCode.smallMarket,
//     classCode: BuildingClassCode.commerce,
//     producing: {
//         money: 1000
//     },
//     demanding: {},
//     constructionTime: 100000,
//     constructionCost: {
//         money: 500
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
//     constructionTime: 30000,
//     constructionCost: {
//         money: 1000
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
//     constructionTime: 100000,
//     constructionCost: {
//         money: 1000
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
//     constructionTime: 50000,
//     constructionCost: {
//         money: 1000
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
//     constructionTime: 50000,
//     constructionCost: {
//         money: 1000
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

/**
 * Each variant of a type (see house) made a building of its own: everything
 * the type is by the numbers, with the variant's code, name and drawing, and
 * kept out of the catalogue - that is where the type is picked. The type is
 * left with its variants' codes, for whatever puts one down to pick from.
 */
function expandVariants(data) {
  var type, variant, building, code, key, i;

  for (code in data) {
    type = data[code];

    if (type.variants === undefined) continue;

    for (i = 0; i < type.variants.length; i++) {
      variant = type.variants[i];
      building = {};

      for (key in type) building[key] = type[key];

      delete building.variants;

      for (key in variant) building[key] = variant[key];

      building.hidden = true;
      building.variantOf = type.buildingCode;
      data[variant.buildingCode] = building;

      type.variants[i] = variant.buildingCode;
    }
  }
}

expandVariants(buildingData);

//the blocks of flats put together out of painted parts
Object.assign(
  buildingData,
  Flats.buildings(),
  Offices.buildings(),
  Shops.buildings(),
  Houses.buildings(),
  Parks.buildings(),
);

export default buildingData;
