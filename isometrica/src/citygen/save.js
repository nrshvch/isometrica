/**
 * The plan as a save (core/persistence snapshot).
 * See .claude/skills/citygen/engine.md (save).
 */
import Ground from "./ground";
import { ROAD as ROAD_CODE } from "./catalogue";

var MORNING = 13 * 86400000 + 10 * 3600000;

//no wild trees between buildings downtown
var CLEARED_ZONES = {
  core: true,
  inner: true,
  oldtown: true,
  square: true,
  park: true,
  centre: true,
  green: true,
};

export default function saveOf(plan, city) {
  var buildings = [],
    cleared = Object.create(null);

  function tileOf(x, y) {
    return Ground.index(plan.wx(x), plan.wy(y));
  }

  Object.keys(plan.roads)
    .map(function (k) {
      return plan.roads[k];
    })
    .sort(function (a, b) {
      return plan.reach(a.x, a.y) - plan.reach(b.x, b.y);
    })
    .forEach(function (r) {
      var look = { material: r.material };

      if (r.way >= 0) look.way = r.way;

      buildings.push({
        code: ROAD_CODE,
        tile: tileOf(r.x, r.y),
        rotation: 0,
        look: look,
        surface: r.surface,
      });
      cleared[tileOf(r.x, r.y)] = true;
    });

  plan
    .standing()
    .sort(function (a, b) {
      return (
        (a.first ? -1 : 0) - (b.first ? -1 : 0) ||
        plan.reach(a.x, a.y) - plan.reach(b.x, b.y)
      );
    })
    .forEach(function (b) {
      buildings.push({
        code: b.code,
        tile: tileOf(b.x, b.y),
        rotation: b.rotation,
      });

      for (var i = 0; i < b.w; i++)
        for (var j = 0; j < b.h; j++) cleared[tileOf(b.x + i, b.y + j)] = true;
    });

  plan.blocks.forEach(function (b) {
    if (!b.urban || !CLEARED_ZONES[b.zone]) return;

    for (var y = b.y0; y < b.y1; y++)
      for (var x = b.x0; x < b.x1; x++) cleared[tileOf(x, y)] = true;
  });

  return {
    version: 1,
    id: "generated",
    savedAt: 0,
    time: MORNING,
    terrain: {
      points: plan.ground.points(),
      cleared: Object.keys(cleared).map(Number),
    },
    city: {
      name: city.name,
      tile: tileOf(city.tile[0], city.tile[1]),
      resources: { money: city.money },
      population: city.population,
      research: { 0: 0, 1: 0, 2: 0, 3: 0 },
      buildings: buildings,
    },
    view: {
      turns: 0,
      at: [plan.wx(city.at[0]), plan.wy(city.at[1])],
    },
  };
}
