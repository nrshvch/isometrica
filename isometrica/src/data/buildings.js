//TODO add shack http://en.wikipedia.org/wiki/Shack
//TODO add oldschool trailer house

//TODO !!! BUILDINGDATA HAS CIRCULAR DEPENDENCIES -> Core need BuildingData and vice versa; ATM it works as it is, but be aware

import namespace from "namespace";
import BuildingCode from "./buildingcode";
import BuildingClassCode from "./classcode";
import RenderLayer from "../client/renderlayer";
import Flats from "./flats";
import Offices from "./offices";
import Shops from "./shops";
import Houses from "./houses";
import Parks from "./parks";
import Civic from "./civic";
import Oldtown from "./oldtown";
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
  //nothing to keep up: a lane out to a farm costs what it costs to lay and
  //no more, so a town can reach out into the country
  demanding: {},
  //dug out, then a bed of crushed stone rolled in, then the asphalt
  //(client/roadworks) - nothing drives on it till then
  constructionTime: 40000,
  //asphalt's too, the others a share of it
  constructionCost: {
    money: 1000,
  },
  name: "road",
  //drawn as client/roadview draws it (shared/gen/roads)
  sprites: [],
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

buildingData[BuildingCode.cityHall] = {
  hidden: true,
  sizeX: 1,
  sizeY: 1,
  buildingCode: BuildingCode.cityHall,
  classCode: BuildingClassCode.municipal,
  producing: {},
  //the city pays for its own offices - a flat sum, which the taxes of a
  //single trailer
  //just cover: the first house keeps the town afloat, the second one
  //starts earning (nothing is due while the town stands empty)...
  demanding: {
    money: 40,
  },
  //a few clerks, so that the first proper house in town has somebody
  //working before there is a shop to work in
  jobs: 4,
  constructionTime: 30000,
  //it comes with the city, so there is nobody to bill for it
  constructionCost: {},
  name: "town hall",
  //never drawn: no city has one put up any more - a city is founded with
  //its first house (core/city), and puts up a town hall of data/civic's -
  //kept for its upkeep, in the saves of before that have one
  sprites: [],
};

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

/**
 * Each variant of a type (see house) made a building of its own: everything
 * the type is by the numbers, with the variant's code, name and drawing, and
 * kept out of the catalogue - that is where the type is picked. The type is
 * left with its variants' codes, for whatever puts one down to pick from -
 * all but the wild ones, which only the world puts down.
 */
function expandVariants(data) {
  var type, variant, building, code, key, picked, i;

  for (code in data) {
    type = data[code];

    if (type.variants === undefined) continue;

    picked = [];

    for (i = 0; i < type.variants.length; i++) {
      variant = type.variants[i];
      building = {};

      for (key in type) building[key] = type[key];

      delete building.variants;

      for (key in variant) building[key] = variant[key];

      building.hidden = true;
      building.variantOf = type.buildingCode;
      data[variant.buildingCode] = building;

      if (!variant.wild) picked.push(variant.buildingCode);
    }

    type.variants = picked;
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
  Civic.buildings(),
  Oldtown.buildings(),
);

export default buildingData;
