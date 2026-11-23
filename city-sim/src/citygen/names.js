/**
 * What a generated town is called: a Peeps- town, named the way towns are,
 * for where it stands - a port or a mouth by the sea, a hill or a ridge up
 * high, a ford, a field or a bury anywhere else - and now and then a New, a
 * Great or a side of the compass before it, to tell it from the others.
 */
var BY_WATER = [
  "Peepsport",
  "Peepsmouth",
  "Peepshaven",
  "Peepswick",
  "Peepsbay",
];

var UP_HIGH = ["Peepshill", "Peepsridge", "Peepsmont", "Peepsdown"];

var ANYWHERE = [
  "Peepsbury",
  "Peepsford",
  "Peepsham",
  "Peepsfield",
  "Peepsworth",
  "Peepsley",
  "Peepsby",
  "Peepstead",
  "Peepsdale",
  "Peepsburgh",
  "Peepsbridge",
];

var BEFORE = [
  "New ",
  "Great ",
  "Upper ",
  "Lower ",
  "East ",
  "West ",
  "North ",
  "South ",
];

/**
 * @param random {Object} (random.js)
 * @param where {{coastal: boolean, high: boolean}}
 */
export default function nameOf(random, where) {
  var names = ANYWHERE.slice();

  if (where.coastal) names = names.concat(BY_WATER, BY_WATER);
  if (where.high) names = names.concat(UP_HIGH, UP_HIGH);

  var name = random.pick(names);

  if (random.chance(0.2)) name = random.pick(BEFORE) + name;
  else if (where.coastal && random.chance(0.12)) name += "-on-Sea";

  return name;
}
