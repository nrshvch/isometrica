/**
 * Generated cities: a town built up, all of it, somewhere in the world - a
 * save like any other, to start a new game on (ui/session), the way the
 * city a new player starts on is one (initialcity.js), but made up afresh
 * every time, out of a seed and a spot about which to look for a site.
 *
 * What goes into one, in order:
 *
 *  1. the site (site.js): dry, fairly level land, by the water if it can be;
 *  2. the streets (streets.js): the main roads through its middle and on out
 *     into the country, the blocks between them cut smaller towards the
 *     middle; a boulevard down its main street, a roundabout where a main
 *     road comes in, its square - or, for a small town, a road or two and a
 *     lane, the way a village is laid out (village.js);
 *  3. the roads graded (grade.js): each laid flat or as a ramp, so that the
 *     ones side by side meet level - the ground levelled under them where
 *     they cannot;
 *  4. the lots (lots.js): every block filled round its edge with what that
 *     part of town is built of, facing its streets - the town hall, the
 *     church and the market round the square, the old town by it, offices
 *     and stores downtown, flats, terraces and shops in town, houses and
 *     villas in the suburbs, farms along the roads out;
 *  5. the water (water.js): pump stations and water towers, so that
 *     everything that wants water has it;
 *  6. the jobs (balance.js): as many as there are people to work them, give
 *     or take, so that nothing stands empty for want of either.
 *
 * The same seed and spot make the same town, tile for tile.
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

/**
 * The sizes of town there are: how far it reaches from its middle each way,
 * in tiles - the longer way first - and how far round it the country it
 * reaches out into goes, a share of that. A small town (village: true) is
 * laid out and built up as a village is (village.js), the rest as a town is
 * (streets.js, lots.js).
 */
export var SIZES = {
  //a small town: a road or two, mostly country (village.js)
  town: {
    rx: 20,
    ry: 13,
    margin: 2,
    money: 150000,
    village: true,
  },
  //about the size of Peepstown (peepstown.js)
  city: {
    rx: 23,
    ry: 17,
    margin: 2.1,
    money: 500000,
    roundabouts: 2,
  },
  //Peepsopolis: a city four to six times Peepstown - a grid of arterials
  //(grid tiles apart) with the blocks cut inside each superblock of it, a
  //boulevard along its main avenue downtown and two more out along its
  //other, roundabouts on the arterials out of downtown, a central park and
  //a few more, the squares of the villages it grew over (districts), and
  //downtown its offices
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

/**
 * @param options {{size: string, seed: number, near: number[],
 *        flat: number, layout: string}} which size (SIZES), the seed, and
 *        the tile x, y about which to look for a site - or, with flat, right
 *        there, on ground as flat as a table at that height, no water
 *        anywhere: for looking at how it is laid out and nothing else
 *        (lab/cities); and for a small town, how it is laid out, if not as
 *        it comes (village LAYOUTS)
 * @returns {{save: Object, plan: Plan}}
 */
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

  if (size.village) {
    var how = layVillage(plan, streets, options.layout);

    plan.village = how;
    plan.graded = grade(plan);
    built = buildVillage(plan, random.fork(3), how);
    at = built.at;
  } else {
    layStreets(plan, streets, size);

    if (size.grid) {
      //down its main avenue downtown, and out along the other both ways
      //from where downtown ends
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

  //what the town is about: its town hall, or else its church
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
      //everybody the town has beds for, and jobs for those who need one
      population: t.villageBeds + Math.min(t.needBeds, t.jobs),
      tile: hall ? [hall.x, hall.y] : at,
      at: at,
    }),
  };
}
