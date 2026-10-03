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
 * Whether the road on tile is levelled: on a slope it does not go up as a
 * ramp - one with only one corner up, three, or two across from each other -
 * flat at the top of the slope, on a concrete base (RoadView addBase).
 */
Road.levelled = function (terrain, tile) {
  return RoadView.levelled(terrain, tile);
};

//the heights of a tile's corners along each of its sides, -x, -y, +x, +y -
//as the road on it meets the next one: a levelled road's at the top all
//along, any other road's where the ground is
function edges(terrain, tile) {
  var a = terrain.getGridPointHeight(tile),
    b = terrain.getGridPointHeight(tile + 1),
    c = terrain.getGridPointHeight(tile + Terrain.dy),
    d = terrain.getGridPointHeight(tile + Terrain.dy + 1),
    top = Math.max(a, b, c, d);

  if (Road.levelled(terrain, tile))
    return [
      [top, top],
      [top, top],
      [top, top],
      [top, top],
    ];

  return [
    [a, c],
    [a, b],
    [b, d],
    [c, d],
  ];
}

/**
 * Whether the roads on tile and on the tile next to it at side - 0..3: -x,
 * -y, +x, +y - meet: wherever either is levelled, only where they are at
 * the same height all along the edge between them - so a levelled road and
 * one a step below it do not join over the step. Anywhere else they do, as
 * they always have.
 */
Road.meets = function (terrain, tile, side) {
  var next = tile + [-1, -Terrain.dy, 1, Terrain.dy][side];

  if (!Road.levelled(terrain, tile) && !Road.levelled(terrain, next))
    return true;

  var ours = edges(terrain, tile)[side],
    theirs = edges(terrain, next)[(side + 2) % 4];

  return ours[0] === theirs[0] && ours[1] === theirs[1];
};

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads and it meets (Road.meets), or a ramp on a
 * slope - and the paved one, with pavements and street lights, for a street
 * (see Roadman#paved). On a slope that is no ramp's it is flat, levelled at
 * the top on a base.
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
    id;

  if (!Terrain.isSlope(slopeId) || Road.levelled(terrain, tile)) {
    var a = isRoad(tile - 1) && Road.meets(terrain, tile, 0),
      b = isRoad(tile - Terrain.dy) && Road.meets(terrain, tile, 1),
      c = isRoad(tile + 1) && Road.meets(terrain, tile, 2),
      d = isRoad(tile + Terrain.dy) && Road.meets(terrain, tile, 3);

    id = 90000 + a * 1000 + b * 100 + c * 10 + d;
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
