/**
 * Kinds of building, read off data/buildings (offered ones only), by
 * footprint "frontxdepth". See isometrica/.claude/skills/citygen.
 */
import BuildingData from "../data/buildings";
import BuildingCode from "../data/buildingcode";

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

export function codesOf(kind, w, d) {
  var byFootprint = catalogue()[kind];

  return (byFootprint && byFootprint[w + "x" + d]) || [];
}

export function widthsOf(kind, d) {
  var out = [];

  for (var w = 1; w <= 3; w++) if (codesOf(kind, w, d).length > 0) out.push(w);

  return out;
}

export function info(code) {
  var data = BuildingData[code],
    requires = data.requires || {};

  return {
    kind: data.compound ? kindOf(data) : null,
    beds: data.citizenCapacity || 0,
    jobs: data.jobs || 0,
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
