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

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//the ramp up each smooth slope (see profile)
var RAMP_OF = {};

RAMP_OF[Terrain.SlopeType.AB] = 1;
RAMP_OF[Terrain.SlopeType.AC] = 2;
RAMP_OF[Terrain.SlopeType.CD] = 3;
RAMP_OF[Terrain.SlopeType.BD] = 4;

//the side at the foot of each ramp, -x, -y, +x, +y
var FOOT = { 1: 3, 2: 2, 3: 1, 4: 0 };

//ground that is no smooth slope, nor flat: whatever road is on it is on
//concrete (RoadView deck)
function uneven(terrain, tile) {
  var slopeId = terrain.tileSlope(tile);

  return Terrain.isSlope(slopeId) && !Terrain.isSlopeSmooth(slopeId);
}

//whether isRoad says there is a road at the foot of ramp on tile, on the
//ground there for it to come up from
function footRoad(terrain, tile, ramp, isRoad) {
  var next = tile + STEP[FOOT[ramp]];

  return isRoad(next) && !uneven(terrain, next);
}

//the ramps a road can go up on ground with only one corner up, on a wedge:
//along x and along y, each up the side the high corner is on - none for
//any other ground
function wedges(terrain, tile) {
  if (!uneven(terrain, tile)) return [];

  var g = [
      terrain.getGridPointHeight(tile),
      terrain.getGridPointHeight(tile + 1),
      terrain.getGridPointHeight(tile + Terrain.dy),
      terrain.getGridPointHeight(tile + Terrain.dy + 1),
    ],
    top = Math.max.apply(null, g),
    up = [];

  for (var k = 0; k < 4; k++) if (g[k] === top) up.push(k);

  //three corners up, or two across from each other: flat only
  if (up.length !== 1) return [];

  return [up[0] % 2 === 0 ? 2 : 4, up[0] < 2 ? 1 : 3];
}

/**
 * How a road on tile is laid, worked out from the roads isRoad says are next
 * to it - the way OpenTTD lays one, but for the order they came in, which it
 * goes by and this cannot (see Road.lay):
 *
 * - on a smooth slope, a ramp up it - or, where roads come to it across the
 *   slope and none to its foot, levelled at the top, joining them and the
 *   one up the slope, if there is one, as a T;
 * - on ground with only one corner up, a ramp on a wedge of concrete where a
 *   road comes to its foot on the ground there - the one straight through,
 *   if either is - or else levelled at the top;
 * - on any other slope levelled at the top.
 *
 * @param terrain {Terrain} core terrain
 * @param isRoad {function(number): boolean}
 * @returns {number} 0 for flat - levelled, on a slope - or the ramp, 1 up
 *          towards -y, 2 -x, 3 +y, 4 +x
 */
Road.decide = function (terrain, tile, isRoad) {
  var slopeId = terrain.tileSlope(tile);

  if (!Terrain.isSlope(slopeId)) return 0;

  var ramp = RAMP_OF[slopeId];

  if (ramp !== undefined) {
    var foot = FOOT[ramp];

    if (footRoad(terrain, tile, ramp, isRoad)) return ramp;
    if (
      isRoad(tile + STEP[(foot + 1) % 4]) ||
      isRoad(tile + STEP[(foot + 3) % 4])
    )
      return 0;

    return ramp;
  }

  //up from a road on the ground at its foot - the one straight through, if
  //either is
  var ramps = wedges(terrain, tile).filter(function (r) {
    return footRoad(terrain, tile, r, isRoad);
  });

  ramps.sort(function (p, q) {
    return (
      isRoad(tile + STEP[(FOOT[q] + 2) % 4]) -
      isRoad(tile + STEP[(FOOT[p] + 2) % 4])
    );
  });

  return ramps.length > 0 ? ramps[0] : 0;
};

/**
 * How the road on tile is laid (Road.decide): as it was the first time it
 * had a road next to it, if it was put down on a slope then - once laid one
 * way, it stays that way, however the roads round it come and go, as in
 * OpenTTD the road that came first stays and the one that does not fit it
 * goes without - or as the roads next to it say now.
 *
 * @param net {{isRoad: function(number): boolean, lay: function(number)}}
 *        where the roads are, and how each that is laid for good is laid -
 *        undefined for one that is not (see Road.fix)
 */
Road.lay = function (terrain, tile, net) {
  var lay = net.lay(tile),
    slopeId = terrain.tileSlope(tile);

  //kept only for the ground it was laid on
  if (
    lay !== undefined &&
    Terrain.isSlope(slopeId) &&
    (lay === 0 ||
      RAMP_OF[slopeId] === lay ||
      wedges(terrain, tile).indexOf(lay) !== -1)
  )
    return lay;

  return Road.decide(terrain, tile, net.isRoad);
};

/**
 * How the road on tile is to be laid for good, from the roads next to it by
 * isRoad - or undefined while it has none to go by, for flat ground too
 * (Road.lay).
 */
Road.fix = function (terrain, tile, isRoad) {
  if (!Terrain.isSlope(terrain.tileSlope(tile))) return undefined;

  for (var side = 0; side < 4; side++)
    if (isRoad(tile + STEP[side])) return Road.decide(terrain, tile, isRoad);

  return undefined;
};

//the piece a road laid lay goes by for its base (RoadView deck): its ramp,
//or any flat one
function pieceOf(lay) {
  return lay || 90000;
}

//the heights of the road on tile along each of its sides, -x, -y, +x, +y,
//where it meets the next one (RoadView deck) - none along the sides of a
//ramp on a wedge, which nothing meets
function edges(terrain, tile, net) {
  var lay = Road.lay(terrain, tile, net),
    d = RoadView.deck(terrain, tile, pieceOf(lay)),
    out = [
      [d[0], d[2]],
      [d[0], d[1]],
      [d[1], d[3]],
      [d[2], d[3]],
    ],
    //up along y, or along x
    across = lay === 1 || lay === 3 ? [0, 2] : [1, 3];

  if (lay !== 0 && uneven(terrain, tile))
    across.forEach(function (side) {
      out[side] = [NaN, NaN];
    });

  return out;
}

//whether the road on tile is on concrete (RoadView deck)
function raised(terrain, tile, net) {
  return RoadView.raised(terrain, tile, pieceOf(Road.lay(terrain, tile, net)));
}

/**
 * Whether the roads on tile and on the tile next to it at side - 0..3: -x,
 * -y, +x, +y - meet: wherever either is on concrete, only where they are at
 * the same height all along the edge between them - so a levelled road and
 * one a step below it do not join over the step, and a ramp on a wedge is
 * joined at its foot and its top only. Anywhere else they do, as they always
 * have.
 *
 * @param net {{isRoad, lay}} where the roads are (see Road.lay)
 */
Road.meets = function (terrain, tile, side, net) {
  var next = tile + STEP[side];

  if (!raised(terrain, tile, net) && !raised(terrain, next, net)) return true;

  var ours = edges(terrain, tile, net)[side],
    theirs = edges(terrain, next, net)[(side + 2) % 4];

  return ours[0] === theirs[0] && ours[1] === theirs[1];
};

/**
 * How high the road on tile is at each corner, A (x, y), B (x + 1, y),
 * C (x, y + 1), D (x + 1, y + 1) - where the ground is, or on its concrete
 * (RoadView deck).
 *
 * @param net {{isRoad, lay}} where the roads are (see Road.lay)
 */
Road.deck = function (terrain, tile, net) {
  return RoadView.deck(terrain, tile, pieceOf(Road.lay(terrain, tile, net)));
};

/**
 * The roads loaded, as Road.lay goes by them.
 *
 * @param roadman {Roadman}
 */
Road.network = function (roadman) {
  return {
    isRoad: function (tile) {
      return roadman.getRoad(tile) !== null;
    },
    lay: function (tile) {
      var road = roadman.getRoad(tile);

      return road !== null ? Road.layOf(road.data) : undefined;
    },
  };
};

/**
 * How a road, its core model, is laid for good (Road.fix), if it is.
 */
Road.layOf = function (model) {
  return model.look !== null &&
    model.look !== undefined &&
    typeof model.look.lay === "number"
    ? model.look.lay
    : undefined;
};

/**
 * How roads would be laid with the ones at tiles put down too - the new ones,
 * and every one next to them not laid for good yet, laid for good now
 * (Road.fix): each by the roads it had next to it before, or, one that had
 * none, by the new ones. The ones there stay as they were laid.
 *
 * @param roadman {Roadman}
 * @param tiles {number[]} where roads are going down
 * @returns {{isRoad, lay, fixes: Object}} the roads, and fixes how each of
 *          the new ones and the ones round them are to be laid for good, by
 *          tile - undefined for one that is not yet
 */
Road.planned = function (terrain, roadman, tiles) {
  var before = Road.network(roadman),
    going = Object.create(null),
    fixes = Object.create(null),
    after = function (tile) {
      return going[tile] === true || before.isRoad(tile);
    };

  tiles.forEach(function (tile) {
    if (!before.isRoad(tile)) going[tile] = true;
  });

  Object.keys(going).forEach(function (key) {
    var tile = +key;

    fixes[tile] = Road.fix(terrain, tile, after);

    for (var side = 0; side < 4; side++) {
      var next = tile + STEP[side];

      if (
        !before.isRoad(next) ||
        before.lay(next) !== undefined ||
        next in fixes
      )
        continue;

      var lay = Road.fix(terrain, next, before.isRoad);

      fixes[next] = lay !== undefined ? lay : Road.fix(terrain, next, after);
    }
  });

  return {
    isRoad: after,
    lay: function (tile) {
      return tile in fixes ? fixes[tile] : before.lay(tile);
    },
    fixes: fixes,
  };
};

/**
 * Lays for good every road next to tile not laid for good yet (Road.fix), as
 * the roads round it are now - before the one on tile goes.
 *
 * @param roadman {Roadman}
 */
Road.fixAround = function (terrain, roadman, tile) {
  var net = Road.network(roadman);

  for (var side = 0; side < 4; side++) {
    var road = roadman.getRoad(tile + STEP[side]);

    if (road === null || Road.layOf(road.data) !== undefined) continue;

    var lay = Road.fix(terrain, road.data.tile, net.isRoad);

    if (lay !== undefined) Road.setLay(road.data, lay);
  }
};

/**
 * Keeps how a road, its core model, is laid for good - with it in a save.
 */
Road.setLay = function (model, lay) {
  model.look = { lay: lay };
};

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours are roads and it meets (Road.meets), or a ramp (Road.lay) - and
 * the paved one, with pavements and street lights, for a street (see
 * Roadman#paved).
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param net {{isRoad, lay}} where the roads are (see Road.lay)
 * @param [paved] {boolean}
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, RoadView.PAVED more for
 *          the paved one - see RoadView
 */
Road.profile = function (terrain, tile, net, paved) {
  var lay = Road.lay(terrain, tile, net),
    id = lay;

  if (lay === 0) {
    var j = [0, 1, 2, 3].map(function (side) {
      return net.isRoad(tile + STEP[side]) &&
        Road.meets(terrain, tile, side, net)
        ? 1
        : 0;
    });

    id = 90000 + j[0] * 1000 + j[1] * 100 + j[2] * 10 + j[3];
  }

  return paved ? id + RoadView.PAVED : id;
};

Road.prototype.updateProfile = function () {
  var roadman = this.root.roadman,
    id = Road.profile(
      this.root.core.terrain,
      this.data.tile,
      Road.network(roadman),
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
