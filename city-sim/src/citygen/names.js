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

//and a small town's: a village's names
var VILLAGE = [
  "Peepsthorpe",
  "Peepscote",
  "Peepsby",
  "Peepsley",
  "Peepston",
  "Peepsfold",
  "Peepswell",
  "Peepsham",
  "Peepstead",
  "Peepsford",
];

var VILLAGE_BY_WATER = ["Peepscove", "Peepshaven", "Peepsbrook", "Peepsmere"];

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
 * @param where {{coastal: boolean, high: boolean, small: boolean}} - small,
 *        for a small town
 */
export default function nameOf(random, where) {
  var names = where.small ? VILLAGE.slice() : ANYWHERE.slice();

  if (where.coastal)
    names = names.concat(where.small ? VILLAGE_BY_WATER : BY_WATER);
  if (where.high) names = names.concat(UP_HIGH, UP_HIGH);

  var name = random.pick(names);

  //a small town is Little this as often as not
  if (where.small && random.chance(0.35)) return "Little " + name;

  if (random.chance(0.2)) name = random.pick(BEFORE) + name;
  else if (where.coastal && random.chance(0.12)) name += "-on-Sea";

  return name;
}
