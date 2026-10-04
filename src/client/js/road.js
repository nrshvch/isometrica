import Core from "core/main";
import engine from "engine";
import Building from "./building";
import RoadNode from "./pathfinding/roadnode";
import RoadView from "./roadview";

var buildingData = Core.BuildingData,
  BuildingData = buildingData;
var Terrain = Core.Terrain;

function Road(root) {
  this.root = root;
  this.view = new RoadView();
  this.view.setRoad(this);
}

Road.prototype = Object.create(Building.prototype);

Road.prototype.typeCode = 91111;

Road.prototype.setData = function (data) {
  this.data = data;
  this.staticData = BuildingData[data.buildingCode];
  //this.tile = vkaria.terrain.getTile(data.x, data.y).tileScript;

  if (this.node === null) this.node = new RoadNode(this);

  this.view.update();
  this.view.render();
};

/**
 * The ramp a road on tile goes up on a wedge of concrete, the way OpenTTD
 * lays a straight road over ground with only one corner up: the corner next
 * to the high one along the road built up to it, so the road climbs a step
 * from the ground at its foot to the top. 1 up towards -y, 2 -x, 3 +y, 4 +x
 * (see profile) - or 0 for none, the road levelled flat at the top.
 *
 * It is a ramp wherever a road, by isRoad, comes to its foot on the ground
 * there - the road up it goes before any coming onto it from the side, which
 * do not join it. One that only comes down to it from the top stays flat.
 *
 * @param terrain {Terrain} core terrain
 * @param isRoad {function(number): boolean}
 */
Road.wedge = function (terrain, tile, isRoad) {
  if (!RoadView.onBase(terrain, tile)) return 0;

  var g = [
      terrain.getGridPointHeight(tile),
      terrain.getGridPointHeight(tile + 1),
      terrain.getGridPointHeight(tile + Terrain.dy),
      terrain.getGridPointHeight(tile + Terrain.dy + 1),
    ],
    top = Math.max.apply(null, g),
    up = [];

  for (var k = 0; k < 4; k++) if (g[k] === top) up.push(k);

  //ground with three corners up, or two across from each other: flat
  if (up.length !== 1) return 0;

  var roads = [0, 1, 2, 3].map(function (side) {
      return isRoad(tile + STEP[side]);
    }),
    //along x, the ramp up the side the high corner is on, and its foot
    //across from it; along y the same
    alongX = up[0] % 2 === 0 ? { ramp: 2, foot: 2 } : { ramp: 4, foot: 0 },
    alongY = up[0] < 2 ? { ramp: 1, foot: 3 } : { ramp: 3, foot: 1 };

  //up from a road on the ground at its foot - the one straight through, if
  //either is
  var ramps = [alongX, alongY].filter(function (axis) {
    return (
      roads[axis.foot] && !RoadView.onBase(terrain, tile + STEP[axis.foot])
    );
  });

  ramps.sort(function (p, q) {
    return roads[(q.foot + 2) % 4] - roads[(p.foot + 2) % 4];
  });

  if (ramps.length > 0) return ramps[0].ramp;

  return 0;
};

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//the heights of the road on tile along each of its sides, -x, -y, +x, +y,
//where it meets the next one (RoadView deck) - none along the sides of a
//ramp on a wedge, which nothing meets
function edges(terrain, tile, isRoad) {
  var wedge = Road.wedge(terrain, tile, isRoad),
    d = RoadView.deck(terrain, tile, wedge || 90000),
    out = [
      [d[0], d[2]],
      [d[0], d[1]],
      [d[1], d[3]],
      [d[2], d[3]],
    ],
    //up along y, or along x
    across = wedge === 1 || wedge === 3 ? [0, 2] : [1, 3];

  if (wedge !== 0)
    across.forEach(function (side) {
      out[side] = [NaN, NaN];
    });

  return out;
}

/**
 * Whether the roads on tile and on the tile next to it at side - 0..3: -x,
 * -y, +x, +y - meet: wherever either is on a base, only where they are at
 * the same height all along the edge between them - so a levelled road and
 * one a step below it do not join over the step, and a ramp on a wedge is
 * joined at its foot and its top only. Anywhere else they do, as they always
 * have.
 *
 * @param isRoad {function(number): boolean} where the roads are, which a ramp
 *        on a wedge goes by (Road.wedge)
 */
Road.meets = function (terrain, tile, side, isRoad) {
  var next = tile + STEP[side];

  if (!RoadView.onBase(terrain, tile) && !RoadView.onBase(terrain, next))
    return true;

  var ours = edges(terrain, tile, isRoad)[side],
    theirs = edges(terrain, next, isRoad)[(side + 2) % 4];

  return ours[0] === theirs[0] && ours[1] === theirs[1];
};

/**
 * How high the road on tile is at each corner, A (x, y), B (x + 1, y),
 * C (x, y + 1), D (x + 1, y + 1) - where the ground is, or on its base
 * (RoadView deck).
 */
Road.deck = function (terrain, tile, isRoad) {
  return RoadView.deck(
    terrain,
    tile,
    Road.wedge(terrain, tile, isRoad) || 90000,
  );
};

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads and it meets (Road.meets), or a ramp on a
 * slope - and the paved one, with pavements and street lights, for a street
 * (see Roadman#paved). On a slope that is no ramp's it is a ramp on a wedge
 * (Road.wedge), or flat, levelled at the top on a base.
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param isRoad {function(number): boolean}
 * @param [paved] {boolean}
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, RoadView.PAVED more for
 *          the paved one - see RoadView
 */
Road.profile = function (terrain, tile, isRoad, paved) {
  var slopeId = terrain.tileSlope(tile),
    wedge = Road.wedge(terrain, tile, isRoad),
    id;

  if (wedge !== 0) {
    id = wedge;
  } else if (!Terrain.isSlope(slopeId) || RoadView.onBase(terrain, tile)) {
    var j = [0, 1, 2, 3].map(function (side) {
      return isRoad(tile + STEP[side]) &&
        Road.meets(terrain, tile, side, isRoad)
        ? 1
        : 0;
    });

    id = 90000 + j[0] * 1000 + j[1] * 100 + j[2] * 10 + j[3];
  } else if (slopeId === Terrain.SlopeType.AB) {
    id = 1;
  } else if (slopeId === Terrain.SlopeType.AC) {
    id = 2;
  } else if (slopeId === Terrain.SlopeType.CD) {
    id = 3;
  } else if (slopeId === Terrain.SlopeType.BD) {
    id = 4;
  }

  return paved ? id + RoadView.PAVED : id;
};

Road.prototype.updateProfile = function () {
  var roadman = this.root.roadman,
    id = Road.profile(
      this.root.core.terrain,
      this.data.tile,
      function (tile) {
        return roadman.getRoad(tile) !== null;
      },
      roadman.paved(this.data.tile),
    );

  //the same piece as it was: nothing to draw again
  if (id === this.typeCode && this.view.gameObject.transform.children.length)
    return id;

  this.typeCode = id;

  this.view.update();
  this.view.render();

  return id;
};

export default Road;
