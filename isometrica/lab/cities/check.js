/**
 * What test:cities checks: a map in letters, drivable roads, and each
 * building's wants in the real core. See isometrica/.claude/skills/citygen.
 */
import { ROAD, LOT, WATER, KEPT } from "../../src/citygen/plan";
import { info } from "../../src/citygen/catalogue";
import * as RoadRules from "../../src/core/roadrules";
import Logic from "../../src/core/logic";
import { wantOf } from "../../src/client/worth";

var WAYS = ["<", "^", ">", "v"];

var LETTERS = {
  village: "f",
  house: "h",
  villa: "v",
  flats: "a",
  shop: "s",
  store: "d",
  market: "m",
  office: "o",
  oldtown: "t",
  park: "p",
  square: "q",
  church: "c",
  townhall: "x",
};

export function letterOf(b) {
  if (b.code === 10) return "w";
  if (b.code === 11) return "u";

  return LETTERS[info(b.code).kind] || "?";
}

export function map(plan) {
  var rows = [],
    x,
    y;

  for (y = 0; y < plan.h; y++) {
    var row = "";

    for (x = 0; x < plan.w; x++) {
      var k = plan.index(x, y),
        what = plan.what[k];

      if (what === WATER) row += "~";
      else if (what === ROAD) {
        var r = plan.roads[k];

        row +=
          r.way >= 0
            ? WAYS[r.way]
            : r.material === "asphalt"
              ? "#"
              : r.material === "cobble"
                ? "%"
                : ":";
      } else if (what === LOT) {
        var b = plan.buildings[plan.on[k]],
          c = letterOf(b);

        row += b.x === x && b.y === y ? c.toUpperCase() : c.toLowerCase();
      } else if (what === KEPT) row += "+";
      else {
        var id = plan.blockOf[k];

        row += id >= 0 && plan.blocks[id].urban ? "." : " ";
      }
    }

    rows.push(row);
  }

  return rows.join("\n");
}

export function check(out) {
  var plan = out.plan,
    problems = [],
    graded = plan.graded,
    roads = Object.keys(plan.roads).length,
    urban = plan.blocks.filter(function (b) {
      return b.urban;
    }).length;

  if (graded.unmet.length > 0)
    problems.push(
      graded.unmet.length +
        " pairs of roads side by side do not meet: " +
        graded.unmet
          .slice(0, 6)
          .map(function (p) {
            return p[0] + "," + p[1] + "-" + p[2] + "," + p[3];
          })
          .join(" "),
    );

  var parts = drivable(plan);

  if (parts > 1)
    problems.push("the traffic cannot get everywhere: " + parts + " parts");

  var wants = {},
    opened = null;

  if (out.save) {
    opened = open(out.save);
    wants = opened.wants;

    ["cutOff", "road", "water"].forEach(function (w) {
      if (wants[w])
        problems.push(
          wants[w].length + " " + w + ": " + wants[w].slice(0, 5).join(" "),
        );
    });
  }

  return {
    ok: problems.length === 0,
    wants: wants,
    opened: opened,
    line:
      "at " +
      plan.site.x +
      "," +
      plan.site.y +
      (plan.site.coastal ? " by the water" : "") +
      "  " +
      urban +
      " blocks, " +
      roads +
      " roads" +
      (plan.village
        ? ", " + plan.village.layout + " village"
        : (plan.boulevards || [])
            .map(function (b) {
              return ", boulevard along " + b.axis + " " + (b.to - b.from + 1);
            })
            .join("") +
          ", " +
          (plan.islands || []).length +
          " roundabouts") +
      ", levelled " +
      graded.levelled +
      " times  " +
      (out.save ? out.save.city.name + ", " : "") +
      plan.standing().length +
      " buildings, " +
      (plan.watered
        ? plan.watered.pumps + " pumps " + plan.watered.towers + " towers, "
        : "") +
      (plan.tally
        ? "beds " +
          plan.tally.needBeds +
          "+" +
          plan.tally.villageBeds +
          " jobs " +
          plan.tally.jobs
        : ""),
    problems: problems,
  };
}

//strongly connected parts of the road graph as traffic drives it
export function drivable(plan) {
  var keys = Object.keys(plan.roads).map(Number),
    at = new Map(),
    SIDES = [
      [-1, 0],
      [0, -1],
      [1, 0],
      [0, 1],
    ];

  keys.forEach(function (k, i) {
    at.set(k, i);
  });

  function next(i) {
    var r = plan.roads[keys[i]],
      out = [];

    for (var s = 0; s < 4; s++) {
      var o = plan.road(r.x + SIDES[s][0], r.y + SIDES[s][1]);

      if (
        o !== null &&
        RoadRules.meets(r.surface, s, o.surface) &&
        RoadRules.goes({ data: { look: { way: r.way } } }, s) &&
        RoadRules.goes({ data: { look: { way: o.way } } }, s)
      )
        out.push(at.get(plan.index(o.x, o.y)));
    }

    return out;
  }

  var index = 0,
    idx = new Int32Array(keys.length).fill(-1),
    low = new Int32Array(keys.length),
    on = new Uint8Array(keys.length),
    stack = [],
    parts = 0;

  for (var root = 0; root < keys.length; root++) {
    if (idx[root] >= 0) continue;

    var work = [[root, 0, next(root)]];

    idx[root] = low[root] = index++;
    stack.push(root);
    on[root] = 1;

    while (work.length > 0) {
      var top = work[work.length - 1],
        v = top[0];

      if (top[1] < top[2].length) {
        var w = top[2][top[1]++];

        if (idx[w] < 0) {
          idx[w] = low[w] = index++;
          stack.push(w);
          on[w] = 1;
          work.push([w, 0, next(w)]);
        } else if (on[w]) low[v] = Math.min(low[v], idx[w]);
      } else {
        work.pop();
        if (work.length > 0) {
          var u = work[work.length - 1][0];

          low[u] = Math.min(low[u], low[v]);
        }

        if (low[v] === idx[v]) {
          var x;

          do {
            x = stack.pop();
            on[x] = 0;
          } while (x !== v);

          parts++;
        }
      }
    }
  }

  return parts;
}

function memory() {
  var items = {};

  return {
    getItem: function (k) {
      return k in items ? items[k] : null;
    },
    setItem: function (k, v) {
      items[k] = String(v);
    },
    removeItem: function (k) {
      delete items[k];
    },
    key: function (i) {
      return Object.keys(items)[i] || null;
    },
    get length() {
      return Object.keys(items).length;
    },
  };
}

//opens the save as the game does and asks every building what it lacks
export function open(save) {
  globalThis.localStorage = globalThis.localStorage || memory();
  globalThis.addEventListener = globalThis.addEventListener || function () {};
  globalThis.removeEventListener =
    globalThis.removeEventListener || function () {};
  globalThis.document = globalThis.document || {
    addEventListener: function () {},
    removeEventListener: function () {},
  };

  var world = new Logic({ tick: 300000, saves: "citytest", initialCity: null });
  world.start();
  world.pause();
  world.persistence.open(null, save);
  world.persistence.halt();

  var city = world.cities.getCities()[0],
    wants = {},
    beds = 0,
    jobs = 0;

  city.buildingService.getBuildings().forEach(function (b) {
    var want = wantOf(city, b);

    if (want !== null)
      (wants[want] || (wants[want] = [])).push(
        (b.tile & 0xffff) + "," + (b.tile >>> 16) + ":" + b.buildingCode,
      );

    beds += b.citizenCapacity();
    jobs += b.jobs();
  });

  return {
    wants: wants,
    population: city.population.getPopulation(),
    capacity: city.population.getCapacity(),
    beds: beds,
    jobs: jobs,
    budget: city.getBudget(),
  };
}
