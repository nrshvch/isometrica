/**
 * What a building burns down to (core/building ignite, burn), by what it is
 * built of and how - as buildings do:
 *
 *   - "frame": built round a frame of concrete - a block of flats, an office
 *     block, a department store, the waterworks: the fire guts it, but its
 *     frame and its floors stand, its roof on it, charred black, black holes
 *     where its windows were. Weakened, it may come down some hours after,
 *     to rubble and the broken stumps of its frame (collapsesAt);
 *   - "walls": walls of brick or stone under a roof of timber or steel - a
 *     bungalow, a shop, a supermarket, a mall, a market hall, a church, the
 *     town hall: the roof burns and falls in, the walls stand, roofless;
 *   - "fallen": built of timber, or two storeys of house under a pitched
 *     roof of tiles - a cottage, a farm, a croft, the old town's houses, a
 *     town house, a terrace, a villa: its roof and its floors fall in on
 *     each other, the stumps of its ground floor's walls left round a heap
 *     of charred beams and rubble.
 *
 * Most of a kind go the way it goes, a few another way (WAYS) - the same
 * every time for the same building.
 */
import BuildingData from "../data/buildings";

//by generator, and by design where the generator paints several (houses,
//shops - shared/gen/houses DESIGNS, shared/gen/shops): the way
//most of them go, how likely that is, and the way the rest go
var WAYS = {
  flats: ["frame", 0.85, "walls"],
  offices: ["frame", 0.9, "walls"],
  utilities: ["frame", 0.9, "walls"],
  civic: ["walls", 0.9, "fallen"],
  oldtown: ["fallen", 0.8, "walls"],
  houses: {
    //a village's, timber and thatch
    cottage: ["fallen", 0.9, "walls"],
    croft: ["fallen", 0.9, "walls"],
    sidecroftw: ["fallen", 0.9, "walls"],
    sidecrofte: ["fallen", 0.9, "walls"],
    farm: ["fallen", 0.85, "walls"],
    farmyard: ["fallen", 0.85, "walls"],
    longhouse: ["fallen", 0.9, "walls"],
    //one storey of brick under a light roof: a bungalow, along the street
    //or end on to it
    bungalow: ["walls", 0.8, "fallen"],
    wide: ["walls", 0.8, "fallen"],
    narrow: ["walls", 0.8, "fallen"],
    //two storeys under a pitched roof of tiles
    deep: ["fallen", 0.75, "walls"],
    long: ["fallen", 0.75, "walls"],
    row: ["fallen", 0.75, "walls"],
    pair: ["fallen", 0.75, "walls"],
    semi: ["fallen", 0.75, "walls"],
    //two storeys of stone
    villa: ["fallen", 0.55, "walls"],
  },
  shops: {
    small: ["walls", 0.75, "fallen"],
    store: ["walls", 0.85, "fallen"],
    bigbox: ["walls", 0.9, "frame"],
    mall: ["walls", 0.8, "frame"],
    dept: ["frame", 0.8, "walls"],
    market: ["walls", 0.8, "fallen"],
    mkthall: ["walls", 0.85, "fallen"],
    covmkt: ["walls", 0.8, "fallen"],
    //stalls under awnings
    openmkt: ["fallen", 0.9, "walls"],
  },
};

//how likely a building gutted to its frame is to come down after, and how
//many hours after it was set on fire, at the least and at the most
var FALLS_LATER = 0.55,
  LATER = [12, 30];

//a number 0..1 for a tile and a salt, the same every time
function hash(tile, salt) {
  var h = Math.imul((tile | 0) ^ Math.imul(salt, 0x27d4eb2d), 0x9e3779b1);

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

//its design, by the names of its parts - the first that ways has: "bungalow"
//for houses/bungalow32/..., less any size after it - not its car park's
function designOf(building, ways) {
  var look = building.look,
    tiles = look && look.tiles ? look.tiles : [];

  for (var i = 0; i < tiles.length; i++)
    for (var k = 0; k < (tiles[i].parts || []).length; k++) {
      var design = String(tiles[i].parts[k]).split("/")[1].replace(/\d+$/, "");

      if (ways[design] !== undefined) return design;
    }

  return null;
}

/**
 * What it burns down to: "frame", "walls" or "fallen".
 *
 * @param building {{buildingCode: number, tile: number, look: Object}} the
 *        core's, or anything that says as much of it
 * @returns {string}
 */
function outcome(building) {
  var data = building.data || BuildingData[building.buildingCode],
    gen = data && data.compound ? data.compound.gen : null,
    way = gen !== null ? WAYS[gen] : null;

  if (way && !Array.isArray(way)) way = way[designOf(building, way)] || null;

  //anything else: its walls stand
  if (!way) return "walls";

  return hash(building.tile, 1) < way[1] ? way[0] : way[2];
}

/**
 * When, of the game's time, a building gutted to its frame comes down - or
 * null for one that stands (FALLS_LATER, LATER).
 *
 * @returns {number|null}
 */
function collapsesAt(building) {
  if (building.fire === null || building.fire === undefined) return null;
  if (outcome(building) !== "frame" || hash(building.tile, 2) >= FALLS_LATER)
    return null;

  var hours = LATER[0] + (LATER[1] - LATER[0]) * hash(building.tile, 3);

  return building.fire + hours * 3600000;
}

export default { outcome: outcome, collapsesAt: collapsesAt };
