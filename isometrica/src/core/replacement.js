/**
 * What can go up in the place of a building that comes down for it
 * (City#replace): whatever covers just the ground it stands on, turned one
 * way or another - and which way it is turned to.
 *
 * A building faces -y as it is drawn, unturned; a quarter turn has it face
 * -x, two +y, three +x (client/compoundbuilding turn).
 */
import BuildingData from "../data/buildings";
import BuildingClassCode from "../data/classcode";
import Rotation from "./rotation";
import Terrain from "./terrain";

//the way a building turned so many times faces, a step along the ground
var FACES = [
  [0, -1],
  [-1, 0],
  [0, 1],
  [1, 0],
];

/**
 * Whether what stands can be replaced at all: a building of a city's - not
 * a tree, nor a road, which are ground to clear and to lay again.
 *
 * @param building {Building} the core's
 * @returns {boolean}
 */
function replaceable(building) {
  var classCode = building && building.data && building.data.classCode;

  return (
    !!classCode &&
    classCode !== BuildingClassCode.tree &&
    classCode !== BuildingClassCode.road
  );
}

/**
 * The ways code can be turned to cover a lot sizeX by sizeY as it lies -
 * rotation first, where it does, then the rest a quarter turn on at a time.
 * None for what does not fit it, nor a road.
 *
 * @param code {number|string}
 * @param sizeX {number} the lot's tiles along x
 * @param sizeY {number} and along y
 * @param [rotation] {number} the way wanted, if it fits
 * @returns {number[]} quarter turns, 0..3
 */
function turnsFor(code, sizeX, sizeY, rotation) {
  var data = BuildingData[code],
    out = [],
    r,
    i;

  if (data === undefined || data.classCode === BuildingClassCode.road)
    return out;

  for (i = 0; i < 4; i++) {
    r = (Rotation.turns(rotation) + i) & 3;

    //what never turns stands only the way it was drawn
    if (data.canRotate === false && r !== 0) continue;

    if (Rotation.sizeX(data, r) === sizeX && Rotation.sizeY(data, r) === sizeY)
      out.push(r);
  }

  return out;
}

/**
 * Whether code covers a lot sizeX by sizeY, turned some way.
 */
function fits(code, sizeX, sizeY) {
  return turnsFor(code, sizeX, sizeY, 0).length > 0;
}

/**
 * The tiles along the front of a lot - the row of them next to it, the way
 * what stands there turned rotation times faces.
 *
 * @returns {number[]}
 */
function frontOf(tile, sizeX, sizeY, rotation) {
  var face = FACES[Rotation.turns(rotation)],
    x0 = Terrain.extractX(tile),
    y0 = Terrain.extractY(tile),
    out = [],
    i;

  if (face[1] !== 0)
    for (i = 0; i < sizeX; i++)
      out.push(
        Terrain.convertToIndex(x0 + i, face[1] < 0 ? y0 - 1 : y0 + sizeY),
      );
  else
    for (i = 0; i < sizeY; i++)
      out.push(
        Terrain.convertToIndex(face[0] < 0 ? x0 - 1 : x0 + sizeX, y0 + i),
      );

  return out;
}

/**
 * The way code goes up in the place of building: the way building faces,
 * where it fits so - and where it fits only turned a quarter, a lot along
 * x for one along y, the way that has the most of a road along its front,
 * the first a quarter turn on for as much. -1 for none.
 *
 * @param world {Logic} for the roads round it
 * @param code {number|string}
 * @param building {Building} the core's, standing
 * @returns {number} quarter turns, 0..3, or -1
 */
function turnFor(world, code, building) {
  var sizeX = Rotation.sizeX(building.data, building.rotation),
    sizeY = Rotation.sizeY(building.data, building.rotation),
    turns = turnsFor(code, sizeX, sizeY, building.rotation),
    best = -1,
    most = -1;

  if (turns.length === 0) return -1;
  if (turns[0] === Rotation.turns(building.rotation)) return turns[0];

  turns.forEach(function (r) {
    var roads = frontOf(building.tile, sizeX, sizeY, r).filter(function (t) {
      var b = world.buildingService.get(t);

      return b !== null && b.data.classCode === BuildingClassCode.road;
    }).length;

    if (roads > most) {
      most = roads;
      best = r;
    }
  });

  return best;
}

/**
 * The kind of building code is: its type, for a variant of one (data/
 * buildings variants) - or itself.
 *
 * @param code {number|string}
 * @returns {number}
 */
function kindOf(code) {
  var data = BuildingData[code];

  return data && data.variantOf !== undefined
    ? data.variantOf
    : parseInt(code, 10);
}

export default {
  replaceable: replaceable,
  turnsFor: turnsFor,
  fits: fits,
  frontOf: frontOf,
  turnFor: turnFor,
  kindOf: kindOf,
};
