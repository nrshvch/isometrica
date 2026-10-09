/**
 * The orders on the board: what to pick up where, where to take it, how long
 * the whole run will take and what it pays.
 *
 * The courier's time is what they sell. An order pays for all of it - the
 * drive to the restaurant, the wait for the food, the drive over and the walk
 * up to the door - at a rate that goes up with the kind of order: a quick
 * bite is over in a minute or two, an office's lunch takes a quarter of an
 * hour to cook and pays the most for every minute of it, but only to a
 * courier who comes back for it.
 */
import Courier from "./courier";
import Places from "./places";

//how many orders are up on the board at a time
var BOARD_SIZE = 4;

//how long a board stays up before it is replaced, ms
var BOARD_TTL = 3 * 60 * 1000;

//the shortest drive with the food worth paying a courier for, in road tiles
var MIN_DELIVERY = 6;

//what kinds of order there are - from where, to where, how long the food
//takes, how much of it, and what a minute of it pays. prep is in seconds,
//items how many different dishes, qty how many of each
var KINDS = {
  snack: {
    label: "Quick bite",
    from: ["restaurant", "bakery"],
    to: ["house", "flat", "office"],
    prep: [20, 70],
    items: [1, 2],
    qty: [1, 2],
    base: 1.5,
    rate: 4.5,
  },
  dinner: {
    label: "Dinner",
    from: ["restaurant"],
    to: ["house", "flat"],
    prep: [60, 180],
    items: [2, 4],
    qty: [1, 3],
    base: 2.5,
    rate: 5,
  },
  groceries: {
    label: "Groceries",
    from: ["grocery"],
    to: ["house", "flat"],
    prep: [120, 300],
    items: [4, 7],
    qty: [1, 3],
    base: 3.5,
    rate: 5.5,
  },
  catering: {
    label: "Office lunch",
    from: ["restaurant", "bakery"],
    to: ["office"],
    prep: [420, 900],
    items: [2, 4],
    qty: [4, 12],
    base: 8,
    rate: 6.5,
  },
};

var KIND_KEYS = Object.keys(KINDS);

function between(range, random) {
  return range[0] + random() * (range[1] - range[0]);
}

function intBetween(range, random) {
  return Math.floor(range[0] + random() * (range[1] - range[0] + 1));
}

function anyOf(list, random) {
  return list[Math.floor(random() * list.length)];
}

function ofKinds(places, kinds) {
  return places.filter(function (place) {
    return kinds.indexOf(place.kind) !== -1;
  });
}

//what a place is to an order: all of it but the footprint and the road
function placeOf(place) {
  return {
    tile: place.tile,
    road: place.road,
    footprint: place.footprint,
    kind: place.kind,
    icon: place.icon,
    name: place.name,
    where: place.where || null,
  };
}

function itemsFor(kind, menu, random) {
  var dishes = Places.dishes(menu).slice(),
    count = Math.min(dishes.length, intBetween(kind.items, random)),
    out = [],
    i;

  for (i = 0; i < count; i++) {
    out.push({
      name: dishes.splice(Math.floor(random() * dishes.length), 1)[0],
      qty: intBetween(kind.qty, random),
    });
  }

  return out;
}

/**
 * One order of that kind, from the car on tile carAt, or null when there is
 * nothing of the kind to be had: no place to pick it up from, nobody to take
 * it to far enough off, no way there.
 */
function offer(kindKey, roads, places, carAt, random) {
  var kind = KINDS[kindKey],
    pickups = ofKinds(places.pickups, kind.from),
    dropoffs = ofKinds(places.dropoffs, kind.to),
    tries,
    pickup,
    dropoff,
    legs,
    order,
    times;

  if (pickups.length === 0 || dropoffs.length === 0) return null;

  for (tries = 0; tries < 6; tries++) {
    pickup = anyOf(pickups, random);
    dropoff = anyOf(dropoffs, random);

    if (dropoff.tile === pickup.tile) continue;

    legs = [
      roads.route(carAt, pickup.road),
      roads.route(pickup.road, dropoff.road),
    ];

    if (legs[0].length === 0 || legs[1].length - 1 < MIN_DELIVERY) continue;

    order = {
      id: Math.floor(random() * 0xffffffff).toString(36),
      kind: kindKey,
      label: kind.label,
      pickup: placeOf(pickup),
      dropoff: placeOf(dropoff),
      items: itemsFor(kind, pickup.menu, random),
      prep: Math.round(between(kind.prep, random) * 1000),
      legs: legs,
    };

    //how long it all comes to, start to finish, if it were taken now
    times = Courier.schedule(order, 0);
    order.estimate = times.delivered;
    //a minute of the courier's time at the kind's rate, give or take, and
    //sometimes a tip on top
    order.pay =
      Math.round(
        (kind.base + (kind.rate * times.delivered) / 60000) *
          (0.9 + random() * 0.2) *
          (random() < 0.3 ? 1.1 + random() * 0.15 : 1) *
          100,
      ) / 100;

    return order;
  }

  return null;
}

/**
 * A board of orders from the car on tile carAt: one of each kind there is to
 * be had, and the rest of whatever kind.
 *
 * @param roads {Roads}
 * @param places {{pickups: Object[], dropoffs: Object[]}} see Places.find
 * @param [random] {function(): number}
 * @returns {Object[]} the quickest first
 */
function board(roads, places, carAt, random) {
  var out = [],
    kinds = KIND_KEYS.slice(),
    tries = 0,
    order;

  random = random || Math.random;

  while (out.length < BOARD_SIZE && tries++ < BOARD_SIZE * 3) {
    order = offer(
      kinds.length > 0 ? kinds.shift() : anyOf(KIND_KEYS, random),
      roads,
      places,
      carAt,
      random,
    );

    if (order !== null) out.push(order);
  }

  return out.sort(function (a, b) {
    return a.estimate - b.estimate;
  });
}

export default {
  board: board,
  KINDS: KINDS,
  BOARD_SIZE: BOARD_SIZE,
  BOARD_TTL: BOARD_TTL,
};
