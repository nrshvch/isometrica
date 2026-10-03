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

//which ramp goes up a slope whose corners side by side are up, of A (x, y),
//B (x + 1, y), C (x, y + 1) and D (x + 1, y + 1) (shared/gen/roads RAMPS)
var RAMP_OF = { AB: 1, AC: 2, CD: 3, BD: 4 };

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

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads, or a ramp on a slope - and the paved one,
 * with pavements and street lights, for a street (see Roadman#paved).
 *
 * A road goes on ground that rises a step at most across its tile, the way it
 * did in Transport Tycoon: on the flat, flat; up a slope whose two corners
 * side by side are up, a ramp - and across it, flat at the top, on a base.
 * Up a slope with one corner up, a road that
 * runs straight across it is a ramp still, on a base of concrete that brings
 * the corner beside that one up to it; and on any other slope - three
 * corners up, two across from each other, or where the road turns or meets
 * another - it is flat at the top, on a base under the rest (see deck,
 * client/roadview, shared/gen/foundations).
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
  var a = isRoad(tile - 1),
    b = isRoad(tile - Terrain.dy),
    c = isRoad(tile + 1),
    d = isRoad(tile + Terrain.dy),
    flat = 90000 + a * 1000 + b * 100 + c * 10 + d,
    h = corners(terrain, tile),
    top = Math.max(h.A, h.B, h.C, h.D),
    up = ["A", "B", "C", "D"]
      .filter(function (k) {
        return h[k] === top;
      })
      .join(""),
    id = flat;

  if (up.length === 2 && RAMP_OF[up] !== undefined) {
    //up the slope, a ramp; across it - or where it turns, or meets another
    //across it - flat at the top, on a base
    var ramp = RAMP_OF[up],
      across = ramp === 1 || ramp === 3 ? a || c : b || d;

    if (!across) id = ramp;
  } else if (up.length === 1) {
    //straight across it: a ramp up along the road, on a base
    var alongX = (a || c) && !(b || d),
      alongY = (b || d) && !(a || c);

    if (alongX) id = up === "A" || up === "C" ? 2 : 4;
    else if (alongY) id = up === "A" || up === "B" ? 1 : 3;
  }

  return paved ? id + RoadView.PAVED : id;
};

//what a road's surface is on its tile, and how high it is across it - see
//RoadView deck, deckAt
Road.deck = RoadView.deck;
Road.deckAt = RoadView.deckAt;

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
