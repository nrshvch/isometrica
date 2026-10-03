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

//the heights of a tile's corners: A (x, y), B (x + 1, y), C (x, y + 1),
//D (x + 1, y + 1)
function corners(terrain, tile) {
  return {
    A: terrain.getGridPointHeight(tile),
    B: terrain.getGridPointHeight(tile + 1),
    C: terrain.getGridPointHeight(tile + Terrain.dy),
    D: terrain.getGridPointHeight(tile + Terrain.dy + 1),
  };
}

//each side a road can join on - -x, -y, +x, +y - the tile beyond it, and the
//corners of the edge on it as [fx, fy] across the tile, and as they are on
//the tile beyond
var SIDES = [
  {
    off: -1,
    ours: [
      [0, 0],
      [0, 1],
    ],
    theirs: [
      [1, 0],
      [1, 1],
    ],
  },
  {
    off: -Terrain.dy,
    ours: [
      [0, 0],
      [1, 0],
    ],
    theirs: [
      [0, 1],
      [1, 1],
    ],
  },
  {
    off: 1,
    ours: [
      [1, 0],
      [1, 1],
    ],
    theirs: [
      [0, 0],
      [0, 1],
    ],
  },
  {
    off: Terrain.dy,
    ours: [
      [0, 1],
      [1, 1],
    ],
    theirs: [
      [0, 0],
      [1, 0],
    ],
  },
];

//which ramp goes up a slope whose corners side by side are up, of A (x, y),
//B (x + 1, y), C (x, y + 1) and D (x + 1, y + 1) (shared/gen/roads RAMPS)
var RAMP_OF = { AB: 1, AC: 2, CD: 3, BD: 4 };

/**
 * What the road on tile is, by the ground under it alone - nothing about the
 * roads round it - so it is the same in the preview as when it is built, and
 * stays what it is whatever is laid next to it later: flat on flat ground; a
 * ramp up a slope whose two corners side by side are up; and on any other
 * slope - one corner up, three, or two across from each other - flat at the
 * top, on a base of concrete (RoadView addBase, shared/gen/foundations), the
 * way it was in Transport Tycoon.
 *
 * @param terrain {Terrain} core terrain
 * @returns {number} 0 for flat, or the ramp, 1..4
 */
Road.shape = function (terrain, tile) {
  var h = corners(terrain, tile),
    top = Math.max(h.A, h.B, h.C, h.D),
    up = ["A", "B", "C", "D"]
      .filter(function (k) {
        return h[k] === top;
      })
      .join("");

  return up.length === 2 && RAMP_OF[up] !== undefined ? RAMP_OF[up] : 0;
};

/**
 * Whether the roads on tile and on the tile next to it, side - an index of
 * SIDES: -x, -y, +x, +y - join up: they meet at the same height all along
 * the edge between them, and neither is a ramp it comes onto from the side.
 * Where they do not, there is a step between them, or a ramp's side: each
 * ends there, and nothing drives from one to the other.
 *
 * @param terrain {Terrain} core terrain
 */
Road.connects = function (terrain, tile, side) {
  var s = SIDES[side],
    other = tile + s.off,
    ours = Road.shape(terrain, tile),
    theirs = Road.shape(terrain, other),
    alongX = side === 0 || side === 2;

  //a ramp is joined at its foot and its top only
  if (ours && (ours === 2 || ours === 4) !== alongX) return false;
  if (theirs && (theirs === 2 || theirs === 4) !== alongX) return false;

  var a = RoadView.deck(terrain, tile, ours),
    b = RoadView.deck(terrain, other, theirs);

  return s.ours.every(function (c, k) {
    var t = s.theirs[k];

    return RoadView.deckAt(a, c[0], c[1]) === RoadView.deckAt(b, t[0], t[1]);
  });
};

/**
 * Which piece of road goes on tile: its shape (Road.shape) - flat, or a ramp
 * - and for a flat one, which of its sides it joins on: towards each road
 * next to it it meets (Road.connects), so a road that comes to a step in the
 * ground ends there - and the paved one, with pavements and street lights,
 * for a street (see Roadman#paved).
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
  var shape = Road.shape(terrain, tile),
    id = shape;

  if (!shape) {
    id = 90000;
    SIDES.forEach(function (side, i) {
      if (isRoad(tile + side.off) && Road.connects(terrain, tile, i))
        id += [1000, 100, 10, 1][i];
    });
  }

  return paved ? id + RoadView.PAVED : id;
};

/**
 * The tiles a car can drive to from tile, of the roads round it (see
 * Road.connects).
 *
 * @param isRoad {function(number): boolean}
 * @param out {number[]} filled in
 */
Road.ways = function (terrain, tile, isRoad, out) {
  SIDES.forEach(function (side, i) {
    if (isRoad(tile + side.off) && Road.connects(terrain, tile, i))
      out.push(tile + side.off);
  });

  return out;
};

//what a road's surface is on its tile, and how high it is across it - see
//RoadView deck, deckAt
Road.deck = RoadView.deck;
Road.deckAt = RoadView.deckAt;

Road.prototype.updateProfile = function () {
  var roadman = this.root.roadman,
    tile = this.data.tile,
    id = Road.profile(
      this.root.core.terrain,
      tile,
      function (t) {
        return roadman.getRoad(t) !== null;
      },
      roadman.paved(tile),
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
