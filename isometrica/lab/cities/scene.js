/**
 * City bench scene: a generated city on flat grass, put up as a save would
 * have it. See .claude/skills/citygen.
 */
import generate, { SIZES } from "../../src/citygen/index.js";
import { LAYOUTS } from "../../src/citygen/village.js";
import { info } from "../../src/citygen/catalogue.js";
import BuildingCode from "../../src/data/buildingcode.js";
import Core from "../../src/core/main.js";
import { GROUND } from "../bench/world.js";

var Terrain = Core.Terrain;

var MARGIN = 2;

var ZOOM = { town: 1.5, city: 1, metropolis: 0.5 };

export var SIZE_NAMES = Object.keys(SIZES);
export var LAYOUT_NAMES = Object.keys(LAYOUTS);

export function Scene(world) {
  this.world = world;
  this.area = null;
}

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

//bulk put/wipe without the O(n^2) road repaving (.claude/skills/citygen/engine.md)
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
