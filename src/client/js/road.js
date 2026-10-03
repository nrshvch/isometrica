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

//what a ramp costs over a plain piece - so a road takes one only where its
//neighbours want it - laid on a base, and raised on a base over flat ground
var COST = { level: 0.2, rampOnBase: 0.3, raised: 0.6 };

/**
 * Which piece of road goes on tile: one joined up to whichever of its four
 * neighbours isRoad says are roads, or a ramp - and the paved one, with
 * pavements and street lights, for a street (see Roadman#paved).
 *
 * A road goes on ground that rises a step at most across its tile, the way it
 * did in Transport Tycoon, on a base of concrete wherever it has to be over
 * the ground (RoadView addBase, shared/gen/foundations). On a tile it can be:
 *
 *   - flat, on flat ground;
 *   - flat at the top of a slope, on a base under the rest of it;
 *   - a ramp up a slope whose two corners side by side are up;
 *   - a ramp on a base, up a slope with one corner up - the corner beside it
 *     brought up too;
 *   - a ramp on a base over flat ground, raised a step at its far end.
 *
 * A ramp goes straight, so it is only one where the road does not turn or
 * meet another across it. Of what it can be, the road on a tile is what
 * meets the roads next to it at the same height along every edge it joins
 * them on - and of those the plainest: no base before a base, no ramp before
 * one (COST). So where a road comes up to a tile levelled at the top of a
 * slope, the flat tile it comes from rises to it on a ramp.
 *
 * @param terrain {Terrain} core terrain
 * @param tile {number}
 * @param isRoad {function(number): boolean}
 * @param [paved] {boolean}
 * @param [roadAt] {function(number): Road|null} the roads already laid, whose
 *        surfaces this one is to meet
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, 5..8 for the same ramp
 *          raised a step over flat ground, RoadView.PAVED more for the paved
 *          one - see RoadView
 */
Road.profile = function (terrain, tile, isRoad, paved, roadAt) {
  var joins = SIDES.map(function (side) {
      return isRoad(tile + side.off);
    }),
    flat =
      90000 + joins[0] * 1000 + joins[1] * 100 + joins[2] * 10 + joins[3] * 1,
    h = corners(terrain, tile),
    top = Math.max(h.A, h.B, h.C, h.D),
    level = Math.min(h.A, h.B, h.C, h.D) === top,
    alongX = !(joins[1] || joins[3]),
    alongY = !(joins[0] || joins[2]),
    options = [{ id: flat, cost: level ? 0 : COST.level }],
    best = null;

  //the ground at fx, fy across the tile, each 0 or 1
  function ground(fx, fy) {
    return fy ? (fx ? h.D : h.C) : fx ? h.B : h.A;
  }

  //every ramp that goes straight the way the road does, and is nowhere
  //under the ground
  [1, 2, 3, 4].forEach(function (r) {
    if (r === 1 || r === 3 ? !alongY : !alongX) return;

    [0, 1].forEach(function (raised) {
      if (raised && !level) return;

      var id = raised ? r + 4 : r,
        deck = RoadView.deck(terrain, tile, id),
        drops = 0,
        under = false;

      [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ].forEach(function (c) {
        var d = RoadView.deckAt(deck, c[0], c[1]) - ground(c[0], c[1]);

        if (d < 0) under = true;
        drops += d;
      });

      if (!under)
        options.push({
          id: id,
          cost: raised ? COST.raised : drops > 0 ? COST.rampOnBase : 0,
        });
    });
  });

  options.forEach(function (o) {
    var deck = RoadView.deck(terrain, tile, o.id),
      score = o.cost;

    //how far off the surfaces of the roads next to it it would be, along
    //every edge it joins them on
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

  return paved ? best.id + RoadView.PAVED : best.id;
};

//what a road's surface is on its tile, and how high it is across it - see
//RoadView deck, deckAt
Road.deck = RoadView.deck;
Road.deckAt = RoadView.deckAt;

//how many roads away a road that changed has the ones beyond it look again
var REACH = 4,
  //how deep in that it is now
  reaching = 0;

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

  var was = this.typeCode;

  this.typeCode = id;

  this.view.update();
  this.view.render();

  //its surface is another now: the roads next to it may want to meet it
  //differently - and the ones next to those, a few roads on
  if (
    reaching < REACH &&
    RoadView.surfaceKey(this.root.core.terrain, tile, was) !==
      RoadView.surfaceKey(this.root.core.terrain, tile, id)
  ) {
    reaching++;
    try {
      SIDES.forEach(function (side) {
        var other = roadman.getRoad(tile + side.off);

        if (other !== null) other.updateProfile();
      });
    } finally {
      reaching--;
    }
  }

  return id;
};

export default Road;
