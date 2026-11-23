/**
 * As many jobs in town as there are people to work them, give or take: the
 * game has everybody who lives in the city work in it, the jobs going to the
 * beds of the oldest houses first and the people to the oldest businesses
 * first (core/city/cityjobs, citypopulation). Fewer jobs than the people who
 * need one, and the last houses stand empty - "no jobs"; more than there are
 * people, and the last businesses have nobody - "no workers". A village's
 * people need no job in town, but work there all the same.
 *
 * So the jobs are brought in between the two: at least as many as the beds
 * that need one, and no more than everybody in town - a lot along a street
 * turned from homes into shops, or from offices into flats, on the same
 * footprint, the same way round, where it suits the street: shops into
 * town, homes out of downtown last.
 */
import BuildingData from "../data/buildings";
import * as RoadRules from "../core/roadrules";
import { codesOf, info, WATER_TOWER, PUMP } from "./catalogue";

//what a lot of one kind can be turned into, the likeliest first
var TO_WORK = {
  flats: ["office", "store", "shop"],
  house: ["shop", "store"],
  villa: ["shop", "market"],
  village: ["market"],
};

var TO_HOMES = {
  office: ["flats"],
  store: ["flats", "house"],
  shop: ["house", "flats"],
  market: ["house"],
  oldtown: ["house", "village"],
};

//never turned into anything else
var KEEP = { civic: true, square: true, water: true, park: true };

export function tally(plan) {
  var t = { jobs: 0, needBeds: 0, villageBeds: 0 };

  plan.standing().forEach(function (b) {
    var i = info(b.code);

    t.jobs += i.jobs;
    if (i.needsJobs) t.needBeds += i.beds;
    else t.villageBeds += i.beds;
  });

  return t;
}

/**
 * @param [allowed] {Object} kind -> true for what the town may have built in
 *        it at all - everything, where left out
 * @returns {Object} the tally it ended with (tally)
 */
export default function balance(plan, allowed) {
  annotate(plan);

  for (var guard = 0; guard < 400; guard++) {
    var t = tally(plan),
      //the most jobs there are people for, less a little to spare
      most = t.needBeds + Math.floor(t.villageBeds * 0.8),
      short = t.needBeds - t.jobs,
      over = t.jobs - most;

    if (short <= 0 && over <= 0) return t;

    var swap =
      short > 0
        ? best(plan, TO_WORK, short, true, allowed)
        : best(plan, TO_HOMES, over, false, allowed);

    if (swap === null) return t;

    swap.b.code = swap.code;
  }

  return tally(plan);
}

/**
 * The swap that brings the jobs nearest to where they should be - by `by`,
 * as many as there are too few of or too many - among the lots that can be
 * turned, homes into work the nearer the middle of town, work into homes the
 * further out.
 */
function best(plan, table, by, toWork, allowed) {
  var found = null,
    bestScore = -Infinity;

  plan.standing().forEach(function (b) {
    if (KEEP[b.zone]) return;

    var was = info(b.code),
      into = table[was.kind];

    if (!into) return;

    //the footprint as built: its front and how deep it is
    var w = b.rotation & 1 ? b.h : b.w,
      d = b.rotation & 1 ? b.w : b.h;

    into.forEach(function (kind, rank) {
      if (allowed && !allowed[kind]) return;

      codesOf(kind, w, d).forEach(function (code) {
        var now = info(code),
          //how far it moves the jobs towards where they should be: work
          //for homes - the jobs up, and the beds wanting them down
          gain = toWork
            ? now.jobs -
              was.jobs +
              (was.needsJobs ? was.beds : 0) -
              (now.needsJobs ? now.beds : 0)
            : was.jobs -
              now.jobs +
              (now.needsJobs ? now.beds : 0) -
              (was.needsJobs ? was.beds : 0);

        if (gain <= 0) return;

        //a little past is as good as a little short; much past, worse
        var miss = Math.abs(by - gain),
          reach = b.reach === undefined ? 0.5 : b.reach,
          score = -miss - rank * 8 + (toWork ? -reach * 40 : reach * 40);

        //shops and work onto a road they can do with only, and where the
        //water reaches
        if (now.road !== null && !b.roadOk) return;
        if (now.water && !b.wet) return;

        if (score > bestScore) {
          bestScore = score;
          found = { b: b, code: code };
        }
      });
    });
  });

  return found;
}

/**
 * What the swaps go by, for every building: how far out it is, whether it
 * is on a road a shop can do with, and whether the water reaches it.
 */
function annotate(plan) {
  var sources = plan.standing().filter(function (b) {
    return b.code === WATER_TOWER || b.code === PUMP;
  });

  plan.standing().forEach(function (b) {
    b.reach = plan.reach(b.x, b.y);
    b.roadOk = alongside(plan, b, "cobble");
    b.wet = sources.some(function (s) {
      var dx = s.x - b.x,
        dy = s.y - b.y,
        r = BuildingData[s.code].waterRadius;

      return dx * dx + dy * dy <= r * r;
    });
  });
}

//whether there is a road at least `least` right alongside b, any side of it
//(core/city/cityroads alongside)
function alongside(plan, b, least) {
  for (var x = b.x - 1; x <= b.x + b.w; x++)
    for (var y = b.y - 1; y <= b.y + b.h; y++) {
      var corner = (x < b.x || x >= b.x + b.w) && (y < b.y || y >= b.y + b.h);

      if (corner) continue;

      var r = plan.road(x, y);

      if (r !== null && RoadRules.serves(r.material, least)) return true;
    }

  return false;
}
