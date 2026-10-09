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

/*
 * A road has a surface of its own (core/surface): how high it is at each
 * corner of its tile, A (x, y), B (x + 1, y), C (x, y + 1), D (x + 1, y + 1)
 * - the way the ground has, but kept with the road, the way a building
 * keeps its own. Everything about how it is laid comes from that and the
 * ground under it:
 *
 * - its shape: flat, or a ramp - one side a step higher than the side across
 *   from it (Road.shapeOf);
 * - the concrete under it, wherever it is over the ground - a step at most,
 *   never under it (Road.fits, RoadView addBase) - so it is levelled on a
 *   slope, climbs a step on a wedge, or goes up from flat ground;
 * - where it joins the roads next to it: where they meet level, at the same
 *   height all along the edge between them (Road.meets) - never over a step,
 *   and never onto the side of a ramp.
 *
 * It is worked out once, as it is laid, for the whole run the player drags
 * at a time (Road.plan), and kept: in the save, and as the ground is shaped
 * under it (City#terraform). The roads there already stay as they are.
 */

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

var Surface = Core.Surface,
  RAMP_TOPS = Surface.RAMP_TOPS;

//the ground under tile, a surface's shape, and whether one fits a tile -
//the same for roads and buildings (core/surface)
Road.ground = Surface.ground;
Road.shapeOf = Surface.shapeOf;
Road.fits = Surface.fits;

/**
 * Every surface a new road on tile can have (Road.fits) that stands on the
 * ground somewhere - flat at the top of the ground, or a ramp a step up, on
 * the ground as it is or on concrete - cheapest first (cost).
 */
Road.surfaces = function (terrain, tile) {
  var g = Road.ground(terrain, tile),
    high = Math.max.apply(null, g),
    out = [];

  function add(surface) {
    if (
      Road.fits(terrain, tile, surface) &&
      surface.some(function (h, k) {
        return h === g[k];
      })
    )
      out.push(surface);
  }

  add([high, high, high, high]);

  [high - 1, high].forEach(function (low) {
    for (var r = 1; r <= 4; r++)
      add(
        RAMP_TOPS[r].map(function (up) {
          return low + up;
        }),
      );
  });

  return out.sort(function (a, b) {
    return cost(terrain, tile, a) - cost(terrain, tile, b);
  });
};

//what laying a road with surface on tile takes, to the planner (Road.plan):
//a corner's worth of concrete for each corner over the ground, and more for
//a ramp put up on concrete - a road follows the ground where it can
function cost(terrain, tile, surface) {
  var g = Road.ground(terrain, tile),
    drops = 0;

  surface.forEach(function (h, k) {
    drops += h - g[k];
  });

  return drops + (drops > 0 && Road.shapeOf(surface) > 0 ? 3 : 0);
}

/**
 * Whether a road with surface a joins one with surface b next to it at side
 * - 0..3: -x, -y, +x, +y: where they meet level (core/surface).
 *
 * @param b {number[]|null} null for no road there
 */
Road.meets = Surface.meets;

/**
 * The surface a road, its core model, stands on (core/surface).
 */
Road.surfaceOf = function (model) {
  return Array.isArray(model.surface) ? model.surface : null;
};

/**
 * The roads loaded, as Road.profile goes by them: the surface of each, or
 * null where there is none.
 *
 * @param roadman {Roadman}
 */
Road.network = function (roadman) {
  return {
    surface: function (tile) {
      var road = roadman.getRoad(tile);

      return road !== null ? road.surface() : null;
    },
  };
};

/**
 * How the roads going down on tiles - a run the player dragged - are best
 * laid, all of them at once: each the surface (Road.surfaces) that has the
 * run join up the most - with each other and with the roads there, which
 * stay as they are - and, as far as that goes, takes the least concrete.
 * A run across a slope is levelled along it, one up the slope ramps up it,
 * one onto a levelled road climbs up to it.
 *
 * Worked out the same every time for the same run, so the preview is what
 * gets built.
 *
 * @param roadman {Roadman}
 * @param tiles {number[]} where roads would go down - the ones with roads
 *        already left as they are
 * @param [run] {number[]} every tile the player dragged over, the roads there
 *        included - joining those counts double
 * @returns {{surfaces: Object, surface: function(number)}} the surface of
 *          each new one, by tile, and the network with them in it
 */
Road.plan = function (terrain, roadman, tiles, run) {
  var before = Road.network(roadman),
    going = [],
    labels = Object.create(null),
    costs = Object.create(null),
    dragged = Object.create(null);

  (run || tiles).forEach(function (tile) {
    dragged[tile] = true;
  });

  tiles.forEach(function (tile) {
    if (before.surface(tile) !== null || labels[tile] !== undefined) return;

    var options = Road.surfaces(terrain, tile);

    if (options.length === 0) return;

    going.push(tile);
    labels[tile] = options;
    costs[tile] = options.map(function (surface) {
      return cost(terrain, tile, surface);
    });
  });

  //what a road joined up is worth, against a corner's worth of concrete -
  //twice that for one joined to a road the player dragged over, which the
  //run is meant to go on to
  var JOIN = 10;

  //how good surface option i is on tile, with the run laid as assigned
  function local(tile, i, assigned) {
    var surface = labels[tile][i],
      score = -costs[tile][i];

    for (var side = 0; side < 4; side++) {
      var next = tile + STEP[side],
        theirs =
          labels[next] !== undefined
            ? labels[next][assigned[next]]
            : before.surface(next);

      if (Road.meets(surface, side, theirs))
        score +=
          labels[next] === undefined && dragged[next] === true
            ? 2 * JOIN
            : JOIN;
    }

    return score;
  }

  function total(assigned) {
    var sum = 0;

    going.forEach(function (tile) {
      sum += local(tile, assigned[tile], assigned);
    });

    return sum;
  }

  //how good the run is about tiles: their own scores and those of the new
  //ones next to them, which their joins count with too
  function around(some, assigned) {
    var seen = Object.create(null),
      sum = 0;

    some.forEach(function (tile) {
      [tile]
        .concat(
          STEP.map(function (step) {
            return tile + step;
          }),
        )
        .forEach(function (t) {
          if (labels[t] === undefined || seen[t] === true) return;

          seen[t] = true;
          sum += local(t, assigned[t], assigned);
        });
    });

    return sum;
  }

  //from a first guess, the run is bettered a tile at a time, and two next to
  //each other at a time - a road that climbs onto a levelled one takes both
  //changing together - until nothing betters it
  function settle(assigned) {
    for (var pass = 0; pass < 50; pass++) {
      var changed = false;

      going.forEach(function (tile) {
        var was = assigned[tile],
          best = was,
          bestScore = around([tile], assigned);

        for (var i = 0; i < labels[tile].length; i++) {
          assigned[tile] = i;

          var score = around([tile], assigned);

          if (score > bestScore) {
            best = i;
            bestScore = score;
          }
        }

        assigned[tile] = best;
        if (best !== was) changed = true;
      });

      going.forEach(function (tile) {
        [2, 3].forEach(function (side) {
          var next = tile + STEP[side];

          if (labels[next] === undefined) return;

          var wasT = assigned[tile],
            wasN = assigned[next],
            best = [wasT, wasN],
            bestScore = around([tile, next], assigned);

          for (var i = 0; i < labels[tile].length; i++)
            for (var j = 0; j < labels[next].length; j++) {
              assigned[tile] = i;
              assigned[next] = j;

              var score = around([tile, next], assigned);

              if (score > bestScore) {
                best = [i, j];
                bestScore = score;
              }
            }

          assigned[tile] = best[0];
          assigned[next] = best[1];
          if (best[0] !== wasT || best[1] !== wasN) changed = true;
        });
      });

      if (!changed) break;
    }

    return assigned;
  }

  //first guesses: the cheapest of each; each the one that would join best
  //if the ones round it went along; and the whole run level at each height
  //it could be levelled at
  var guesses = [],
    heights = [];

  guesses.push(
    going.reduce(function (a, tile) {
      a[tile] = 0;
      return a;
    }, Object.create(null)),
  );

  guesses.push(
    going.reduce(function (a, tile) {
      var best = 0,
        bestScore = -Infinity;

      labels[tile].forEach(function (surface, i) {
        var score = -costs[tile][i];

        for (var side = 0; side < 4; side++) {
          var next = tile + STEP[side];

          if (labels[next] !== undefined) {
            if (
              labels[next].some(function (theirs) {
                return Road.meets(surface, side, theirs);
              })
            )
              score += JOIN;
          } else if (Road.meets(surface, side, before.surface(next)))
            score += JOIN;
        }

        if (score > bestScore) {
          best = i;
          bestScore = score;
        }
      });

      a[tile] = best;
      return a;
    }, Object.create(null)),
  );

  going.forEach(function (tile) {
    labels[tile].forEach(function (surface) {
      if (Road.shapeOf(surface) === 0 && heights.indexOf(surface[0]) === -1)
        heights.push(surface[0]);
    });
  });

  heights.sort(function (a, b) {
    return a - b;
  });

  heights.forEach(function (h) {
    guesses.push(
      going.reduce(function (a, tile) {
        var i = labels[tile].findIndex(function (surface) {
          return Road.shapeOf(surface) === 0 && surface[0] === h;
        });

        a[tile] = i === -1 ? 0 : i;
        return a;
      }, Object.create(null)),
    );
  });

  var best = null,
    bestScore = -Infinity;

  guesses.forEach(function (guess) {
    var assigned = settle(guess),
      score = total(assigned);

    if (score > bestScore) {
      best = assigned;
      bestScore = score;
    }
  });

  var surfaces = Object.create(null);

  going.forEach(function (tile) {
    surfaces[tile] = labels[tile][best[tile]];
  });

  return {
    surfaces: surfaces,
    surface: function (tile) {
      return surfaces[tile] !== undefined
        ? surfaces[tile]
        : before.surface(tile);
    },
  };
};

/**
 * Which piece of road goes on tile: a ramp, if its surface is one, or else
 * flat, joined up to whichever of its four neighbours it meets
 * (Road.meets) - and the paved one, with pavements and street lights, for a
 * street (see Roadman#paved).
 *
 * @param net {{surface: function(number)}} the roads' surfaces (Road.network)
 * @param [kind] {boolean|string} what it is laid in: "plain" or "paved"
 *        asphalt - or true for paved - "gravel" or "cobble"
 * @returns {number} the piece: 9abcd for one joined up towards -x, -y, +x and
 *          +y as the digits say, 1..4 for a ramp, 1 up towards -y, 2 -x, 3 +y
 *          and 4 +x, RoadView.PAVED more for the paved one, twice and three
 *          times that for gravel and cobbles - see RoadView
 */
Road.profile = function (tile, net, kind) {
  var surface = net.surface(tile),
    id = Road.shapeOf(surface);

  if (id <= 0) {
    var j = [0, 1, 2, 3].map(function (side) {
      return Road.meets(surface, side, net.surface(tile + STEP[side])) ? 1 : 0;
    });

    id = 90000 + j[0] * 1000 + j[1] * 100 + j[2] * 10 + j[3];
  }

  if (kind === true) kind = "paved";

  return id + Math.max(0, RoadView.KINDS.indexOf(kind)) * RoadView.PAVED;
};

/**
 * What a road is laid in (see Road.profile): gravel or cobbles, as it was
 * laid - a bus stop, a street with a stop on it, where one was put - or asphalt, paved for a street of the city's (Roadman#paved), plain
 * otherwise. Roads laid before there was any choice are asphalt.
 */
Road.kindOf = function (roadman, data) {
  var material = data.look && data.look.material;

  //a stop for the buses (client/carman): a street, with its shelter
  if (data.look && data.look.stop) return "stop";

  if (material === "gravel" || material === "cobble") return material;

  return roadman.paved(data.tile) ? "paved" : "plain";
};

/**
 * What a new road on tile is laid in, the player having picked `material`:
 * that - but gravel laid next to the old town (shared/gen/oldtown) is
 * cobbled, the way its streets are.
 *
 * @param material {string} "gravel", "cobble" or "asphalt"
 * @param buildings {{get: function(number)}} core BuildingService
 */
Road.materialAt = function (material, tile, buildings) {
  if (material !== "gravel") return material;

  for (var dx = -1; dx <= 1; dx++)
    for (var dy = -1; dy <= 1; dy++) {
      var b = buildings.get(tile + dx * Terrain.dx + dy * Terrain.dy);

      if (b !== null && b.data.compound && b.data.compound.gen === "oldtown")
        return "cobble";
    }

  return material;
};

/**
 * Whether there is a bus stop on it.
 */
Road.prototype.isStop = function () {
  return !!(this.data && this.data.look && this.data.look.stop);
};

/**
 * The road's surface (see above).
 */
Road.prototype.surface = function () {
  var surface = Road.surfaceOf(this.data);

  return surface !== null
    ? surface
    : Surface.natural(this.root.core.terrain, this.data.tile);
};

Road.prototype.updateProfile = function () {
  var roadman = this.root.roadman,
    id = Road.profile(
      this.data.tile,
      Road.network(roadman),
      Road.kindOf(roadman, this.data),
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
