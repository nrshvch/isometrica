/**
 * How warm the world is where: hot in the middle of it and colder the further
 * out - the way the Earth is hot at the equator and frozen at the poles, only
 * the world is flat, so its equator is the middle of it and its poles all of
 * its rim. The climate rings round the middle: desert there, the green world
 * further out, and snow and ice out at the edge.
 *
 * It all goes by one number, TEMPERATURE - how warm it is in the very middle.
 * From there it gets colder by a degree every 1 / LAPSE tiles out, the
 * further out the colder, and every zone (ZONES) starts at a temperature of
 * its own, so warming the world pushes every zone out at once: the desert
 * spreads, the green ring moves further out - a longer ring, more room - and
 * the snow draws back to the edge of the world.
 *
 * The rings are not round: how warm it is wanders a couple of degrees either
 * way over a few thousand tiles (heat). Nor does one zone end along a line
 * where the next starts. The tiles of both are mixed over BLEND degrees
 * either side of where it changes, a couple of thousand tiles - first a
 * patch of the next zone here and there, then more and bigger ones that run
 * into each other, until there is nothing left of the first: the way the
 * woods shade into each other (core/woods), on the scale of the world.
 *
 * Nothing here is kept: it is worked out from where a tile is, the same every
 * time - like the lie of the land (core/terrain).
 */
import Simplex from "simplex-noise";

//the middle of the world, in tiles: a tile's x and y are 16 bits each
//(core/terrain convertToIndex)
var CENTER = [32768, 32768];

//how warm it is in the middle of the world, °C - the one setting. Every
//degree warmer moves every zone 1 / LAPSE tiles further out. As warm as this,
//the city a new player of the city builder starts on, 5,600 tiles out
//(city-sim initialcity), is in the green, and so is the delivery game's,
//15,100 tiles out - the desert is no more than a heart of the world; warmer,
//it spreads out over them
var TEMPERATURE = 33;

//how much colder it is for every tile further out, °C
var LAPSE = 1 / 600;

//how far, °C, either side of where one zone gives way to the next their tiles
//are mixed
var BLEND = 3;

/**
 * The zones, the hottest first - each from the temperature it starts at
 * (from) to where the one before it does: what the ground there is (a tileset
 * of shared/gen/terrain), and what water is, where it is not water - frozen
 * over. Another zone - savannah, say, between the desert and the green - is
 * another row.
 *
 * With TEMPERATURE 33 the desert gives way at 2,400 tiles out from the middle,
 * and the snow comes in at 19,200; the middle of the world's edges are -22°.
 */
var ZONES = [
  { id: "hot", name: "Desert", ground: "sand_dunes", water: null, from: 29 },
  { id: "temperate", name: "Green", ground: "grass", water: null, from: 1 },
  {
    id: "cold",
    name: "Frozen",
    ground: "snow",
    water: "ice",
    from: -Infinity,
  },
];

var BY_ID = {};

ZONES.forEach(function (zone, i) {
  zone.index = i;
  BY_ID[zone.id] = zone;
});

//how far either way the patch noise mostly goes - 9 tiles in 10 are within
//it - for it to cover BLEND degrees either way
var PATCH_SPREAD = 0.5;

//how many tiles' zones are kept at the most before they are forgotten - the
//same few are asked about over and over, a tile and the ones round it
var KEPT = 65536;

var simplex = new Simplex("climate"),
  temperature = TEMPERATURE,
  //how warm a tile is worked out some other way than by how far it is from
  //the middle of the world, for a page of the lab (setHeat) - or null
  heatOf = null,
  kept = new Map();

//0 to 1, as good as random and always the same for the same numbers
function hash(x, y, salt) {
  var h =
    Math.imul(x, 0x27d4eb2d) ^
    Math.imul(y, 0x165667b1) ^
    Math.imul(salt, 0x9e3779b1);

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * How warm it is at tile x, y, °C: the further out from the middle the
 * colder, and a couple of degrees either way over a few thousand tiles, and a
 * little over a few hundred - smooth, the same for tiles next to each other.
 *
 * @param x {number}
 * @param y {number}
 * @returns {number}
 */
function heat(x, y) {
  if (heatOf !== null) return heatOf(x, y);

  var dx = x + 0.5 - CENTER[0],
    dy = y + 0.5 - CENTER[1];

  return (
    temperature -
    Math.sqrt(dx * dx + dy * dy) * LAPSE +
    3 * simplex.noise2D(x / 3000 + 71.3, y / 3000 - 19.7) +
    0.8 * simplex.noise2D(x / 300 - 402.1, y / 300 + 88.6)
  );
}

/**
 * Where tile x, y is in the patches the zones are mixed in, about -1 to 1:
 * big ones a couple of hundred tiles across, smaller ones round their edges,
 * ragged a few tiles at a time, and the odd tile on its own.
 */
function patch(x, y) {
  return (
    (0.55 * simplex.noise2D(x / 200 + 17.3, y / 200 - 41.9) +
      0.3 * simplex.noise2D(x / 40 - 233.7, y / 40 + 90.1) +
      0.15 * simplex.noise2D(x / 9 + 511.3, y / 9 + 7.7) +
      0.12 * (hash(x, y, 31) * 2 - 1)) /
    PATCH_SPREAD
  );
}

/**
 * The zone tile x, y is in - one of ZONES. Where two meet, now one and now the
 * other, in patches.
 *
 * @param x {number}
 * @param y {number}
 * @returns {Object}
 */
function zoneAt(x, y) {
  var key = y * 65536 + x,
    zone = kept.get(key);

  if (zone !== undefined) return zone;

  var t = heat(x, y) + BLEND * patch(x, y);

  for (var i = 0; i < ZONES.length - 1; i++) if (t >= ZONES[i].from) break;

  zone = ZONES[i];

  if (kept.size >= KEPT) kept.clear();
  kept.set(key, zone);

  return zone;
}

/**
 * What the ground of tile x, y is where it is land - a tileset of
 * shared/gen/terrain: "sand_dunes", "grass", "snow".
 *
 * @returns {string}
 */
function groundAt(x, y) {
  return zoneAt(x, y).ground;
}

/**
 * Whether the water at tile x, y is frozen over.
 *
 * @returns {boolean}
 */
function frozenAt(x, y) {
  return zoneAt(x, y).water === "ice";
}

/**
 * How far into a zone tile x, y is, °C: from where it starts - the nearer of
 * its two edges, for one between two - by how warm it is there (heat), not by
 * the patches. Below 0 outside it, by as much.
 *
 * @param x {number}
 * @param y {number}
 * @param id {string} one of ZONES' ids
 * @returns {number}
 */
function depth(x, y, id) {
  var zone = BY_ID[id],
    t = heat(x, y),
    d = Infinity;

  if (zone.from !== -Infinity) d = t - zone.from;
  if (zone.index > 0) d = Math.min(d, ZONES[zone.index - 1].from - t);

  return d;
}

/**
 * How far out from the middle of the world a zone starts - the hotter one
 * giving way to it - as the rings would be were they round, tiles: where it
 * is as warm as it starts at, the wander of heat left out. 0 for the one in
 * the middle.
 *
 * @param id {string}
 * @returns {number}
 */
function radius(id) {
  var zone = BY_ID[id];

  if (zone.index === 0) return 0;

  return Math.max(0, (temperature - ZONES[zone.index - 1].from) / LAPSE);
}

/**
 * Has it that much warmer in the middle of the world, °C, from now on - for a
 * tool, or a page of the lab, to see where the zones would be. The game goes
 * by TEMPERATURE.
 *
 * @param [t] {number} TEMPERATURE unless given
 */
function setTemperature(t) {
  temperature = t === undefined ? TEMPERATURE : t;
  kept.clear();
}

function getTemperature() {
  return temperature;
}

/**
 * Has how warm tile x, y is, °C, worked out by fn from now on, in place of
 * how far it is from the middle of the world - for a page of the lab to lay
 * the climate out over a patch of its own (lab/climate), or to keep its
 * ground green (lab/bench); the world's own way again, given nothing. Where
 * the zones change, their tiles are mixed all the same (BLEND). The game
 * never calls it.
 *
 * @param [fn] {function(number, number): number}
 */
function setHeat(fn) {
  heatOf = fn || null;
  kept.clear();
}

export default {
  CENTER: CENTER,
  TEMPERATURE: TEMPERATURE,
  LAPSE: LAPSE,
  BLEND: BLEND,
  ZONES: ZONES,
  heat: heat,
  zoneAt: zoneAt,
  groundAt: groundAt,
  frozenAt: frozenAt,
  depth: depth,
  radius: radius,
  setTemperature: setTemperature,
  getTemperature: getTemperature,
  setHeat: setHeat,
};
