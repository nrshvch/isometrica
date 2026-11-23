/**
 * The city bench (lab/cities.html): a town generated afresh (src/citygen) -
 * a small town, a city of Peepstown's size, Peepsopolis - on a patch of flat
 * grass and nothing else (lab/bench/world), for how its roads and buildings
 * are laid out and nothing more: no water to keep off, no hills to level,
 * nobody living in it, no traffic. Put up as it would come out of a save -
 * the roads laid in what the generator laid them in, going the way it has
 * them go, every building turned to face its street - another seed, size or
 * layout at a click, and what was there before taken away at once.
 */
import generate, { SIZES } from "../../src/citygen/index.js";
import { LAYOUTS } from "../../src/citygen/village.js";
import { info } from "../../src/citygen/catalogue.js";
import BuildingCode from "../../src/data/buildingcode.js";
import Core from "../../src/core/main.js";
import { GROUND } from "../bench/world.js";

var Terrain = Core.Terrain;

//how far the grass reaches out round the window the town was planned in
var MARGIN = 2;

//how close the camera is for each size, to begin with (client/cameracontrol
//ZOOMS)
var ZOOM = { town: 1.5, city: 1, metropolis: 0.5 };

export var SIZE_NAMES = Object.keys(SIZES);
export var LAYOUT_NAMES = Object.keys(LAYOUTS);

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Scene(world) {
  this.world = world;
  //the patch the town before stood on, to be taken away: {x, y, w, h}
  //from the middle of the bench
  this.area = null;
}

/**
 * Generates a town and puts it up in the place of the one there was.
 *
 * @param want {{size: string, seed: number, layout: string}}
 * @returns {Object} how it came out (stats) - or null while the one before
 *          is still being taken away
 */
Scene.prototype.make = function (want) {
  var world = this.world,
    middle = world.tile(0, 0),
    mx = Terrain.extractX(middle),
    my = Terrain.extractY(middle),
    started = performance.now(),
    out = generate({
      size: want.size,
      seed: want.seed,
      near: [mx, my],
      flat: GROUND,
      layout: want.layout || undefined,
    }),
    generated = performance.now() - started,
    plan = out.plan,
    //the window's corner, from the middle of the bench
    dx = plan.ox - mx,
    dy = plan.oy - my,
    a = this.area;

  if (
    a !== null &&
    !quietly(world, [], function () {
      return world.wipe(a.x, a.y, a.w, a.h);
    })
  )
    return null;

  this.area = {
    x: dx - MARGIN,
    y: dy - MARGIN,
    w: plan.w + 2 * MARGIN,
    h: plan.h + 2 * MARGIN,
  };
  world.ground(this.area.x, this.area.y, this.area.w, this.area.h);

  started = performance.now();

  var missed = 0,
    roads = Object.keys(plan.roads).map(function (k) {
      return plan.roads[k];
    });

  quietly(
    world,
    roads.map(function (r) {
      return world.tile(dx + r.x, dy + r.y);
    }),
    function () {
      roads.forEach(function (r) {
        var look = { material: r.material };

        if (r.way >= 0) look.way = r.way;

        if (world.put(BuildingCode.road, dx + r.x, dy + r.y, 0, look) === null)
          missed++;
      });

      plan.standing().forEach(function (b) {
        if (world.put(b.code, dx + b.x, dy + b.y, b.rotation) === null)
          missed++;
      });
    },
  );

  var put = performance.now() - started,
    at = out.save.view.at;

  world.look(at[0] - mx, at[1] - my);
  world.client.camera.cameraScript.zoom(ZOOM[want.size] || 1);

  this.plan = plan;

  return stats(plan, out.save, {
    generated: generated,
    put: put,
    missed: missed,
  });
};

/**
 * Does fn - a whole town put up or taken away, a building at a time - with
 * the roads drawn plain meanwhile, and then the pieces of the roads on tiles
 * worked out once. Every building that goes up or comes down has the roads
 * by it work out their pieces again (client/roadman updateRoadsAround), a
 * street paved or not by whether it is of the city's road network (Roadman
 * paved) - which is worked out again for all of the city whenever anything
 * goes up or comes down: a thousand buildings, a thousand times. The game
 * never meets it - a city is opened before anything of it is drawn.
 */
function quietly(world, tiles, fn) {
  var roadman = world.client.roadman,
    paved = roadman.paved,
    out;

  roadman.paved = function () {
    return false;
  };

  try {
    out = fn();
  } finally {
    roadman.paved = paved;
  }

  tiles.forEach(function (tile) {
    var road = roadman.anyRoad(tile);

    if (road !== null) road.updateProfile();
  });

  return out;
}

/**
 * How a town came out: its plan, what stands in it, by kind, and what it
 * took.
 */
export function stats(plan, save, took) {
  var roads = { asphalt: 0, cobble: 0, gravel: 0, oneWay: 0 },
    kinds = {},
    beds = 0,
    jobs = 0;

  Object.keys(plan.roads).forEach(function (k) {
    var r = plan.roads[k];

    roads[r.material]++;
    if (r.way >= 0) roads.oneWay++;
  });

  plan.standing().forEach(function (b) {
    var what =
      b.code === BuildingCode.waterTower
        ? "water tower"
        : b.code === BuildingCode.waterPump
          ? "pump station"
          : info(b.code).kind;

    kinds[what] = (kinds[what] || 0) + 1;
    beds += info(b.code).beds;
    jobs += info(b.code).jobs;
  });

  return {
    name: save.city.name,
    window: plan.w + " × " + plan.h,
    layout: plan.village
      ? plan.village.layout
      : (plan.boulevards || []).length + " boulevards",
    blocks: plan.blocks.filter(function (b) {
      return b.urban;
    }).length,
    roads: roads,
    roundabouts: (plan.islands || []).length,
    squares: (plan.squares || []).length,
    buildings: plan.standing().length,
    kinds: kinds,
    beds: beds,
    jobs: jobs,
    took: took,
  };
}
