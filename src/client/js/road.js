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

//what a road on a base costs over one levelled flat, where both would do
var RAMP_ON_BASE = 0.1;

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads, or a ramp - and the paved one, with
 * pavements and street lights, for a street (see Roadman#paved).
 *
 * A plain road wherever the ground lets it be one: on flat ground, flat; up
 * a slope whose two corners side by side are up, a ramp - whatever else
 * joins it, so a road laid on and on never has the stretch already there
 * turned into anything else. Only across such a slope, nothing running up
 * it, is it levelled.
 *
 * Only on ground no plain road goes on - one corner up, three, or two across
 * from each other - is the road laid on a base of concrete, the way it was
 * in Transport Tycoon (RoadView addBase, shared/gen/foundations): flat at the
 * top of the slope, or straight across a slope with one corner up, a ramp on
 * a wedge that brings the corner beside it up too - whichever of the two
 * meets the roads next to it at the same height along the edges it joins
 * them on, flat if both do as well.
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param isRoad {function(number): boolean}
 * @param [paved] {boolean}
 * @param [roadAt] {function(number): Road|null} the roads already laid, whose
 *        surfaces one on a base is to meet
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, RoadView.PAVED more for
 *          the paved one - see RoadView
 */
Road.profile = function (terrain, tile, isRoad, paved, roadAt) {
  var joins = SIDES.map(function (side) {
      return isRoad(tile + side.off);
    }),
    flat =
      90000 + joins[0] * 1000 + joins[1] * 100 + joins[2] * 10 + joins[3] * 1,
    h = corners(terrain, tile),
    top = Math.max(h.A, h.B, h.C, h.D),
    up = ["A", "B", "C", "D"]
      .filter(function (k) {
        return h[k] === top;
      })
      .join(""),
    alongX = joins[0] || joins[2],
    alongY = joins[1] || joins[3],
    id = flat;

  function done(id) {
    return paved ? id + RoadView.PAVED : id;
  }

  //flat ground: a flat road
  if (up.length === 4) return done(flat);

  //up a slope: a ramp, unless all of the road there runs across it
  if (up.length === 2 && RAMP_OF[up] !== undefined) {
    var ramp = RAMP_OF[up],
      upIt = ramp === 1 || ramp === 3 ? alongY : alongX,
      across = ramp === 1 || ramp === 3 ? alongX : alongY;

    return done(upIt || !across ? ramp : flat);
  }

  //ground no plain road goes on: on a base, flat - or with one corner up and
  //the road straight over it, a ramp on a wedge, if that meets the roads
  //next to it better
  var options = [{ id: flat, cost: 0 }];

  if (up.length === 1 && !(alongX && alongY)) {
    if (alongX || !alongY)
      options.push({
        id: up === "A" || up === "C" ? 2 : 4,
        cost: RAMP_ON_BASE,
      });
    if (alongY || !alongX)
      options.push({
        id: up === "A" || up === "B" ? 1 : 3,
        cost: RAMP_ON_BASE,
      });
  }

  var best = null;

  options.forEach(function (o) {
    var deck = RoadView.deck(terrain, tile, o.id),
      score = o.cost;

    if (roadAt)
      SIDES.forEach(function (side, i) {
        var other = joins[i] ? roadAt(tile + side.off) : null;

        if (!other) return;

        var theirs = RoadView.deck(terrain, tile + side.off, other.typeCode);

        side.ours.forEach(function (c, k) {
          var t = side.theirs[k];

          score += Math.abs(
            RoadView.deckAt(deck, c[0], c[1]) -
              RoadView.deckAt(theirs, t[0], t[1]),
          );
        });
      });

    if (best === null || score < best.score - 1e-9)
      best = { id: o.id, score: score };
  });

  id = best.id;

  return done(id);
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
      function (t) {
        return roadman.getRoad(t);
      },
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
