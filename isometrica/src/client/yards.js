import Core from "../core/main";
import Config from "./config";
import RenderLayer from "./renderlayer";

/**
 * Which tiles of a building are only its yard - its car park, its
 * playground, its garden, a park - and which the building itself: where a
 * blast off it comes from (core/city explode), where it leaves rubble and
 * where a wrecked yard, which of its parts a blast next to it brings down
 * (City#hit) - as the world knows it (core/building yards), or as it is
 * drawn.
 */

var Terrain = Core.Terrain,
  TILE = Config.tileSize;

//how many pixels of a tile's picture stand at least STANDS high for it to
//be the building rather than its yard - a house, not a tree in a garden
var STANDS = 10,
  STANDING = 260;

//what the parts of a block of flats or offices are (shared/gen/stacking
//kindOf): the building, or its yard
var BUILT = { ground: 1, upper: 1, roof: 1, frame: 1, mast: 1, cranetop: 1 },
  YARD = { yard: 1, lot: 1, site: 1 };

/**
 * Which tiles of a building are only its yard - its car park, its
 * playground, its garden, a park all of it - and not the building itself:
 * for a block of flats or offices, the tiles with nothing but its yard on
 * them; for a park, all of it; for anything else put together out of a
 * picture painted whole - a house, a farm, a church - the tiles on which
 * little of what it shows stands much over the ground; for a building
 * drawn whole, none. As it is drawn: none, for one that is not.
 *
 * @param building {{view: BuildingView, staticData: Object, data: Object}}
 * @returns {Object} true by the tile, for every tile that is only its yard
 */
function yards(root, building) {
  var out = {},
    staticData = building.staticData,
    compound = staticData ? staticData.compound : null,
    model = building.data;

  //as the world knows already
  if (model && Array.isArray(model.yards)) {
    model.yards.forEach(function (t) {
      out[t] = true;
    });
    return out;
  }

  if (!compound || !building.view || !model) return out;

  if (compound.gen === "parks") {
    var iter = building.data.occupiedTiles();

    while (!iter.done) out[iter.next()] = true;
    return out;
  }

  var at = building.view.gameObject.transform.getPosition([0, 0, 0]),
    local = [0, 0, 0],
    seen = {};

  building.view.gameObject.transform.children.forEach(function (child) {
    var r = child.gameObject.spriteRenderer,
      sprite = r ? r.sprite : null;

    //not what is left of a part of it come down (client/buildingview)
    if (
      !sprite ||
      typeof sprite.key !== "string" ||
      r.layer !== RenderLayer.buildingsLayer ||
      child.gameObject.down === true
    )
      return;

    child.getLocalPosition(local);

    var tile = Terrain.convertToIndex(
      Math.round((at[0] + local[0]) / TILE),
      Math.round((at[2] + local[2]) / TILE),
    );

    if (seen[tile] === false) return;

    var yard = yardPicture(sprite);

    //anything of the building on it: the building
    seen[tile] = seen[tile] === undefined ? yard : seen[tile] && yard;
  });

  for (var tile in seen) if (seen[tile]) out[tile] = true;

  return out;
}

/**
 * Whether a tile's picture is only of a yard: for a block's, by what its
 * parts are; for one painted whole, by how little of it stands much over
 * the ground - while that is not known, not.
 *
 * @param sprite {CachedSprite}
 * @returns {boolean}
 */
function yardPicture(sprite) {
  var kinds = sprite.key.split("+").map(function (key) {
    var name = key.split(/[@#!~]/)[0],
      p = name.split("/");

    return p[p[0] === "gen" ? 2 : 1];
  });

  //a block's: by what its parts are
  if (
    kinds.every(function (k) {
      return BUILT[k] || YARD[k];
    })
  )
    return kinds.every(function (k) {
      return YARD[k];
    });

  //painted whole: by how much of it stands
  var n = sprite.standing ? sprite.standing(STANDS) : null;

  return n !== null && n < STANDING;
}

export default { yards: yards, yardPicture: yardPicture };
