import Core from "core/main";
import engine from "engine";
import Building from "./building";
import RoadNode from "./pathfinding/roadnode";
import RoadView from "./roadview";
import * as RoadBits from "core/roadbits";

var buildingData = Core.BuildingData,
  BuildingData = buildingData;

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
 * Which piece of road goes on tile, by its bits - which of its edges it runs
 * out to, as it was laid (core/roadbits) - and the ground under it, the way
 * OpenTTD has it: a ramp, 1..4, up a slope or on an inclined foundation; or
 * flat, on flat ground or levelled at the top of a slope, its arms where its
 * bits are - so a road that was laid to end there ends there, whatever is
 * next to it - and the paved one, with pavements and street lights, for a
 * street (see Roadman#paved).
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param bits {number} 1 towards -x, 2 -y, 4 +x, 8 +y
 * @param [paved] {boolean}
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, RoadView.PAVED more for
 *          the paved one - see RoadView
 */
Road.profile = function (terrain, tile, bits, paved) {
  var shape = RoadBits.shapeOf(RoadBits.heightsOf(terrain, tile), bits),
    id = shape;

  if (!shape)
    id =
      90000 +
      (bits & 1 ? 1000 : 0) +
      (bits & 2 ? 100 : 0) +
      (bits & 4 ? 10 : 0) +
      (bits & 8 ? 1 : 0);

  return paved ? id + RoadView.PAVED : id;
};

/**
 * The tiles a car can drive to from tile: wherever the road there runs out
 * to an edge, and the road beyond runs out to it from its side too.
 *
 * @param bitsAt {function(number): number|null} the bits of the road on a
 *        tile, null for none
 * @param out {number[]} filled in
 */
Road.ways = function (tile, bitsAt, out) {
  var own = bitsAt(tile) || 0;

  for (var i = 0; i < 4; i++) {
    if (!(own & (1 << i))) continue;

    var next = tile + RoadBits.OFFSETS[i],
      theirs = bitsAt(next);

    if (theirs !== null && theirs & (1 << ((i + 2) % 4))) out.push(next);
  }

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
      this.data.roadBits || 0,
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
