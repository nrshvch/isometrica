/**
 * Turns lots into homes or work on the same footprint until
 * needBeds <= jobs <= needBeds + 0.8 * villageBeds: no noJobs / noWorkers.
 * See isometrica/.claude/skills/citygen/engine.md (water, jobs, people).
 */
import BuildingData from "../data/buildings";
import * as RoadRules from "../core/roadrules";
import { codesOf, info, WATER_TOWER, PUMP } from "./catalogue";

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

export default function balance(plan, allowed) {
  annotate(plan);

  for (var guard = 0; guard < 400; guard++) {
    var t = tally(plan),
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

function best(plan, table, by, toWork, allowed) {
  var found = null,
    bestScore = -Infinity;

  plan.standing().forEach(function (b) {
    if (KEEP[b.zone]) return;

    var was = info(b.code),
      into = table[was.kind];

    if (!into) return;

    var w = b.rotation & 1 ? b.h : b.w,
      d = b.rotation & 1 ? b.w : b.h;

    into.forEach(function (kind, rank) {
      if (allowed && !allowed[kind]) return;

      codesOf(kind, w, d).forEach(function (code) {
        var now = info(code),
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

        var miss = Math.abs(by - gain),
          reach = b.reach === undefined ? 0.5 : b.reach,
          score = -miss - rank * 8 + (toWork ? -reach * 40 : reach * 40);

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
