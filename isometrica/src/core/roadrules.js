/**
 * The rules the roads are driven by, and nothing else - no pictures, no
 * world - so the traffic (client/traffic) can be run on its own, in the
 * traffic testbed (lab/traffic.html, tools/traffictest.js) as much as in
 * the game: where two roads join, which way a one-way road goes, how fast it
 * is driven, and the number a paved piece of road adds to its picture's.
 */

//how much more a paved road's piece number is than the plain one's, and
//gravel's twice that... (client/roadview)
export var PAVED = 100000;

//the heights along each side of a surface, -x, -y, +x, +y, each from its
//end nearer A
function edge(surface, side) {
  switch (side) {
    case 0:
      return [surface[0], surface[2]];
    case 1:
      return [surface[0], surface[1]];
    case 2:
      return [surface[1], surface[3]];
    default:
      return [surface[2], surface[3]];
  }
}

/**
 * Whether a road with surface a joins one with surface b next to it at side
 * - 0..3: -x, -y, +x, +y: where they meet level, at the same height all
 * along the edge between them. So never over a step, and never onto the
 * side of a ramp.
 *
 * @param b {number[]|null} null for no road there
 */
export function meets(a, side, b) {
  if (b === null) return false;

  var ours = edge(a, side),
    theirs = edge(b, (side + 2) % 4);

  return ours[0] === ours[1] && ours[0] === theirs[0] && ours[1] === theirs[1];
}

/**
 * The way a one-way road's traffic goes, from its core model - 0..3 for -x,
 * -y, +x, +y - or -1 for a road driven both ways.
 */
export function wayOf(data) {
  var way = data && data.look ? data.look.way : undefined;

  return way === 0 || way === 1 || way === 2 || way === 3 ? way : -1;
}

/**
 * Whether a car can go out of a road, or into it, going towards side - 0..3
 * for -x, -y, +x, +y: always on a road driven both ways, and on a one-way
 * road anything but against the way it goes.
 *
 * @param road {{data: Object}}
 */
export function goes(road, side) {
  var way = wayOf(road.data);

  return way < 0 || way === side || way % 2 !== side % 2;
}

//how fast a road of each kind is driven, a share of asphalt's: cobbles a
//tenth slower, gravel a tenth slower again
var PACE = { cobble: 0.9, gravel: 0.81 };

/**
 * How fast a road is driven, from its core model: 1 for asphalt, less for
 * cobbles and gravel (PACE).
 */
export function paceOf(data) {
  var material = data && data.look ? data.look.material : undefined;

  return PACE[material] || 1;
}

//what a road can be laid in, from the least of a road to the most: a
//building that wants a road of one of them (data/buildings requires) is
//served by that or anything after it - and a road an upgrade of another
//(core/city/citybuildings) is laid in one after the other's
export var MATERIALS = ["gravel", "cobble", "asphalt"];

/**
 * What a road is laid in, from its core model - asphalt for one laid before
 * there was any choice.
 */
export function materialOf(data) {
  var material = data && data.look ? data.look.material : undefined;

  return MATERIALS.indexOf(material) === -1 ? "asphalt" : material;
}

/**
 * Whether a road laid in material is at least the road `least` asks for -
 * any road at all for true or nothing.
 */
export function serves(material, least) {
  if (typeof least !== "string") return true;

  return MATERIALS.indexOf(material) >= MATERIALS.indexOf(least);
}
