/**
 * Town names: Peeps- and where it stands; small towns a village's name.
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

export default function nameOf(random, where) {
  var names = where.small ? VILLAGE.slice() : ANYWHERE.slice();

  if (where.coastal)
    names = names.concat(where.small ? VILLAGE_BY_WATER : BY_WATER);
  if (where.high) names = names.concat(UP_HIGH, UP_HIGH);

  var name = random.pick(names);

  if (where.small && random.chance(0.35)) return "Little " + name;

  if (random.chance(0.2)) name = random.pick(BEFORE) + name;
  else if (where.coastal && random.chance(0.12)) name += "-on-Sea";

  return name;
}
