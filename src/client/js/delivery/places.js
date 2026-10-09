/**
 * Where food is picked up and where it goes, out of the buildings standing in
 * the city: the small shops are restaurants, the stores and markets sell
 * groceries, the old town bakes; the houses, the flats and the offices order.
 *
 * Each place is what it is because of the tile it stands on - its name, what
 * it cooks, who lives there - so the same building is always the same
 * restaurant, the same customer.
 *
 * A place is only somewhere to go if the car can get to it: it needs a road
 * alongside it that is joined to the one the car is on. The car pulls up on
 * that road - the one nearest the middle of the building.
 */
import Terrain from "core/terrain";
import Surface from "core/surface";
import BuildingState from "core/buildingstate";
import BuildingData from "data/buildings";
import BuildingClassCode from "data/classcode";
import Roads from "./roads";

//what restaurants there are, and what they serve: the name of one is picked
//by the tile it stands on, its dishes for each order
var CUISINES = {
  burger: {
    icon: "🍔",
    names: ["Blaze Burgers", "Smash Shack", "Patty Wagon", "Grill Bros"],
    dishes: [
      "Cheeseburger",
      "Double Smash",
      "Chicken Burger",
      "Veggie Burger",
      "Fries",
      "Onion Rings",
      "Milkshake",
    ],
  },
  pizza: {
    icon: "🍕",
    names: ["Napoli Slice", "Luigi's", "Forno Rosso", "Pizza Piazza"],
    dishes: [
      "Margherita",
      "Pepperoni",
      "Quattro Formaggi",
      "Diavola",
      "Garlic Bread",
      "Tiramisu",
    ],
  },
  sushi: {
    icon: "🍣",
    names: ["Sushi Kumo", "Maki Maki", "Tokyo Roll", "Wasabi"],
    dishes: [
      "Salmon Nigiri",
      "California Roll",
      "Spicy Tuna Roll",
      "Poke Bowl",
      "Miso Soup",
      "Edamame",
    ],
  },
  noodles: {
    icon: "🍜",
    names: ["Noodle Bar", "Wok This Way", "Pho Real", "Golden Dragon"],
    dishes: [
      "Pad Thai",
      "Tonkotsu Ramen",
      "Pho Bo",
      "Gyoza",
      "Spring Rolls",
      "Fried Rice",
    ],
  },
  kebab: {
    icon: "🥙",
    names: ["Kebab Palace", "Falafel King", "Istanbul Grill", "Meze House"],
    dishes: [
      "Döner Wrap",
      "Falafel Plate",
      "Shawarma",
      "Lahmacun",
      "Hummus",
      "Baklava",
    ],
  },
  tacos: {
    icon: "🌮",
    names: ["Taco Loco", "El Burro", "Casa Salsa", "La Cantina"],
    dishes: [
      "Tacos al Pastor",
      "Burrito",
      "Quesadilla",
      "Nachos",
      "Churros",
      "Guacamole",
    ],
  },
};

//the stores and markets: what is in a bag of shopping
var GROCERIES = {
  icon: "🛒",
  names: ["Orchard Market", "Corner Grocer", "FreshMart", "Daily Basket"],
  dishes: [
    "Milk",
    "Eggs",
    "Bread",
    "Apples",
    "Bananas",
    "Pasta",
    "Tomatoes",
    "Cheese",
    "Coffee",
    "Rice",
    "Yoghurt",
    "Chicken",
  ],
};

var BAKERY = {
  icon: "🥐",
  names: [
    "Old Town Bakery",
    "The Crusty Loaf",
    "Guild Hall Café",
    "Le Fournil",
  ],
  dishes: [
    "Croissants",
    "Sourdough Loaf",
    "Cinnamon Buns",
    "Apple Strudel",
    "Cappuccino",
    "Quiche",
  ],
};

var FIRST_NAMES = [
  "Anna",
  "Ben",
  "Chloe",
  "Daniel",
  "Ella",
  "Felix",
  "Grace",
  "Hugo",
  "Ivy",
  "Jonas",
  "Kate",
  "Leo",
  "Mia",
  "Noah",
  "Olivia",
  "Paul",
  "Rosa",
  "Sam",
  "Tara",
  "Victor",
  "Wendy",
  "Yuri",
  "Zoe",
];

var OFFICES = [
  "Pillar Bank",
  "Bolt & Co",
  "Amber Studios",
  "Nimbus Labs",
  "Copperfield Law",
  "Brightwave",
  "Northwind",
  "Atlas Insurance",
];

/**
 * A number out of a tile, the same every time, different for every tile and
 * for every salt.
 */
function hash(tile, salt) {
  var h = (tile ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;

  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;

  return (h ^ (h >>> 16)) >>> 0;
}

function pick(list, tile, salt) {
  return list[hash(tile, salt) % list.length];
}

var CUISINE_KEYS = Object.keys(CUISINES);

/**
 * What a building is to the courier: somewhere to pick up from, somewhere to
 * deliver to, or neither (null) - a road, a tree, a water tower, a park.
 */
function describe(building) {
  var data = BuildingData[building.buildingCode],
    gen = data.compound ? data.compound.gen : null,
    tile = building.tile,
    menu;

  if (
    gen === "shops" ||
    (gen === null && data.classCode === BuildingClassCode.commerce)
  ) {
    //the small shops (tier 1) cook; the stores and the markets sell groceries
    if (data.tier >= 2) {
      return {
        pickup: true,
        kind: "grocery",
        menu: "groceries",
        icon: GROCERIES.icon,
        name: pick(GROCERIES.names, tile, 1),
      };
    }

    menu = pick(CUISINE_KEYS, tile, 2);

    return {
      pickup: true,
      kind: "restaurant",
      menu: menu,
      icon: CUISINES[menu].icon,
      name: pick(CUISINES[menu].names, tile, 3),
    };
  }

  if (gen === "oldtown")
    return {
      pickup: true,
      kind: "bakery",
      menu: "bakery",
      icon: BAKERY.icon,
      name: pick(BAKERY.names, tile, 4),
    };

  if (gen === "offices")
    return {
      pickup: false,
      kind: "office",
      icon: "🏢",
      name: pick(OFFICES, tile, 5),
      where: "floor " + (2 + (hash(tile, 6) % 9)),
    };

  if (gen === "flats") {
    var floor = 1 + (hash(tile, 7) % 6);

    return {
      pickup: false,
      kind: "flat",
      icon: "🏬",
      name: pick(FIRST_NAMES, tile, 8),
      where: "flat " + floor + "ABCD".charAt(hash(tile, 9) % 4),
    };
  }

  if (gen === "houses" || data.classCode === BuildingClassCode.house)
    return {
      pickup: false,
      kind: "house",
      icon: "🏠",
      name: pick(FIRST_NAMES, tile, 10),
      where: "house",
    };

  return null;
}

/**
 * The road the car pulls up on for a building: of the roads alongside it
 * (corners left out) that the car can get to, the one nearest its middle.
 *
 * @param reachable {Set<number>}
 * @returns {number} -1 for none
 */
function frontRoad(footprint, reachable) {
  var inside = new Set(footprint),
    sides = [],
    x = 0,
    y = 0,
    i;

  for (i = 0; i < footprint.length; i++) {
    x += Terrain.extractX(footprint[i]);
    y += Terrain.extractY(footprint[i]);

    [1, -1, Terrain.dy, -Terrain.dy].forEach(function (step) {
      var t = footprint[i] + step;

      if (!inside.has(t) && reachable.has(t)) sides.push(t);
    });
  }

  return Roads.nearest(sides, x / footprint.length, y / footprint.length);
}

/**
 * Every place in the city the car can get to from where the roads it can
 * reach are.
 *
 * @param city {City}
 * @param reachable {Set<number>} the road tiles the car can get to
 * @returns {{pickups: Object[], dropoffs: Object[]}} each {tile, road,
 *          footprint, kind, icon, name, ...}: the building's tile, the road
 *          the car stops on, every tile it stands on and what describe says
 */
function find(city, reachable) {
  var buildings = city.buildings.getBuildings(),
    pickups = [],
    dropoffs = [],
    building,
    place,
    footprint,
    road,
    i;

  for (i = 0; i < buildings.length; i++) {
    building = buildings[i];

    //nobody cooks, nor lives, on a building site
    if (building.getState() !== BuildingState.ready) continue;

    place = describe(building);

    if (place === null) continue;

    footprint = Surface.footprint(building);
    road = frontRoad(footprint, reachable);

    if (road === -1) continue;

    place.tile = building.tile;
    place.road = road;
    place.footprint = footprint;

    (place.pickup ? pickups : dropoffs).push(place);
  }

  return { pickups: pickups, dropoffs: dropoffs };
}

/**
 * The dishes a place has on its menu.
 *
 * @param menu {string} a cuisine, "groceries" or "bakery"
 */
function dishes(menu) {
  if (menu === "groceries") return GROCERIES.dishes;
  if (menu === "bakery") return BAKERY.dishes;

  return CUISINES[menu].dishes;
}

export default { find: find, describe: describe, dishes: dishes };
