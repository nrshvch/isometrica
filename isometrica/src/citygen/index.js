/**
 * Generated cities: generate({size, seed, near, flat, layout}) ->
 * {plan, save}. Sizes, pipeline and rules: .claude/skills/citygen.
 */
import Random from "./random";
import Ground from "./ground";
import Plan from "./plan";
import pickSite from "./site";
import { layStreets, boulevard, roundabouts, pickSquare } from "./streets";
import grade from "./grade";
import { buildUp } from "./lots";
import { layVillage, buildVillage, ALLOWED as VILLAGE_KINDS } from "./village";
import water from "./water";
import balance from "./balance";
import nameOf from "./names";
import saveOf from "./save";

export var SIZES = {
  //a small town (village.js)
  town: {
    rx: 20,
    ry: 13,
    margin: 2,
    money: 150000,
    village: true,
  },
  //Peepstown's size
  city: {
    rx: 23,
    ry: 17,
    margin: 2.1,
    money: 500000,
    roundabouts: 2,
  },
  //Peepsopolis (layouts.md)
  metropolis: {
    rx: 46,
    ry: 34,
    margin: 1.5,
    money: 2000000,
    roundabouts: 6,
    grid: 20,
    districts: 4,
    parks: 4,
    name: "Peepsopolis",
    palettes: {
      core: { office: 6, store: 2, flats: 2, shop: 1 },
      coreHigh: { office: 5, store: 3, shop: 2, flats: 1 },
      inner: { flats: 6, house: 1.5, shop: 1, store: 0.5, office: 0.8 },
      innerHigh: { shop: 2.5, store: 2, flats: 3, office: 2 },
    },
  },
};

export default function generate(options) {
  var size = SIZES[options.size] || SIZES.city,
    random = Random(options.seed),
    flat = typeof options.flat === "number",
    ground = new Ground(flat ? options.flat : undefined),
    site = flat
      ? {
          x: Math.round(options.near[0]),
          y: Math.round(options.near[1]),
          rx: size.rx,
          ry: size.ry,
          coastal: false,
        }
      : pickSite(ground, random.fork(1), options.near, size),
    plan = new Plan(ground, site, size.margin),
    streets = random.fork(2),
    built,
    at;

  plan.size = size;

  //small town, or a city
  if (size.village) {
    var how = layVillage(plan, streets, options.layout);

    plan.village = how;
    plan.graded = grade(plan);
    built = buildVillage(plan, random.fork(3), how);
    at = built.at;
  } else {
    layStreets(plan, streets, size);

    if (size.grid) {
      plan.boulevard = boulevard(plan, streets, "x", { reachOut: 0.5 });
      plan.boulevards = [plan.boulevard];

      [-1, 1].forEach(function (dir) {
        plan.boulevards.push(
          boulevard(plan, streets, "y", {
            start: plan.cy + dir * Math.round(plan.ry * 0.7),
            reachIn: 0.5,
            reachOut: 0.95,
          }),
        );
      });
    } else {
      plan.boulevard = boulevard(plan, streets, streets.pick(["x", "y"]));
      plan.boulevards = [plan.boulevard];
    }

    plan.boulevards = plan.boulevards.filter(Boolean);
    plan.islands = roundabouts(plan, streets, size.roundabouts);
    plan.square = pickSquare(plan, streets);
    plan.graded = grade(plan);
    built = buildUp(plan, random.fork(3));

    var square = plan.square;

    at = square
      ? [(square.x0 + square.x1) >> 1, (square.y0 + square.y1) >> 1]
      : [plan.cx, plan.cy];
  }

  plan.watered = water(plan, random.fork(4), !!size.village);
  plan.tally = balance(plan, size.village ? VILLAGE_KINDS : null);

  var hall = built.townHall || built.church || null;

  if (hall) hall.first = true;

  var t = plan.tally,
    name =
      size.name ||
      nameOf(random.fork(5), {
        coastal: plan.site.coastal,
        high: plan.ground.height(plan.wx(plan.cx), plan.wy(plan.cy)) >= 5,
        small: !!size.village,
      });

  return {
    plan: plan,
    save: saveOf(plan, {
      name: name,
      money: size.money,
      population: t.villageBeds + Math.min(t.needBeds, t.jobs),
      tile: hall ? [hall.x, hall.y] : at,
      at: at,
    }),
  };
}
