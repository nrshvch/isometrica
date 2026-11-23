/**
 * The town's water: pump stations and water towers, so that everything that
 * wants water has it - reaching it as the game reckons it, from the tile
 * each stands on to the tile the building does, as the crow flies, as far
 * as its radius (core/city/citywater).
 *
 * A pump station waters three times as far as a tower for four times its
 * upkeep - nine times the ground - so the town is watered by pump stations
 * first, as many as each still waters a good part of what has none, put up
 * by the water where there is any to pump - a lake, the sea - and then
 * whatever is left out is watered by towers, up on the high ground where a
 * tower goes. Each goes up on open ground of the town if there is some,
 * or else in the place of a lot - whatever of it the station does not take
 * left a park.
 */
import BuildingData from "isometrica/data/buildings";
import { FREE, WATER } from "./plan";
import { info, WATER_TOWER, PUMP } from "./catalogue";
import { parkUp } from "./lots";

//a pump station goes up only while it waters at least this many buildings
//that have no water yet - fewer than that are a tower's to water
var PUMP_LEAST = 24;

//what is never pulled down for one
var KEEP = { civic: true, square: true };

function radius(code) {
  return BuildingData[code].waterRadius;
}

/**
 * @param [near] {boolean} whether it may go up on open ground right by the
 *        houses as well, out of the town's blocks - a village's, along its
 *        roads, has few blocks to it
 * @returns {{pumps: number, towers: number, dry: number}} how many of each
 *          went up, and how many buildings still have no water - none
 */
export default function water(plan, random, near) {
  var wants = plan.standing().filter(function (b) {
      return info(b.code).water;
    }),
    covered = new Set(),
    pumps = 0,
    towers = 0;

  function dry() {
    return wants.filter(function (b) {
      return !b.gone && !covered.has(b);
    });
  }

  function reaches(x, y, r, list) {
    var r2 = r * r;

    return list.filter(function (b) {
      var dx = b.x - x,
        dy = b.y - y;

      return dx * dx + dy * dy <= r2;
    });
  }

  //open ground right by a building of the town - two tiles from it at
  //most, so that it hangs together with it (core/city/cityroads)
  var byHouses = near ? beside(plan) : null;

  //where one could go up, w by w: open ground of the town, or a lot it
  //could take the place of - at the lot's corner
  function sites(w) {
    var out = [],
      x,
      y;

    for (y = 0; y + w <= plan.h; y++)
      for (x = 0; x + w <= plan.w; x++) {
        var k = plan.index(x, y),
          id = plan.blockOf[k];

        if ((id < 0 || !plan.blocks[id].urban) && !(byHouses && byHouses[k]))
          continue;
        if (plan.free(x, y, w, w)) out.push({ x: x, y: y, lot: null });
      }

    plan.standing().forEach(function (b) {
      if (b.w < w || b.h < w || KEEP[b.zone] || b.code === PUMP) return;
      if (b.code === WATER_TOWER) return;

      out.push({ x: b.x, y: b.y, lot: b });
    });

    return out;
  }

  //how good a site is: what it waters that has none, less what it pulls
  //down; a pump by the water, a tower up high
  function score(site, code, left) {
    var gets = reaches(site.x, site.y, radius(code), left).length;

    if (site.lot !== null) {
      var lost = info(site.lot.code);

      //watering itself no more - it is gone
      if (left.indexOf(site.lot) >= 0) gets--;
      gets -= (lost.beds + lost.jobs) / 40 + 1;
    }

    var wx = plan.wx(site.x),
      wy = plan.wy(site.y);

    if (code === PUMP && byWater(plan, site.x, site.y, 4)) gets += 6;
    if (code === WATER_TOWER) gets += plan.ground.height(wx, wy) * 0.3;

    return gets;
  }

  function put(site, code) {
    var w = code === PUMP ? 2 : 1,
      freed = [];

    if (site.lot !== null) {
      for (var i = 0; i < site.lot.w; i++)
        for (var j = 0; j < site.lot.h; j++)
          freed.push([site.lot.x + i, site.lot.y + j]);

      plan.unbuild(site.lot);
    }

    var b = plan.build(code, site.x, site.y, w, w, random.int(0, 3), {
      zone: "water",
    });

    reaches(site.x, site.y, radius(code), dry()).forEach(function (d) {
      covered.add(d);
    });

    //what is left of the lot, a park
    if (freed.length > 0)
      parkUp(
        plan,
        random,
        freed.filter(function (c) {
          return plan.at(c[0], c[1]) === FREE;
        }),
      );

    return b;
  }

  //the pump stations
  for (;;) {
    var left = dry();

    if (left.length < PUMP_LEAST) break;

    var best = null,
      bestScore = PUMP_LEAST - 1;

    sites(2).forEach(function (site) {
      var s = score(site, PUMP, left);

      if (s > bestScore) {
        best = site;
        bestScore = s;
      }
    });

    if (best === null) break;

    put(best, PUMP);
    pumps++;
  }

  //and towers for whatever is left out - there is always somewhere for
  //one: in the place of the very building that has no water, if nowhere
  //else
  for (var guard = 0; guard < 200; guard++) {
    left = dry();

    if (left.length === 0) break;

    var site1 = null,
      score1 = -Infinity;

    sites(1).forEach(function (site) {
      //only where it waters something that has none
      if (reaches(site.x, site.y, radius(WATER_TOWER), left).length === 0)
        return;

      var s = score(site, WATER_TOWER, left);

      if (s > score1) {
        site1 = site;
        score1 = s;
      }
    });

    if (site1 === null) break;

    put(site1, WATER_TOWER);
    towers++;
  }

  return { pumps: pumps, towers: towers, dry: dry().length };
}

//every tile within two of a building that is not a farm's, by its index
function beside(plan) {
  var mask = new Uint8Array(plan.w * plan.h);

  plan.standing().forEach(function (b) {
    if (b.zone === "farm") return;

    for (var x = b.x - 2; x < b.x + b.w + 2; x++)
      for (var y = b.y - 2; y < b.y + b.h + 2; y++)
        if (plan.inside(x, y)) mask[plan.index(x, y)] = 1;
  });

  return mask;
}

function byWater(plan, x, y, most) {
  for (var dy = -most; dy <= most + 1; dy++)
    for (var dx = -most; dx <= most + 1; dx++)
      if (plan.at(x + dx, y + dy) === WATER) return true;

  return false;
}
