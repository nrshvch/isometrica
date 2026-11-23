/**
 * What there is to build a town out of, by what each is to the town - read
 * off the game's own data (isometrica data/buildings), so that a building
 * added there is built here too: only what the catalogue offers, nothing
 * hidden or done away with.
 *
 *   village  - a village's houses, farms: no road, no water, no jobs wanted
 *   house    - town houses, terraces, semi-detached houses
 *   villa    - villas
 *   flats    - blocks of flats
 *   shop     - small shops
 *   store    - stores, supermarkets, department stores
 *   market   - farmers' markets, market halls
 *   office   - office blocks
 *   oldtown  - the old town
 *   park     - parks
 *   square   - a town square
 *   church, townhall
 *
 * Each by footprint - how many tiles along its front, the street it faces,
 * and how many deep (sizeX, sizeY) - as "wxd".
 */
import BuildingData from "isometrica/data/buildings";
import BuildingCode from "isometrica/data/buildingcode";

var kinds = null;

function kindOf(data) {
  var gen = data.compound.gen;

  if (gen === "houses")
    return data.tier === 1 ? "village" : data.tier === 2 ? "house" : "villa";
  if (gen === "flats") return "flats";
  if (gen === "offices") return "office";
  if (gen === "shops")
    return data.tier === 1 ? "shop" : data.tier === 2 ? "store" : "market";
  if (gen === "parks") return "park";
  if (gen === "oldtown") return "oldtown";
  if (gen === "civic")
    return data.compound.footprint === "square"
      ? "square"
      : data.townHall
        ? "townhall"
        : "church";

  return null;
}

/**
 * @returns {Object} kind -> "wxd" -> codes
 */
export function catalogue() {
  if (kinds !== null) return kinds;

  kinds = {};

  Object.keys(BuildingData).forEach(function (code) {
    var data = BuildingData[code];

    if (
      data === undefined ||
      data.hidden ||
      data.deprecated ||
      !data.compound ||
      data.variantOf !== undefined
    )
      return;

    var kind = kindOf(data);

    if (kind === null) return;

    var byFootprint = kinds[kind] || (kinds[kind] = {}),
      key = data.sizeX + "x" + data.sizeY;

    (byFootprint[key] || (byFootprint[key] = [])).push(+code);
  });

  return kinds;
}

/**
 * The codes of kind on a footprint w along its front by d deep - none for
 * a kind there is none of that size.
 */
export function codesOf(kind, w, d) {
  var byFootprint = catalogue()[kind];

  return (byFootprint && byFootprint[w + "x" + d]) || [];
}

/**
 * The fronts of kind there are d deep, smallest first.
 */
export function widthsOf(kind, d) {
  var out = [];

  for (var w = 1; w <= 3; w++) if (codesOf(kind, w, d).length > 0) out.push(w);

  return out;
}

/**
 * What a building is to the town: who it puts up, who works in it, and what
 * it wants of it.
 */
export function info(code) {
  var data = BuildingData[code],
    requires = data.requires || {};

  return {
    kind: data.compound ? kindOf(data) : null,
    beds: data.citizenCapacity || 0,
    jobs: data.jobs || 0,
    //people who need a job in town to live here (core/city/citypopulation)
    needsJobs: !!data.citizenCapacity && data.needsJobs !== false,
    water: requires.water === true,
    road: typeof requires.road === "string" ? requires.road : null,
    sizeX: data.sizeX,
    sizeY: data.sizeY,
  };
}

export var WATER_TOWER = BuildingCode.waterTower;
export var PUMP = BuildingCode.waterPump;
export var ROAD = BuildingCode.road;
