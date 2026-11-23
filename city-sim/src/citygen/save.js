/**
 * The town planned, as a save the game opens a city from - the way it keeps
 * one (isometrica core/persistence snapshot), the way the city a new player
 * starts on is kept (initialcity.js): the ground as it was shaped, the tiles
 * cleared of what the world grew there, and the city - its name, its money,
 * its people, and everything that stands in it, a road with what it is laid
 * in, which way it goes if it is one way, and the surface it was graded to.
 * A building's look is left for the game to pick as it first draws it, and
 * its surface for it to work out from the ground, as for one put up there.
 */
import Ground from "./ground";
import { ROAD as ROAD_CODE } from "./catalogue";

//ten in the morning, on the fourteenth day - a city starts in daylight
var MORNING = 13 * 86400000 + 10 * 3600000;

//what downtown is cleared of: the trees the world would grow between its
//buildings - out in the suburbs they are left in the gardens
var CLEARED_ZONES = {
  core: true,
  inner: true,
  oldtown: true,
  square: true,
  park: true,
};

/**
 * @param plan {Plan}
 * @param city {{name: string, money: number, population: number, tile:
 *        number[], at: number[]}} the town hall's tile and where the camera
 *        opens, each the window's x, y
 */
export default function saveOf(plan, city) {
  var buildings = [],
    cleared = Object.create(null);

  function tileOf(x, y) {
    return Ground.index(plan.wx(x), plan.wy(y));
  }

  //the roads first, from the middle of town out, as a town is laid out -
  //then what stands along them, the same way
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
