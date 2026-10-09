/**
 * The delivery game, in the world: the courier's car on the roads, the camera
 * following it, the restaurant and the customer marked out, and the board of
 * orders kept up while the car stands free.
 *
 * The car drives among the traffic, the way everything else does
 * (client/traffic): when the order says go - to the restaurant, then the
 * customer - it pulls out from the kerb as soon as the lane behind it is
 * clear, drives there as fast as the roads let it, and pulls in to the kerb
 * again there, out of the way of the traffic, while the food is cooked and
 * loaded or handed over. Every so often its engine gives out on the way: it
 * stands where it is, smoking, the traffic going round it, until it is going
 * again by itself a minute or so later - or the player calls somebody out to
 * it (Deliveryman#fix) and it is going in a few seconds.
 */
import engine from "engine";
import Events from "events";
import Config from "../config";
import View from "../view";
import RenderLayer from "../renderlayer";
import Carman from "../carman";
import Traffic from "../traffic";
import Terrain from "core/terrain";
import SmokeSource from "../components/smokesource";
import SmokeScript from "../components/smokeScript";
import Marker from "./marker";
import Courier from "./courier";
import Roads from "./roads";
import Places from "./places";
import Orders from "./orders";

var Phase = Courier.Phase;

//the courier's car: a blue hatchback, as long and wide as one is
//(shared/gen/vehicles) - in tiles
var BODY = "hatchback",
  COLOR = "blue",
  LENGTH = 11 / 32,
  WIDTH = 6 / 32;

//how often the order, the markers and the board are looked at again, ms
var CHECK_EVERY = 250;

//how far the car drives between breakdowns, on average, in tiles - give or
//take a lot: it is down to luck
var BREAK_EVERY = 160,
  //how long it stands broken down if nobody is called out to it, ms
  BREAK_FOR = [45000, 75000],
  //and how long fixing it takes once somebody is
  FIX_TAKES = 4000,
  //how often a puff of black smoke comes out of its engine meanwhile, ms
  SMOKE_EVERY = 450;

//how high over the ground the pin over a place floats, and the mark over the
//car
var PIN_HEIGHT = Config.tileSize,
  MARK_HEIGHT = Config.tileSize * 0.5;

var PICKUP_COLOR = "rgb(255,176,64)",
  DROPOFF_COLOR = "rgb(110,230,140)",
  CAR_MARK_COLOR = "rgb(255,220,60)",
  BROKEN_COLOR = "rgb(255,96,72)";

var COS30 = Math.cos(Math.PI / 6);

var position = new Float32Array(3);

var events = {
  //anything the panel shows has changed: the phase of the order, the
  //board, the money
  change: 0,
};

function CourierCarScript(man) {
  engine.Component.call(this);
  this.man = man;
}

CourierCarScript.prototype = Object.create(engine.Component.prototype);

CourierCarScript.prototype.tick = function (time) {
  this.man.frame(Date.now(), time.dt);
};

function CourierCar(man) {
  engine.GameObject.init(this, "courier");

  //among the buildings, sorted by where it is, the way the traffic is
  //(client/carman Car)
  var renderer = new Carman.VehicleRenderer();
  renderer.layer = RenderLayer.buildingsLayer;
  renderer.lamps = 0.5;
  this.addComponent(renderer);

  this.addComponent(new CourierCarScript(man));

  //its headlights, the way a car of the traffic has them (client/lighting)
  this.car = { heading: null, type: null, lamp: 0 };
}

CourierCar.prototype = Object.create(engine.GameObject.prototype);

function Deliveryman(root) {
  this.root = root;
  this.courier = null;
  this.roads = null;
  this.city = null;
  //the places the car can get to, as last found (Places.find)
  this.places = null;
  this.car = null;
  this.mark = null;
  this.looks = null;
  this.heading = null;
  //how it drives, among the traffic (client/traffic)
  this.driver = null;
  //the road tile it is driving to, or -1 while it stands
  this.dest = -1;
  //where the car was last drawn, in tiles
  this.x = 0;
  this.y = 0;
  this._phase = null;
  this._broken = false;
  this._sinceCheck = CHECK_EVERY;
  this._sinceSmoke = 0;
  this._lastFrame = 0;
  //the pins over the restaurant and the customer of the order on, while
  //they are up
  this.pickupPin = null;
  this.dropoffPin = null;
  //page pixels the car is kept above the middle of the screen - half of
  //what the panel over the bottom of it takes (ui/modules/delivery)
  this.raise = 0;
}

Deliveryman.events = Deliveryman.prototype.events = events;
Deliveryman.Phase = Phase;
Deliveryman.FIX_TAKES = FIX_TAKES;

/**
 * Whether there is anything to deliver in: a city, with roads the car can
 * stand on.
 */
Deliveryman.prototype.available = function () {
  return this.courier !== null && this.courier.carTile() !== -1;
};

Deliveryman.prototype.init = function () {
  var root = this.root,
    self = this;

  this.city = root.core.cities.getCities()[0] || null;
  this.courier = new Courier(root.core.persistence.cityId() || "nowhere");
  this.roads = new Roads(root.core.buildings);

  this.courier.onChange(function () {
    self.changed();
  });

  if (this.city === null) return;

  placeCar(this);

  if (this.courier.carTile() === -1) return;

  this.looks = root.carman.looksOf(BODY, COLOR);
  this.car = new CourierCar(this);
  root.game.logic.world.addGameObject(this.car);
  root.carman.extras.push(this.car);
  //found at a glance among the traffic, at night as well
  this.mark = new Marker("car", CAR_MARK_COLOR);
  root.game.scene.addGameObject(this.mark);

  var traffic = root.carman.traffic;

  this.driver = traffic.add(
    new Traffic.Driver(traffic, LENGTH, WIDTH, {
      nearEnd: function () {},
      end: function () {
        self.arrive();
      },
    }),
  );
  this.driver.v0 = Courier.SPEED;

  //where it was left, pulled in at the kerb - and if it was on its way
  //somewhere, it sets off again from there
  standAt(this, this.courier.carTile());

  this.frame(Date.now(), 0);
};

/**
 * Puts the car on a road if it is not on one: where it was left, if that is
 * still a road; else the road of the city's network nearest the middle of
 * town, so it starts out where everything can be got to.
 */
function placeCar(self) {
  var courier = self.courier,
    tile = courier.carTile();

  if (tile !== -1 && self.roads.isRoad(tile)) return;

  var city = self.city,
    roads = city.roads,
    network = [],
    buildings = city.buildings.getBuildings(),
    c = city.center(),
    i;

  for (i = 0; i < buildings.length; i++)
    if (roads.inNetwork(buildings[i].tile)) network.push(buildings[i].tile);

  courier.park(Roads.nearest(network, c.x, c.y), null);
}

/**
 * Which way the car can face standing on tile: the way it faced there, if
 * that is along the road - else along the road, whichever way it goes on.
 */
function facingOn(self, tile) {
  var facing = self.courier.facing(),
    next = self.roads.neighbours(tile, []),
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    i;

  //the road runs on that way, or back the other
  for (i = 0; facing && i < next.length; i++) {
    var dx = Terrain.extractX(next[i]) - x,
      dy = Terrain.extractY(next[i]) - y;

    if (
      Math.abs(dx) === Math.abs(facing[0]) &&
      Math.abs(dy) === Math.abs(facing[1])
    )
      return facing;
  }

  if (next.length === 0) return facing || [1, 0];

  return [Terrain.extractX(next[0]) - x, Terrain.extractY(next[0]) - y];
}

//pulls the car in to the kerb on tile, standing there
function standAt(self, tile) {
  var d = facingOn(self, tile);

  self.dest = -1;
  self.driver.parkAt(tile, d);
  self.root.carman.traffic.enter(self.driver);
  self.courier.park(tile, d);
  self.x = self.driver.x;
  self.y = self.driver.y;
}

/**
 * Finds what the car can get to from where it is, over again - the roads may
 * have changed since.
 */
Deliveryman.prototype.survey = function () {
  var reachable = this.roads.reachable(this.courier.carTile());

  this.places = Places.find(this.city, reachable);

  return this.places;
};

/**
 * How long a board stays up before it is replaced, ms.
 */
Deliveryman.prototype.boardTTL = function () {
  return Orders.BOARD_TTL;
};

/**
 * Puts a new board up, from where the car is now.
 */
Deliveryman.prototype.refreshBoard = function () {
  if (!this.available() || this.courier.order() !== null) return;

  this.courier.post(
    Orders.board(this.roads, this.survey(), this.courier.carTile()),
    Date.now(),
  );
};

/**
 * Takes an order off the board: the car sets off for the restaurant.
 */
Deliveryman.prototype.accept = function (offerId) {
  var order = this.courier.accept(offerId, Date.now());

  if (order !== null) this.frame(Date.now(), 0);

  return order;
};

/**
 * Takes the money for the order handed over, shown going up over the car.
 *
 * @returns {number} what it paid
 */
Deliveryman.prototype.collect = function () {
  var paid = this.courier.collect(Date.now());

  if (paid > 0) {
    this.root.buildman.showIncome(this.courier.carTile(), paid);
    //and the next lot of orders, from where it is now
    this.refreshBoard();
  }

  return paid;
};

/**
 * Calls somebody out to the car broken down: it is going again in a few
 * seconds.
 */
Deliveryman.prototype.fix = function () {
  this.courier.repair(Date.now(), FIX_TAKES);
};

/**
 * Where the car is on the page, in page pixels - for something to be put up
 * over it - or null when it is not on the screen.
 */
Deliveryman.prototype.carOnPage = function () {
  var r = this.mark !== null ? this.mark.marker : null;

  if (r === null || r.canvas === null || r.screenX === null) return null;

  //the marks are drawn on a canvas of their own, laid over the one on the
  //page pixel for pixel
  var viewport = this.root.camera.cameraScript.gameObject.camera.viewport,
    shown = viewport !== null ? viewport.canvas : null;

  if (!shown || !r.canvas.width || !r.canvas.height) return null;

  var rect = shown.getBoundingClientRect(),
    kx = rect.width / r.canvas.width,
    ky = rect.height / r.canvas.height;

  return {
    x: rect.left + r.screenX * kx,
    y: rect.top + r.screenY * ky,
  };
};

/**
 * Where the order is at now (Courier#status).
 */
Deliveryman.prototype.status = function () {
  return this.courier.status(Date.now());
};

Deliveryman.prototype.changed = function () {
  Events.fire(this, events.change, this);
};

//where the order has the car go: the restaurant's road, then the
//customer's - or -1 for nowhere, standing where it is
function destination(status) {
  var order = status.order;

  if (order === null) return -1;
  if (status.phase === Phase.toRestaurant) return order.pickup.road;
  if (status.phase === Phase.toCustomer) return order.dropoff.road;

  return -1;
}

/**
 * Sets off for tile from the kerb it stands at, once the lane is clear -
 * straight on along the road first if it goes on, turning round if not.
 * Already there, it has arrived.
 */
function setOff(self, to) {
  var driver = self.driver,
    here = driver.tile(),
    d = [Math.round(driver.hx), Math.round(driver.hy)],
    ahead = here + d[0] + d[1] * Terrain.dy,
    route = [],
    on;

  if (here === to) {
    self.courier.arrived(Date.now());
    return;
  }

  if (!driver.canPullOut()) return;

  if (
    self.roads.neighbours(here, []).indexOf(ahead) !== -1 &&
    (on = self.roads.route(ahead, to)).length > 0
  )
    route = [here].concat(on);
  else route = self.roads.route(here, to);

  //no way there any more: it is there as near as it can get
  if (route.length < 2) {
    self.courier.arrived(Date.now());
    return;
  }

  self.dest = to;
  driver.pullOut(route, true);
}

/**
 * It got where it was going: pulled in at the kerb there.
 */
Deliveryman.prototype.arrive = function () {
  var driver = this.driver;

  this.dest = -1;
  this.courier.park(driver.tile(), [
    Math.round(driver.hx),
    Math.round(driver.hy),
  ]);
  this.courier.arrived(Date.now());
};

//how many tiles of its way it still has to drive
function tilesLeft(driver) {
  var wps = driver.wps,
    n = 0,
    last = driver.tile(),
    i;

  for (i = driver.target; i < wps.length; i++)
    if (wps[i].tile !== last) {
      n++;
      last = wps[i].tile;
    }

  return n;
}

/**
 * Every frame: the order moved on by the clock; the car set off, driven, or
 * broken down; and drawn where it is, the camera on it. Every so often it
 * also looks at whether the order has moved on, and keeps the markers and
 * the board up to date.
 *
 * @param dt {number} ms since the last frame
 */
Deliveryman.prototype.frame = function (now, dt) {
  var courier = this.courier,
    driver = this.driver;

  if (driver === null) return;

  courier.tick(now);

  var status = courier.status(now),
    broken = status.broken !== null,
    to = destination(status);

  driver.stalled = driver.broken = broken;

  if (broken) smoke(this, dt);
  else if (to !== -1 && this.dest !== to && driver.parked) setOff(this, to);

  var x = driver.x,
    y = driver.y;

  driver.update(dt);

  //on its way: how far it has to go, and every so often its engine gives
  //out
  if (this.dest !== -1 && !driver.parked) {
    var moved = Math.abs(driver.x - x) + Math.abs(driver.y - y);

    courier.progress(driver.tile(), tilesLeft(driver), [
      Math.round(driver.hx),
      Math.round(driver.hy),
    ]);

    if (!broken && moved > 0 && Math.random() < moved / BREAK_EVERY)
      courier.breakDown(
        now,
        now + BREAK_FOR[0] + Math.random() * (BREAK_FOR[1] - BREAK_FOR[0]),
      );
  }

  this.x = driver.x;
  this.y = driver.y;

  draw(this, View.heading(View.headingOf(driver.hx, driver.hy) || "x+"));
  showProgress(this, status);

  this._sinceCheck += now - (this._lastFrame || now);
  this._lastFrame = now;

  if (this._sinceCheck >= CHECK_EVERY) {
    this._sinceCheck = 0;
    check(this, status, now);
  }
};

/**
 * Black smoke out of the engine, as out of a car of the traffic broken down.
 */
function smoke(self, dt) {
  var frame = self.looks !== null ? self.looks[self.heading] : null;

  self._sinceSmoke += dt;

  if (frame === null || frame === undefined || self._sinceSmoke < SMOKE_EVERY)
    return;

  self._sinceSmoke = 0;
  self.car.transform.getPosition(position);

  var at = frame.engine,
    off = View.unvector(at[0], at[2]);

  SmokeSource.puff(
    self.car.world,
    position[0] + off[0] * Config.tileSize,
    position[1] + at[1] * Config.tileZStep,
    position[2] + off[1] * Config.tileSize,
    SmokeScript.soot,
  );
}

function draw(self, heading) {
  var car = self.car;

  if (car === null) return;

  heading = heading || self.heading || View.heading("x+");

  if (
    heading !== self.heading &&
    self.looks !== null &&
    self.looks[heading] !== undefined
  ) {
    var frame = self.looks[heading],
      renderer = car.spriteRenderer;

    renderer.setSprite(frame.sprite);
    renderer.pivotX = frame.pivotX;
    renderer.pivotY = frame.pivotY;
    renderer.setLit(null);
    self.heading = heading;
    car.car.heading = heading;
  }

  var x = self.x * Config.tileSize,
    z = self.y * Config.tileSize,
    y = Carman.groundHeight(self.root, self.x, self.y) * Config.tileZStep;

  car.transform.setPosition(x, y, z);
  self.mark.transform.setPosition(x, y + MARK_HEIGHT, z);

  //the camera on the car, always - on the car itself, up on a hill as
  //much as down by the sea: a unit up is so much up the screen
  var camera = self.root.camera.cameraScript;

  camera.lookAt(x, z, self.raise / camera.zoom() + y * COS30);
}

/**
 * The order moved on to another phase: the pins go up for where the car is
 * going now. Otherwise, a board that has been up too long is replaced.
 */
function check(self, status, now) {
  var courier = self.courier;

  if (status.phase !== self._phase) {
    self._phase = status.phase;
    pin(self, status);
    self.changed();
  }

  if ((status.broken !== null) !== self._broken) {
    self._broken = status.broken !== null;
    self.changed();
  }

  //the road under it gone: put back on the nearest there is, and on its
  //way from there
  if (!self.roads.isRoad(self.driver.tile())) {
    courier.park(-1, null);
    placeCar(self);
    if (courier.carTile() !== -1) standAt(self, courier.carTile());
  }

  if (
    status.order === null &&
    (courier.offers().length === 0 ||
      now - courier.boardAt() > Orders.BOARD_TTL)
  )
    self.refreshBoard();
}

/**
 * A pin floating over the middle of a place.
 */
function pinOver(self, place, color) {
  var terrain = self.root.terrain,
    tiles = place.footprint,
    x = 0,
    y = 0,
    z = 0,
    go = new Marker("pin", color, place.icon);

  tiles.forEach(function (tile) {
    x += terrain.tileXPos(tile);
    y = Math.max(y, terrain.tileYPos(tile));
    z += terrain.tileZPos(tile);
  });

  go.transform.setPosition(x / tiles.length, y + PIN_HEIGHT, z / tiles.length);
  self.root.game.scene.addGameObject(go);

  return go;
}

function unpin(self) {
  if (self.pickupPin !== null) self.pickupPin.destroy();
  if (self.dropoffPin !== null) self.dropoffPin.destroy();

  self.pickupPin = self.dropoffPin = null;
}

/**
 * Pins where the car is going: the restaurant until the food is in the car,
 * the customer all along.
 */
function pin(self, status) {
  var order = status.order,
    phase = status.phase;

  unpin(self);

  if (order === null || phase === Phase.delivered) return;

  if (phase === Phase.toRestaurant || phase === Phase.atRestaurant)
    self.pickupPin = pinOver(self, order.pickup, PICKUP_COLOR);

  self.dropoffPin = pinOver(self, order.dropoff, DROPOFF_COLOR);
}

/**
 * The small bars of how far along things are: over the restaurant, the food
 * being cooked while the car is on its way; over the car, whatever it is
 * standing there for - the food, loading it, handing it over, or being got
 * going again after a breakdown. And the pins
 * kept clear of the panel at the bottom of the screen.
 */
function showProgress(self, status) {
  var phase = status.phase,
    stopped = phase === Phase.atRestaurant || phase === Phase.atDoor,
    bottom = (self.raise * 2) / self.root.camera.cameraScript.zoom();

  //broken down, red over the car, and how long until it goes again
  if (self.mark !== null) {
    self.mark.marker.color =
      status.broken !== null ? BROKEN_COLOR : CAR_MARK_COLOR;
    self.mark.marker.progress =
      status.broken !== null
        ? status.broken.done
        : stopped
          ? status.step
          : null;
  }

  if (self.pickupPin !== null) {
    self.pickupPin.marker.progress =
      phase === Phase.toRestaurant && status.cooked < 1 ? status.cooked : null;
    self.pickupPin.marker.bottom = bottom;
  }

  if (self.dropoffPin !== null) self.dropoffPin.marker.bottom = bottom;
}

export default Deliveryman;
