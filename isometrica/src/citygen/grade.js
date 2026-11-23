/**
 * The streets graded: every road laid flat or as a ramp - the surfaces the
 * game lays one on (client/road surfaces) - so that the roads side by side
 * meet level all along the edge between them (core/roadrules meets), the
 * way the traffic only drives where they do. Each is the one that has the
 * most of them join up and, as far as that goes, takes the least concrete,
 * worked out for all of them together the way the game works out a road
 * dragged out (client/road plan): from a few first guesses - each the
 * cheapest, all of them level at each height there is - bettered a road at a
 * time, and two side by side at a time, till nothing betters it.
 *
 * A ramp only on a road that goes on straight, along its slope: never at a
 * junction, nor round a corner, which a ramp does not join up with.
 *
 * Where roads still do not meet - the ground too steep, too broken up for a
 * street - the ground is levelled under the two of them, the way a town
 * levels a street: they and the ground round them brought to one height, and
 * it is worked out again.
 */
import { SIDES } from "./plan";
import Surface from "../core/surface";
import * as RoadRules from "../core/roadrules";

//what a road joined up is worth, against a corner's worth of concrete
var JOIN = 10;

//how many times the ground is levelled under what does not meet, and it is
//graded again
var ROUNDS = 6;

//what a road with surface takes laid on ground g: a corner's worth of
//concrete for each corner over the ground, and more for a ramp up on
//concrete (client/road cost)
function cost(g, surface) {
  var drops = 0;

  for (var k = 0; k < 4; k++) drops += surface[k] - g[k];

  return drops + (drops > 0 && Surface.shapeOf(surface) > 0 ? 3 : 0);
}

//a ramp's axis: 1 along x (up towards -x or +x), 2 along y; 0 for flat
function axisOf(surface) {
  var shape = Surface.shapeOf(surface);

  return shape === 2 || shape === 4 ? 1 : shape === 1 || shape === 3 ? 2 : 0;
}

/**
 * Grades the plan's roads, each road's surface set (road.surface).
 *
 * @returns {{unmet: number[][], levelled: number}} the roads side by side
 *          that still do not meet, each pair [x, y, x, y], and how many times
 *          the ground was levelled for them
 */
export default function grade(plan) {
  var levelled = 0,
    result;

  for (var round = 0; ; round++) {
    result = assign(plan);

    if (result.unmet.length === 0 || round >= ROUNDS) break;

    //every pair that does not meet levelled, at the height of the higher -
    //filled in, rather than dug out - and if that cannot be, the lower
    var did = 0;

    result.unmet.forEach(function (pair) {
      var a = plan.ground.corners(plan.wx(pair[0]), plan.wy(pair[1])),
        b = plan.ground.corners(plan.wx(pair[2]), plan.wy(pair[3])),
        hi = Math.max(Math.max.apply(null, a), Math.max.apply(null, b)),
        lo = Math.min(Math.max.apply(null, a), Math.max.apply(null, b)),
        tiles = [
          [plan.wx(pair[0]), plan.wy(pair[1])],
          [plan.wx(pair[2]), plan.wy(pair[3])],
        ];

      if (plan.ground.level(tiles, hi) || plan.ground.level(tiles, lo)) did++;
    });

    levelled += did;

    if (did === 0) break;
  }

  return { unmet: result.unmet, levelled: levelled };
}

function assign(plan) {
  var ground = plan.ground,
    keys = Object.keys(plan.roads),
    roads = keys.map(function (k) {
      return plan.roads[k];
    }),
    n = roads.length,
    byIndex = Object.create(null),
    options = [],
    costs = [],
    nbr = [],
    i,
    j,
    s;

  for (i = 0; i < n; i++) byIndex[keys[i]] = i;

  //the roads next to each, by side - -1 for none
  for (i = 0; i < n; i++) {
    var r = roads[i],
      sides = [-1, -1, -1, -1];

    for (s = 0; s < 4; s++) {
      var k = plan.inside(r.x + SIDES[s][0], r.y + SIDES[s][1])
        ? plan.index(r.x + SIDES[s][0], r.y + SIDES[s][1])
        : -1;

      if (k >= 0 && byIndex[k] !== undefined) sides[s] = byIndex[k];
    }

    nbr.push(sides);
  }

  for (i = 0; i < n; i++) {
    var g = ground.corners(plan.wx(roads[i].x), plan.wy(roads[i].y)),
      alongX = nbr[i][1] < 0 && nbr[i][3] < 0,
      alongY = nbr[i][0] < 0 && nbr[i][2] < 0,
      all = ground.roadSurfaces(plan.wx(roads[i].x), plan.wy(roads[i].y));

    //a ramp only where the road goes on straight along it
    var mine = all.filter(function (surface) {
      var axis = axisOf(surface);

      return axis === 0 || (axis === 1 && alongX) || (axis === 2 && alongY);
    });

    //nothing will do: the ground as it is, for now - it is levelled after
    if (mine.length === 0) mine = [g.slice()];

    options.push(mine);
    costs.push(
      mine.map(function (surface) {
        return cost(g, surface);
      }),
    );
  }

  function local(i, o, assigned) {
    var surface = options[i][o],
      score = -costs[i][o];

    for (var s = 0; s < 4; s++) {
      var m = nbr[i][s];

      if (m >= 0 && RoadRules.meets(surface, s, options[m][assigned[m]]))
        score += JOIN;
    }

    return score;
  }

  function around(list, assigned) {
    var sum = 0,
      seen = Object.create(null);

    list.forEach(function (i) {
      [i].concat(nbr[i]).forEach(function (m) {
        if (m < 0 || seen[m]) return;

        seen[m] = true;
        sum += local(m, assigned[m], assigned);
      });
    });

    return sum;
  }

  function total(assigned) {
    var sum = 0;

    for (var i = 0; i < n; i++) sum += local(i, assigned[i], assigned);

    return sum;
  }

  function settle(assigned) {
    for (var pass = 0; pass < 40; pass++) {
      var changed = false;

      for (var i = 0; i < n; i++) {
        if (options[i].length < 2) continue;

        var was = assigned[i],
          best = was,
          bestScore = around([i], assigned);

        for (var o = 0; o < options[i].length; o++) {
          assigned[i] = o;

          var score = around([i], assigned);

          if (score > bestScore) {
            best = o;
            bestScore = score;
          }
        }

        assigned[i] = best;
        if (best !== was) changed = true;
      }

      //two side by side changing together - a road up onto a levelled one
      //takes both - where they do not meet yet
      for (i = 0; i < n; i++)
        for (var s = 2; s < 4; s++) {
          var m = nbr[i][s];

          if (
            m < 0 ||
            RoadRules.meets(options[i][assigned[i]], s, options[m][assigned[m]])
          )
            continue;

          var wasI = assigned[i],
            wasM = assigned[m],
            bestPair = [wasI, wasM],
            bestPairScore = around([i, m], assigned);

          for (var a = 0; a < options[i].length; a++)
            for (var b = 0; b < options[m].length; b++) {
              assigned[i] = a;
              assigned[m] = b;

              var sc = around([i, m], assigned);

              if (sc > bestPairScore) {
                bestPair = [a, b];
                bestPairScore = sc;
              }
            }

          assigned[i] = bestPair[0];
          assigned[m] = bestPair[1];
          if (bestPair[0] !== wasI || bestPair[1] !== wasM) changed = true;
        }

      if (!changed) break;
    }

    return assigned;
  }

  //first guesses: each the cheapest; and all of them level at each height
  //some of them can be levelled at
  var guesses = [new Int32Array(n)],
    heights = [];

  for (i = 0; i < n; i++)
    options[i].forEach(function (surface) {
      if (Surface.shapeOf(surface) === 0 && heights.indexOf(surface[0]) < 0)
        heights.push(surface[0]);
    });

  heights.forEach(function (h) {
    var guess = new Int32Array(n);

    for (var i = 0; i < n; i++) {
      var o = options[i].findIndex(function (surface) {
        return Surface.shapeOf(surface) === 0 && surface[0] === h;
      });

      guess[i] = o < 0 ? 0 : o;
    }

    guesses.push(guess);
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

  var unmet = [];

  for (i = 0; i < n; i++) {
    roads[i].surface = options[i][best[i]].slice();

    for (s = 2; s < 4; s++) {
      j = nbr[i][s];

      if (
        j >= 0 &&
        !RoadRules.meets(options[i][best[i]], s, options[j][best[j]])
      )
        unmet.push([roads[i].x, roads[i].y, roads[j].x, roads[j].y]);
    }
  }

  return { unmet: unmet };
}
