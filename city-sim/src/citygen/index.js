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
 *     road comes in, its square;
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
import water from "./water";
import balance from "./balance";
import nameOf from "./names";
import saveOf from "./save";

/**
 * The sizes of town there are: how far it reaches from its middle each way,
 * in tiles - the longer way first - and how far round it the country it
 * reaches out into goes, a share of that.
 */
export var SIZES = {
  //about the size of Peepstown (peepstown.js)
  city: {
    rx: 23,
    ry: 17,
    margin: 2.1,
    money: 500000,
    roundabouts: 2,
  },
};

/**
 * @param options {{size: string, seed: number, near: number[]}} which size
 *        (SIZES), the seed, and the tile x, y about which to look for a site
 * @returns {{save: Object, plan: Plan}}
 */
export default function generate(options) {
  var size = SIZES[options.size] || SIZES.city,
    random = Random(options.seed),
    ground = new Ground(),
    site = pickSite(ground, random.fork(1), options.near, size),
    plan = new Plan(ground, site, size.margin),
    streets = random.fork(2);

  layStreets(plan, streets);
  plan.boulevard = boulevard(plan, streets, streets.pick(["x", "y"]));
  plan.islands = roundabouts(plan, streets, size.roundabouts);
  plan.square = pickSquare(plan, streets);
  plan.graded = grade(plan);

  var built = buildUp(plan, random.fork(3));

  plan.watered = water(plan, random.fork(4));
  plan.tally = balance(plan);

  var hall = built.townHall,
    square = plan.square,
    at = square
      ? [(square.x0 + square.x1) >> 1, (square.y0 + square.y1) >> 1]
      : [plan.cx, plan.cy];

  if (hall) hall.first = true;

  var t = plan.tally,
    name = nameOf(random.fork(5), {
      coastal: plan.site.coastal,
      high: plan.ground.height(plan.wx(plan.cx), plan.wy(plan.cy)) >= 5,
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
