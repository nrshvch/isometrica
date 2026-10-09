/**
 * The delivery game, in the world: the courier's car on the roads, the camera
 * following it, the restaurant and the customer marked out, and the board of
 * orders kept up while the car stands free.
 *
 * Where the car is comes from the courier (client/delivery/courier) and the
 * time on the wall, frame by frame - nothing here moves it along. So when the
 * game comes back after a while away, the car is just where it would have got
 * to.
 */
import engine from "engine";
import Events from "events";
import Config from "../config";
import View from "../view";
import RenderLayer from "../renderlayer";
import Carman from "../carman";
import Terrain from "core/terrain";
import Marker from "./marker";
import Courier from "./courier";
import Roads from "./roads";
import Places from "./places";
import Orders from "./orders";

var Phase = Courier.Phase;

//the courier's car: a blue hatchback
var BODY = "hatchback",
  COLOR = "blue";

//how often the order, the markers and the board are looked at again, ms
var CHECK_EVERY = 250;

//how high over the ground the pin over a place floats, and the mark over the
//car
var PIN_HEIGHT = Config.tileSize,
  MARK_HEIGHT = Config.tileSize * 0.5;

var PICKUP_COLOR = "rgb(255,176,64)",
  DROPOFF_COLOR = "rgb(110,230,140)",
  CAR_MARK_COLOR = "rgb(255,220,60)";

var COS30 = Math.cos(Math.PI / 6);

var events = {
  //anything the panel shows has changed: the phase of the order, the
  //board, the money
  change: 0,
};

/**
 * A route as the car drives it: its points, each in its lane, and how far
 * along it each one is, in tiles.
 */
function Path(tiles) {
  var points = tiles.length > 0 ? Carman.routeWaypoints(tiles, null) : [],
    at = [0],
    i;

  for (i = 1; i < points.length; i++)
    at.push(
      at[i - 1] +
        Math.abs(points[i].x - points[i - 1].x) +
        Math.abs(points[i].y - points[i - 1].y),
    );

  this.tiles = tiles;
  this.points = points;
  this.at = at;
  this.length = at[at.length - 1];
}

/**
 * Where on it the car is, done of the way along: {x, y, dx, dy}, dx and dy
 * the way it is going - both 0 when it is not going anywhere.
 */
Path.prototype.position = function (done) {
  var points = this.points,
    at = this.at,
    d = done * this.length,
    i = 1;

  if (points.length === 1)
    return { x: points[0].x, y: points[0].y, dx: 0, dy: 0 };

  while (i < points.length - 1 && at[i] < d) i++;

  var a = points[i - 1],
    b = points[i],
    span = at[i] - at[i - 1],
    f = span <= 0 ? 1 : Math.min(1, Math.max(0, (d - at[i - 1]) / span));

  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    dx: b.x - a.x,
    dy: b.y - a.y,
  };
};

/**
 * Which way it is drawn going (dx, dy), as the camera sees it - or null for
 * no way at all.
 */
function headingOf(dx, dy) {
  if (dx === 0 && dy === 0) return null;

  return View.heading(
    Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "x+" : "x-") : dy > 0 ? "y+" : "y-",
  );
}

function CourierCarScript(man) {
  engine.Component.call(this);
  this.man = man;
}

CourierCarScript.prototype = Object.create(engine.Component.prototype);

CourierCarScript.prototype.tick = function () {
  this.man.frame(Date.now());
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
  //where the car was last drawn, in tiles - where it stays when it stops
  this.x = 0;
  this.y = 0;
  //the routes of the order on, as driven (Path), by its id
  this._paths = null;
  this._pathsOf = null;
  this._phase = null;
  this._sinceCheck = CHECK_EVERY;
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
  //found at a glance among the traffic, at night as well
  this.mark = new Marker("car", CAR_MARK_COLOR);
  root.game.scene.addGameObject(this.mark);

  //where it is parked, until something says otherwise
  var parked = parkedAt(this.courier.carTile());
  this.x = parked.x;
  this.y = parked.y;

  this.frame(Date.now());
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

  courier.park(Roads.nearest(network, c.x, c.y));
}

//the middle of a road tile, in the lane of something parked going +x
function parkedAt(tile) {
  return {
    x: Terrain.extractX(tile),
    y: Terrain.extractY(tile) - Carman.LANE,
  };
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

  if (order !== null) this.frame(Date.now());

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
 * Where the order is at now (Courier#status).
 */
Deliveryman.prototype.status = function () {
  return this.courier.status(Date.now());
};

Deliveryman.prototype.changed = function () {
  Events.fire(this, events.change, this);
};

function pathsOf(self, order) {
  if (self._pathsOf !== order.id) {
    self._paths = [new Path(order.legs[0]), new Path(order.legs[1])];
    self._pathsOf = order.id;
  }

  return self._paths;
}

/**
 * Puts the car where it is at time now, and the camera on it - every frame.
 * Every so often it also looks at whether the order has moved on, and keeps
 * the markers and the board up to date.
 */
Deliveryman.prototype.frame = function (now) {
  var status = this.courier.status(now),
    order = status.order,
    pos;

  if (order !== null) {
    //standing at the restaurant or the door, it faces the way it came in
    pos = pathsOf(this, order)[status.leg].position(status.legDone);
  } else pos = { x: this.x, y: this.y, dx: 0, dy: 0 };

  this.x = pos.x;
  this.y = pos.y;

  draw(this, headingOf(pos.dx, pos.dy));
  showProgress(this, status);

  this._sinceCheck += now - (this._lastFrame || now);
  this._lastFrame = now;

  if (this._sinceCheck >= CHECK_EVERY) {
    this._sinceCheck = 0;
    check(this, status, now);
  }
};

function draw(self, heading) {
  var car = self.car;

  if (car === null) return;

  heading = heading || self.heading || View.heading("x+");

  if (heading !== self.heading && self.looks !== null) {
    var frame = self.looks[heading],
      renderer = car.spriteRenderer;

    renderer.setSprite(frame.sprite);
    renderer.pivotX = frame.pivotX;
    renderer.pivotY = frame.pivotY;
    renderer.setLit(null);
    self.heading = heading;
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
 * standing there for - the food, loading it, handing it over. And the pins
 * kept clear of the panel at the bottom of the screen.
 */
function showProgress(self, status) {
  var phase = status.phase,
    stopped = phase === Phase.atRestaurant || phase === Phase.atDoor,
    bottom = (self.raise * 2) / self.root.camera.cameraScript.zoom();

  if (self.mark !== null)
    self.mark.marker.progress = stopped ? status.step : null;

  if (self.pickupPin !== null) {
    self.pickupPin.marker.progress =
      phase === Phase.toRestaurant && status.cooked < 1 ? status.cooked : null;
    self.pickupPin.marker.bottom = bottom;
  }

  if (self.dropoffPin !== null) self.dropoffPin.marker.bottom = bottom;
}

export default Deliveryman;
