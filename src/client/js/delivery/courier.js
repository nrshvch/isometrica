/**
 * The courier: the player, their car, their money and the order they are on.
 *
 * An order goes: drive to the restaurant, wait there for the food, load it,
 * drive it over, hand it over at the door. The driving is done for real, in
 * the city's traffic (client/delivery/deliveryman): the car gets there when
 * it gets there - held up by queues at the junctions, a slow lorry in front,
 * a car broken down in the way, or its own engine giving out - and is told so
 * here (Courier#arrived). The rest goes by the clock on the wall: the food
 * cooks from the moment the order is taken, loading and handing over take as
 * long as they take, and a breakdown is over at a time on it - so those go
 * on while the game is closed, while the car only drives while it is open.
 *
 * What the panel shows ahead of the car - when it will get there, when the
 * whole order will be done - is worked out from how far it still has to go
 * at the speed it would drive on an empty road: a guess, which the traffic
 * makes come out later.
 *
 * Kept in a storage row of its own per city, next to the city's save
 * (core/persistence) - the city is the scene, this is the game played in it.
 *
 * Nothing in here knows about roads or buildings: an offer comes with its
 * route already found, as road tiles (client/delivery/orders).
 */

//how many road tiles the car drives in a second
var SPEED = 1.5;

//how long it takes to load the food into the car once it is ready and the
//car is there, ms - quick, and always the same
var LOAD = 4000;

//and to hand it over at the door
var UNLOAD = 5000;

var KEY_PREFIX = "isometrica.v3.courier.";
//2: the car drives in the traffic; an order's times are filled in as it goes
var VERSION = 2;

//what the car is doing, by the timeline of the order it is on
var Phase = {
  //no order: the board is up, or nothing to deliver
  idle: "idle",
  toRestaurant: "toRestaurant",
  //waiting for the food, or loading it
  atRestaurant: "atRestaurant",
  toCustomer: "toCustomer",
  //handing it over
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
 * How an order taken at `at` would go on empty roads: when the car would get
 * to the restaurant, when the food is ready, when it would set off with it -
 * loaded once both are there - get to the customer and have handed it over.
 * All ms, on the wall clock. What an offer is priced by.
 *
 * @param order {{legs: number[][], prep: number}} prep in ms, from `at`
 * @param at {number}
 */
function schedule(order, at) {
  var arriveRestaurant = at + driveTime(order.legs[0]),
    ready = at + order.prep,
    leave = Math.max(arriveRestaurant, ready) + LOAD,
    arriveCustomer = leave + driveTime(order.legs[1]);

  return {
    taken: at,
    arriveRestaurant: arriveRestaurant,
    ready: ready,
    leave: leave,
    arriveCustomer: arriveCustomer,
    delivered: arriveCustomer + UNLOAD,
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
    //the road tile the car is on - where it stands when it is not on an
    //order - or -1 for nowhere yet: put on the road by whoever has the roads
    car: -1,
    //which way it faces there, [dx, dy] along x or y, or null for any way
    facing: null,
    //broken down: since when, and when it will be going again by itself -
    //on the wall clock - or null
    breakdown: null,
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
Courier.LOAD = LOAD;
Courier.UNLOAD = UNLOAD;
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

  //an older courier keeps the money and the car; an order on the way it
  //went then is let go
  if (
    saved !== null &&
    typeof saved === "object" &&
    saved.version < VERSION &&
    saved.version > 0
  ) {
    saved.order = null;
    saved.board = { at: 0, offers: [] };
    saved.version = VERSION;
  }

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
 * Which way the car faces where it stands, [dx, dy], or null for any way.
 */
Courier.prototype.facing = function () {
  return this.state.facing;
};

/**
 * Parks the car somewhere else - for when there was nowhere yet, or the road
 * it stood on is gone - or has it face another way where it is.
 */
Courier.prototype.park = function (tile, facing) {
  if (
    this.state.car === tile &&
    (facing === undefined || String(this.state.facing) === String(facing))
  )
    return;

  this.state.car = tile;
  if (facing !== undefined) this.state.facing = facing;
  changed(this);
};

/**
 * The car has driven on to tile, with so many tiles of the way it is on
 * still to go - for the panel to go by. Kept in storage once in a while: the
 * car is put back about there when the game is opened again.
 */
Courier.prototype.progress = function (tile, left, facing) {
  var order = this.state.order;

  if (order !== null) order.left = left;

  if (this.state.car !== tile) {
    this.state.car = tile;
    if (facing) this.state.facing = facing;
    this.save();
  }
};

/**
 * The car has got where it was going: to the restaurant, to wait for the
 * food, or to the customer's, to hand it over.
 */
Courier.prototype.arrived = function (now) {
  var order = this.state.order;

  if (order === null) return;

  if (order.phase === Phase.toRestaurant) {
    order.phase = Phase.atRestaurant;
    order.times.arriveRestaurant = now;
  } else if (order.phase === Phase.toCustomer) {
    order.phase = Phase.atDoor;
    order.times.arriveCustomer = now;
  } else return;

  order.left = 0;
  changed(this);
};

/**
 * Moves the order on by the clock: once the food is ready and the car there,
 * it is loaded and the car sets off; once it is handed over, it is
 * delivered. A breakdown over is over.
 *
 * @returns {boolean} whether anything changed
 */
Courier.prototype.tick = function (now) {
  var order = this.state.order,
    t = order !== null ? order.times : null,
    moved = false;

  if (this.state.breakdown !== null && now >= this.state.breakdown.until) {
    this.state.breakdown = null;
    moved = true;
  }

  if (order !== null && order.phase === Phase.atRestaurant) {
    var leave = Math.max(t.arriveRestaurant, t.ready) + LOAD;

    if (now >= leave) {
      t.leave = leave;
      order.phase = Phase.toCustomer;
      order.left = order.legs[1].length - 1;
      moved = true;
    }
  } else if (order !== null && order.phase === Phase.atDoor) {
    if (now >= t.arriveCustomer + UNLOAD) {
      t.delivered = t.arriveCustomer + UNLOAD;
      order.phase = Phase.delivered;
      moved = true;
    }
  }

  if (moved) changed(this);

  return moved;
};

/**
 * The car has broken down: it stands until `until` on the wall clock - or
 * until it is fixed (repair).
 */
Courier.prototype.breakDown = function (now, until) {
  this.state.breakdown = { at: now, until: until, fixing: false };
  changed(this);
};

/**
 * The player has called somebody out to fix it: it goes again a moment from
 * now rather than when it would have.
 */
Courier.prototype.repair = function (now, takes) {
  var b = this.state.breakdown;

  if (b === null || b.fixing) return;

  b.fixing = true;
  b.fixAt = now;
  b.until = Math.min(b.until, now + takes);
  changed(this);
};

/**
 * The breakdown the car is in - {at, until, fixing} - or null.
 */
Courier.prototype.breakdown = function () {
  return this.state.breakdown;
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

  //what is known so far: when it was taken and when the food will be
  //ready; the rest is filled in as the car gets there
  offer.times = {
    taken: now,
    ready: now + offer.prep,
    arriveRestaurant: null,
    leave: null,
    arriveCustomer: null,
    delivered: null,
  };
  offer.phase = Phase.toRestaurant;
  offer.left = Math.max(0, offer.legs[0].length - 1);
  this.state.order = offer;
  //what is left on the board was found from where the car stood - it will
  //be somewhere else by the time it is free again
  this.state.board = { at: 0, offers: [] };
  changed(this);

  return offer;
};

/**
 * Where the order is at, at time now: what the car is doing, how far along
 * the way it is on it is, and how far along the whole order - the times
 * still to come guessed from how far it still has to drive (see above).
 *
 * @returns {{phase: string, order: Object|null, leg: number,
 *          legDone: number, done: number, left: number, readyIn: number,
 *          cooked: number, loading: boolean, step: number, times: Object,
 *          broken: Object|null}}
 *          leg - 0 to the restaurant, 1 to the customer - and legDone, how
 *          far along it the car is, 0..1; done, how far along the order,
 *          0..1; left, ms until it is handed over, as it looks now; readyIn,
 *          ms until the food is, and cooked, how far along it is, 0..1;
 *          loading, whether the food is being put in the car; step, how far
 *          along what the car is doing now is - the drive, the wait, the
 *          loading or the handing over - 0..1; times, the order's times,
 *          those still to come as they look now; broken, the breakdown the
 *          car is in, with how far along it is (done, 0..1), or null
 */
Courier.prototype.status = function (now) {
  var order = this.state.order,
    b = this.state.breakdown,
    out = {
      phase: Phase.idle,
      order: order,
      leg: 0,
      legDone: 0,
      done: 0,
      left: 0,
      readyIn: 0,
      cooked: 0,
      loading: false,
      step: 0,
      times: null,
      broken: null,
    };

  if (b !== null)
    out.broken = {
      at: b.at,
      until: b.until,
      fixing: b.fixing,
      left: Math.max(0, b.until - now),
      done: b.fixing
        ? fraction(now, b.fixAt, b.until)
        : fraction(now, b.at, b.until),
    };

  if (order === null) return out;

  var t = order.times,
    phase = order.phase,
    //standing broken down, the drive is put off by as much
    stood = b !== null ? Math.max(0, b.until - now) : 0,
    drive0 = driveTime(order.legs[0]),
    drive1 = driveTime(order.legs[1]),
    ahead = (order.left / SPEED) * 1000 + stood,
    est = {
      taken: t.taken,
      ready: t.ready,
      arriveRestaurant: t.arriveRestaurant,
      leave: t.leave,
      arriveCustomer: t.arriveCustomer,
      delivered: t.delivered,
    };

  if (est.arriveRestaurant === null) est.arriveRestaurant = now + ahead;
  if (est.leave === null)
    est.leave = Math.max(est.arriveRestaurant, t.ready, now) + LOAD;
  if (est.arriveCustomer === null)
    est.arriveCustomer =
      phase === Phase.toCustomer ? now + ahead : est.leave + drive1;
  if (est.delivered === null)
    est.delivered = Math.max(est.arriveCustomer, now) + UNLOAD;

  out.phase = phase;
  out.times = est;
  out.done = fraction(now, t.taken, est.delivered);
  out.left = Math.max(0, est.delivered - now);
  out.readyIn = Math.max(0, t.ready - now);
  out.cooked = fraction(now, t.taken, t.ready);

  if (phase === Phase.toRestaurant) {
    out.legDone = out.step =
      drive0 <= 0 ? 1 : 1 - Math.min(1, ((order.left / SPEED) * 1000) / drive0);
  } else if (phase === Phase.atRestaurant) {
    var loadFrom = Math.max(t.arriveRestaurant, t.ready);

    out.legDone = 1;
    out.loading = now >= loadFrom;
    out.step = out.loading
      ? fraction(now, loadFrom, loadFrom + LOAD)
      : out.cooked;
  } else if (phase === Phase.toCustomer) {
    out.leg = 1;
    out.legDone = out.step =
      drive1 <= 0 ? 1 : 1 - Math.min(1, ((order.left / SPEED) * 1000) / drive1);
  } else {
    out.leg = 1;
    out.legDone = 1;
    out.step = fraction(now, t.arriveCustomer, t.arriveCustomer + UNLOAD);
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

  if (order === null || order.phase !== Phase.delivered) return 0;

  this.state.money = Math.round((this.state.money + order.pay) * 100) / 100;
  this.state.earned = Math.round((this.state.earned + order.pay) * 100) / 100;
  this.state.deliveries++;
  this.state.order = null;
  this.state.board = { at: 0, offers: [] };
  changed(this);

  return order.pay;
};

export default Courier;
