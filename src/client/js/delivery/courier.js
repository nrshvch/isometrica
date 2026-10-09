/**
 * The courier: the player, their car, their money and the order they are on.
 *
 * Everything here goes by the clock on the wall, not the game's: an order is
 * a timeline laid down the moment it is taken - drive to the restaurant, wait
 * there for the food, drive it over, walk it up to the door - and where the
 * car is and what it is doing is worked out from that and the time it is now
 * (Courier#status). So nothing has to run for an order to go on: with the
 * game closed, or the tab out of sight, the car is where it would have got to
 * by the time the player comes back, and an order that was due is delivered,
 * its money waiting to be collected.
 *
 * Kept in a storage row of its own per city, next to the city's save
 * (core/persistence) - the city is the scene, this is the game played in it.
 *
 * Nothing in here knows about roads or buildings: an offer comes with its
 * route already found, as road tiles (client/delivery/orders).
 */

//how many road tiles the car drives in a second
var SPEED = 1.5;

//at the least, how long it takes to carry the food out of a restaurant to the
//car, ms - longer when it is not ready yet
var AT_RESTAURANT = 6000;

//and to walk it from the car up to the door
var AT_DOOR = 10000;

var KEY_PREFIX = "isometrica.v3.courier.";
var VERSION = 1;

//what the car is doing, by the timeline of the order it is on
var Phase = {
  //no order: the board is up, or nothing to deliver
  idle: "idle",
  toRestaurant: "toRestaurant",
  //waiting for the food, or carrying it out
  atRestaurant: "atRestaurant",
  toCustomer: "toCustomer",
  //walking it up to the door
  atDoor: "atDoor",
  //handed over - the money is waiting to be collected
  delivered: "delivered",
};

/**
 * How long driving a route takes, ms.
 *
 * @param tiles {number[]} road tiles, both ends included
 */
function driveTime(tiles) {
  return (Math.max(0, tiles.length - 1) / SPEED) * 1000;
}

/**
 * The timeline of an order taken at `at`: when the car gets to the
 * restaurant, when the food is ready, when it sets off with it, gets to the
 * customer and has handed it over. All ms, on the wall clock.
 *
 * @param order {{legs: number[][], prep: number}} prep in ms, from `at`
 * @param at {number}
 */
function schedule(order, at) {
  var arriveRestaurant = at + driveTime(order.legs[0]),
    ready = at + order.prep,
    leave = Math.max(arriveRestaurant + AT_RESTAURANT, ready),
    arriveCustomer = leave + driveTime(order.legs[1]);

  return {
    taken: at,
    arriveRestaurant: arriveRestaurant,
    ready: ready,
    leave: leave,
    arriveCustomer: arriveCustomer,
    delivered: arriveCustomer + AT_DOOR,
  };
}

function fraction(now, from, to) {
  return to <= from ? 1 : Math.min(1, Math.max(0, (now - from) / (to - from)));
}

/**
 * localStorage throws when it likes - switched off in a private window, full
 * - and a courier who cannot be saved can still drive.
 */
function defaultStorage() {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch (e) {
    return null;
  }
}

function blank() {
  return {
    version: VERSION,
    money: 0,
    //everything ever earned, and how many orders it took
    earned: 0,
    deliveries: 0,
    //the road tile the car stands on when it is not on an order, or -1 for
    //nowhere yet - put on the road by whoever has the roads
    car: -1,
    order: null,
    //the orders to pick from, and when they went up
    board: { at: 0, offers: [] },
  };
}

/**
 * @param cityId {string} whose streets this courier drives
 * @param [storage] {Storage} defaults to localStorage
 * @constructor
 */
function Courier(cityId, storage) {
  this.key = KEY_PREFIX + cityId;
  this.storage = storage === undefined ? defaultStorage() : storage;
  this.state = blank();
  this._listeners = [];
  this.load();
}

Courier.SPEED = SPEED;
Courier.AT_RESTAURANT = AT_RESTAURANT;
Courier.AT_DOOR = AT_DOOR;
Courier.Phase = Phase;
Courier.schedule = schedule;
Courier.driveTime = driveTime;

Courier.prototype.load = function () {
  var saved = null;

  if (this.storage !== null) {
    try {
      saved = JSON.parse(this.storage.getItem(this.key));
    } catch (e) {
      console.warn("Could not read the courier from storage", e);
    }
  }

  this.state = blank();

  if (saved !== null && typeof saved === "object" && saved.version === VERSION)
    for (var key in this.state)
      if (saved[key] !== undefined) this.state[key] = saved[key];
};

Courier.prototype.save = function () {
  if (this.storage === null) return false;

  try {
    this.storage.setItem(this.key, JSON.stringify(this.state));
    return true;
  } catch (e) {
    console.warn("Could not write the courier to storage", e);
    return false;
  }
};

/**
 * @param listener {function(Courier)} called whenever anything about the
 *        courier changes - not as the car drives, which goes by the clock
 */
Courier.prototype.onChange = function (listener) {
  this._listeners.push(listener);
};

function changed(self) {
  self.save();

  for (var i = 0; i < self._listeners.length; i++) self._listeners[i](self);
}

Courier.prototype.money = function () {
  return this.state.money;
};

Courier.prototype.order = function () {
  return this.state.order;
};

Courier.prototype.offers = function () {
  return this.state.board.offers;
};

/**
 * When the board went up, ms - 0 for never.
 */
Courier.prototype.boardAt = function () {
  return this.state.board.at;
};

/**
 * The road tile the car is parked on between orders, or -1.
 */
Courier.prototype.carTile = function () {
  return this.state.car;
};

/**
 * Parks the car somewhere else - for when there was nowhere yet, or the road
 * it stood on is gone.
 */
Courier.prototype.park = function (tile) {
  if (this.state.car === tile) return;

  this.state.car = tile;
  changed(this);
};

/**
 * Puts up new orders to pick from, each found from where the car is now.
 *
 * @param offers {Object[]} see client/delivery/orders
 */
Courier.prototype.post = function (offers, now) {
  this.state.board = { at: now, offers: offers };
  changed(this);
};

/**
 * Takes an order off the board. The car sets off for the restaurant there
 * and then.
 *
 * @returns {Object|null} the order, or null when there is one on already or
 *          no such offer
 */
Courier.prototype.accept = function (offerId, now) {
  var offers = this.state.board.offers,
    offer = null,
    i;

  if (this.state.order !== null) return null;

  for (i = 0; i < offers.length; i++)
    if (offers[i].id === offerId) offer = offers[i];

  if (offer === null) return null;

  offer.times = schedule(offer, now);
  this.state.order = offer;
  //what is left on the board was found from where the car stood - it will
  //be somewhere else by the time it is free again
  this.state.board = { at: 0, offers: [] };
  changed(this);

  return offer;
};

/**
 * Where the order is at, at time now: what the car is doing, how far along
 * the route it is on, and how far along the whole order.
 *
 * @returns {{phase: string, order: Object|null, leg: number,
 *          legDone: number, done: number, left: number, readyIn: number}}
 *          leg - 0 to the restaurant, 1 to the customer - and legDone, how
 *          far along it the car is, 0..1; done, how far along the order,
 *          0..1; left, ms until it is handed over; readyIn, ms until the
 *          food is
 */
Courier.prototype.status = function (now) {
  var order = this.state.order,
    out = {
      phase: Phase.idle,
      order: order,
      leg: 0,
      legDone: 0,
      done: 0,
      left: 0,
      readyIn: 0,
    };

  if (order === null) return out;

  var t = order.times;

  out.done = fraction(now, t.taken, t.delivered);
  out.left = Math.max(0, t.delivered - now);
  out.readyIn = Math.max(0, t.ready - now);

  if (now < t.arriveRestaurant) {
    out.phase = Phase.toRestaurant;
    out.legDone = fraction(now, t.taken, t.arriveRestaurant);
  } else if (now < t.leave) {
    out.phase = Phase.atRestaurant;
    out.legDone = 1;
  } else if (now < t.arriveCustomer) {
    out.phase = Phase.toCustomer;
    out.leg = 1;
    out.legDone = fraction(now, t.leave, t.arriveCustomer);
  } else {
    out.phase = now < t.delivered ? Phase.atDoor : Phase.delivered;
    out.leg = 1;
    out.legDone = 1;
  }

  return out;
};

/**
 * Takes the money for an order that has been handed over. The car is parked
 * where it delivered it, and the board is empty until orders are put up from
 * there.
 *
 * @returns {number} what was paid, 0 when there was nothing to collect
 */
Courier.prototype.collect = function (now) {
  var order = this.state.order;

  if (order === null || this.status(now).phase !== Phase.delivered) return 0;

  var legs = order.legs,
    last = legs[1].length > 0 ? legs[1] : legs[0];

  this.state.money = Math.round((this.state.money + order.pay) * 100) / 100;
  this.state.earned = Math.round((this.state.earned + order.pay) * 100) / 100;
  this.state.deliveries++;
  this.state.car = last[last.length - 1];
  this.state.order = null;
  this.state.board = { at: 0, offers: [] };
  changed(this);

  return order.pay;
};

export default Courier;
