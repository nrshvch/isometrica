import engine from "engine";
import Core from "core/main";
import Config from "./config";
import View from "./view";
import Traffic from "./traffic";
import RenderLayer from "./renderlayer";
import Pathfinder from "./pathfinding/pathfinder";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import VTime from "core/vtime";
import CoreConfig from "core/config";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import GLView from "./glview";

var Terrain = Core.Terrain;

//Cars driving about the roads, for the look of it - they carry nothing and
//nobody waits for them.
//
//There is one for every four road tiles that are loaded through the day, and
//more in the rush hours - one for every two and a half at eight in the
//morning and at five in the evening. Each goes from a random road tile to
//another one it can reach, found with the pathfinder, and on from there to the
//next once it gets there. Whenever the roads under one go - demolished, or
//their chunk unloaded - it is put on some other road. Once the rush is over,
//the light cars more than the hour wants are done when they get where they
//are going.
//
//How they drive is client/traffic's: each keeps to the right hand side of the
//road, in its lane, and keeps its distance from what is in front of it; they
//take turns at the junctions, queue - and jam - and go round a car broken
//down in their way one at a time.
//
//Each one is some body type - a sedan, a van, a bus... - in some colour, with
//a picture for each of the eight ways it can drive - along x and y and half
//way between, which is how it goes round a corner - all painted by
//shared/gen/vehicles as they are first drawn (see client/generator). Bigger
//ones drive slower.
//
//Where one goes depends on what it is. A light car drives by the clock: to
//work in the morning, home in the evening, wherever in the afternoon. Between
//midnight and six it is on its way off the roads: it finishes the trip it is
//on, and is taken off when it gets there rather than setting out again. One
//still driving at six carries on and heads to work like the rest.
//
//The buses run from one bus stop to the next (client/road, a road with a
//stop on it), a round of a few of them near each other, pulling in to the
//kerb at each for a few seconds and out again when the lane behind is clear.
//There are as many buses out as one for every two stops loaded, and none
//where there are fewer than two. They stop for the night too: one that is at
//a stop between midnight and six is done, and goes back out in the morning.
//
//A few light cars do go out in the small hours, from anywhere to anywhere, and
//at that time of night they are in a hurry. Those are out for the night: they
//keep driving until it is over, rather than stopping at the first place they
//get to the way the evening's traffic does.
//Vans and lorries are about their own business and go wherever, at any hour.
//Only the choice of a new destination goes by any of this - one already on
//its way keeps its route.
//
//Every so many tiles one breaks down: it stops where it is, smoke coming out
//of its engine as thick as a chimney's, for a few hours of the game's time,
//then carries on with its trip. It gives some warning: for the last few tiles
//before it goes it crawls along, its engine already smoking - thinner, two
//puffs a second. The traffic behind it queues, and goes round it a car at a
//time where the other lane is clear (client/traffic). Every one can puff a little smoke out
//of its tailpipe as it drives too - two puffs a second, thinner than a chimney
//- but that is switched off (EXHAUST).
//
//Positions here are in tiles: the middle of tile (x, y) is at (x, y), which is
//where the game puts the tile in the world too, and its edges are half a tile
//off it.

var CARS_PER_ROAD = 1 / 4,
  //and at the height of the rush hours
  RUSH_PER_ROAD = 0.4,
  //how long one waits in a queue that does not move before it gives up on
  //it, ms
  STUCK_FOR = 60000,
  //how long a bus stands at a stop, ms
  BUS_DWELL = 6000,
  //how many stops it calls at on its round
  BUS_ROUND = 4,
  //tiles a second
  SPEED = 1.4,
  //how far a destination can be, in road tiles looked at to find it
  REACH = 400,
  //how often the number of cars is set right, ms
  RECONCILE_INTERVAL = 500,
  //cars put on the roads at a time, so a city just loaded fills up gradually
  SPAWN_BATCH = 8,
  //light cars out in the small hours, as a share of a full day's traffic
  NIGHT_LIGHT_SHARE = 0.05,
  //how much faster than the rest of the day those few drive
  SPEEDING = 2,
  //destinations of the hour to try before falling back on any road at all
  DESTINATION_TRIES = 3,
  //how long the roads outside the shops and houses are taken as found, ms
  DESTINATIONS_TTL = 2000,
  //how far a car drives between breakdowns, in tiles
  BREAKDOWN_EVERY = 2000,
  //how many tiles before that it starts to give out: it slows down and its
  //engine smokes
  FAILING_FOR = 20,
  //what share of its speed it still makes then
  FAILING_SPEED = 0.5,
  //and how often a puff comes out of the engine, ms
  FAILING_SMOKE_EVERY = 500,
  //how long one stands broken down, in minutes of the game's time - give or
  //take
  BREAKDOWN_MINUTES = 60,
  //whether smoke comes out of the tailpipe as it drives
  EXHAUST = false,
  //how often a puff of it does, ms
  EXHAUST_EVERY = 500,
  //and out of the engine while it stands broken down - as often as out of a
  //chimney
  BREAKDOWN_SMOKE_EVERY = 500,
  //how long a police car's lamp stays blue before it turns red, ms
  LAMP_EVERY = 240;

//game time that goes by in a millisecond of the real thing
var GAME_SPEED = VTime.millisecondsPerTick / CoreConfig.tickDelay,
  MINUTE = 60000;

//what a building has to be for cars to drive to it
var WORK = "work",
  HOME = "home";

//how a body type picks where to go: by the time of day, at random, or back
//and forth between the two stops it was given
var COMMUTER = 0,
  ERRAND = 1,
  SHUTTLE = 2;

//everything not named here is a light car, and drives by the clock
var TRAFFIC = {
  van: ERRAND,
  truck: ERRAND,
  lorry: ERRAND,
  //a cab and a police car go where they are called, at any hour
  taxi: ERRAND,
  police: ERRAND,
  bus: SHUTTLE,
};

function wanted(kind, data) {
  return kind === HOME
    ? data.classCode === BuildingClassCode.house
    : //anywhere anybody works: the shops, the industry, the town hall
      data.jobs > 0;
}

//from this hour to that one, light cars set out from buildings of one kind
//and drive to buildings of the other
var HOURS = [
  { from: 6, to: 12, origin: HOME, kind: WORK },
  { from: 18, to: 24, origin: WORK, kind: HOME },
];

//until this hour a light car that arrives somewhere stays there
var LIGHTS_OUT_UNTIL = 6;

var position = new Float32Array(3);

var DIRECTIONS = Traffic.DIRECTIONS;

function distance(a, b) {
  return Pathfinder.manhattan(
    Terrain.extractX(a),
    Terrain.extractY(a),
    Terrain.extractX(b),
    Terrain.extractY(b),
  );
}

/**
 * Some road tile other than this one that can be driven to from it, or -1.
 * Picked among the ones nearest to it, so a car on a big network stays about
 * the same part of town.
 */
function pickDestination(root, start) {
  var seen = new Set([start]),
    queue = [start],
    next = [],
    tile,
    i;

  for (var head = 0; head < queue.length && queue.length < REACH; head++) {
    next.length = 0;
    Traffic.neighbours(root.roadman, queue[head], next);

    for (i = 0; i < next.length; i++) {
      tile = next[i];

      if (!seen.has(tile)) {
        seen.add(tile);
        queue.push(tile);
      }
    }
  }

  if (queue.length < 2) return -1;

  return queue[1 + ((Math.random() * (queue.length - 1)) | 0)];
}

//the way from one road tile to another, or an empty array when there is none
function routeTo(root, start, end) {
  return Pathfinder.searchTiles(
    start,
    end,
    function (tile, out) {
      Traffic.neighbours(root.roadman, tile, out);
    },
    distance,
  );
}

/**
 * Whether light cars take to the roads at this hour - between midnight and six
 * in the morning they do not.
 */
function lightAllowed(root) {
  return root.core.time.hour >= LIGHTS_OUT_UNTIL;
}

/**
 * What light cars are driving to at this time of day, or null when it is one
 * of the hours they just drive about.
 */
function hoursNow(root) {
  var hour = root.core.time.hour,
    i;

  for (i = 0; i < HOURS.length; i++) {
    if (hour >= HOURS[i].from && hour < HOURS[i].to) return HOURS[i];
  }

  return null;
}

function wantedKind(root) {
  var hours = hoursNow(root);

  return hours === null ? null : hours.kind;
}

/**
 * What a light car put on the roads now is setting out from - a house in the
 * morning, work in the evening - or null at the hours it is neither.
 */
function originKind(root) {
  var hours = hoursNow(root);

  return hours === null ? null : hours.origin;
}

/**
 * Road tiles from start to some other one it is connected to, both included,
 * or an empty array when there is nowhere to go. A road by a building of that
 * kind is tried first, if one is asked for; when there is no getting to one,
 * or none is wanted, it is any road within reach.
 */
function findRoute(man, start, kind) {
  var root = man.root,
    tiles,
    end,
    found,
    i;

  if (kind !== null) {
    tiles = man.getDestinations(kind);

    for (i = 0; i < DESTINATION_TRIES && tiles.length > 0; i++) {
      end = tiles[(Math.random() * tiles.length) | 0];

      if (end !== start) {
        found = routeTo(root, start, end);

        if (found.length > 1) return found;
      }
    }
  }

  end = pickDestination(root, start);

  return end === -1 ? [] : routeTo(root, start, end);
}

/**
 * The height of the ground at a point, in tiles, the way the terrain is drawn:
 * straight between the heights of the tile's corners - or of a road's own
 * surface there (client/road).
 */
function groundHeight(root, x, y) {
  var terrain = root.core.terrain,
    //the corners of tile (x, y) are half a tile off its middle
    gx = x + 0.5,
    gy = y + 0.5,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    fx = gx - x0,
    fy = gy - y0,
    a = terrain.getGridPointHeight(x0, y0),
    b = terrain.getGridPointHeight(x0 + 1, y0),
    c = terrain.getGridPointHeight(x0, y0 + 1),
    d = terrain.getGridPointHeight(x0 + 1, y0 + 1),
    tile = Terrain.convertToIndex(x0, y0);

  //on a road, its own surface - on its concrete, if it is on any
  var road = root.roadman.getRoad(tile);

  if (road !== null) {
    var surface = road.surface();

    a = surface[0];
    b = surface[1];
    c = surface[2];
    d = surface[3];
  }

  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function CarScript(man) {
  engine.Component.call(this);
  this.man = man;
  this.driver = null;
}

CarScript.prototype = Object.create(engine.Component.prototype);

CarScript.prototype.man = null;
//how it drives the roads, among everything else on them (client/traffic)
CarScript.prototype.driver = null;
//what it drives at when it is not in a hurry
CarScript.prototype.baseSpeed = SPEED;
//its pictures, one for each way it drives: {"x+": sprite, ...}
CarScript.prototype.looks = null;
CarScript.prototype.heading = null;
CarScript.prototype.traffic = COMMUTER;
//out for a drive in the small hours rather than on its way home for the night
CarScript.prototype.nightRider = false;
CarScript.prototype.type = null;
//a bus's stops, in the order it calls at them, and which it is going to
CarScript.prototype.stops = null;
CarScript.prototype.stop = 0;
//how long it has stood at the stop it is at, ms
CarScript.prototype.dwelt = 0;
//how long it has waited in traffic without moving, ms
CarScript.prototype.waited = 0;
//real time left before it drives on again when it has broken down, ms; none
//when it is running
CarScript.prototype.stalled = 0;
//how far it has driven since it last broke down, in tiles
CarScript.prototype.driven = 0;
//since the last puff of smoke out of it, ms
CarScript.prototype.sinceSmoke = 0;
//which flash of its lamp is showing, and how long it has been, ms
CarScript.prototype.lamp = 0;
CarScript.prototype.sinceLamp = 0;

/**
 * The Driver for it, made as it is first put on the roads, and the same one
 * whenever it is put somewhere else - it takes its place among the traffic
 * once and for all.
 */
CarScript.prototype.driverFor = function () {
  var self = this,
    type = this.type,
    traffic = this.man.traffic;

  if (this.driver === null)
    this.driver = traffic.add(
      new Traffic.Driver(traffic, type.length, type.width, {
        nearEnd: function () {
          self.extend();
        },
        end: function () {
          self.arrive();
        },
      }),
    );

  this.driver.length = type.length;
  this.driver.width = type.width;

  return this.driver;
};

/**
 * Puts the car on the roads, off on a route. A light car starts where the
 * people in it would be at this hour - outside a house in the morning, outside
 * work in the evening; a bus at one of its stops; anything else on a road
 * picked at random. Never on top of something already there.
 *
 * @returns {boolean} false when there was no road to put it on
 */
CarScript.prototype.spawn = function (traffic) {
  var man = this.man,
    root = man.root,
    origin,
    tile,
    route,
    wps,
    driver,
    attempt;

  //it is put on the new road running, some way off its next breakdown - not
  //the same way off as everything put out with it, or they would all go at once
  this.stalled = 0;
  this.driven = Math.random() * (BREAKDOWN_EVERY - FAILING_FOR);
  //and does not puff in step with everything put out with it
  this.sinceSmoke = Math.random() * EXHAUST_EVERY;
  this.dress(traffic);

  driver = this.driverFor();
  driver.stalled = driver.broken = false;
  driver.stopAtEnd = false;

  if (this.traffic === SHUTTLE) return this.startRound();

  origin = this.traffic === COMMUTER ? originKind(root) : null;

  for (attempt = 0; attempt < 4; attempt++) {
    tile = origin === null ? -1 : man.pickRoadBy(origin);

    //nowhere of that kind to start from, so anywhere will do
    if (tile === -1) tile = root.roadman.getRandomRoadTile();

    if (tile === -1) return false;

    route = this.nextRoute(tile);

    if (route.length < 2) continue;

    wps = Traffic.routeWaypoints(route, null);

    if (!man.traffic.roomAt(wps[0].x, wps[0].y, driver.length)) continue;

    driver.setPath(wps);
    driver.v = driver.v0 * 0.5;
    man.traffic.enter(driver);
    this.place();

    return true;
  }

  return false;
};

/**
 * A bus going out: a round of the stops near one of them, which it starts
 * from, standing at it.
 */
CarScript.prototype.startRound = function () {
  var man = this.man,
    stops = man.busStops(),
    driver = this.driver,
    first,
    d;

  if (stops.length < 2) return false;

  first = stops[(Math.random() * stops.length) | 0];
  d = man.kerbSide(first);

  if (d === null) return false;

  this.stops = man.round(first, stops);
  this.stop = 1 % this.stops.length;
  this.dwelt = Math.random() * BUS_DWELL;

  var at = Traffic.kerb(first, d);

  if (!man.traffic.roomAt(at.x, at.y, driver.length)) return false;

  driver.parkAt(first, d);
  man.traffic.enter(driver);
  this.place();

  return true;
};

/**
 * Whether it is to be taken off the roads when it gets where it is going. In
 * the small hours the buses stop running and the evening's light cars are done
 * for the day; the few out driving about through the night are not.
 */
CarScript.prototype.retires = function () {
  if (lightAllowed(this.man.root)) return false;

  return (
    this.traffic === SHUTTLE || (this.traffic === COMMUTER && !this.nightRider)
  );
};

/**
 * Whether, a light car, it is one more than the hour wants: it goes no
 * further than where it is going.
 */
CarScript.prototype.done = function () {
  return this.traffic === COMMUTER && this.man.surplus() > 0;
};

/**
 * Whether a light car is where the hour has it go: outside work in the
 * morning, a house in the evening.
 */
CarScript.prototype.home = function (tile) {
  var kind = wantedKind(this.man.root);

  return (
    this.traffic === COMMUTER &&
    kind !== null &&
    this.man.getDestinations(kind).indexOf(tile) !== -1
  );
};

/**
 * Got there. A light car that arrives between midnight and six is off the
 * roads for the night; a bus stands at its stop; anything else sets off again
 * from where it stands - one that was still driving at six among them, which
 * now has the morning's run to work ahead of it like any other.
 */
CarScript.prototype.arrive = function () {
  var driver = this.driver,
    last = driver.last(),
    route;

  //done for the night - or, the rush over, done for the day where it got to;
  //or at work, or home, where it was going: parked there, and somebody else
  //sets out in its place
  if (this.retires() || this.done() || this.home(last.tile)) {
    this.man.remove(this);
    return;
  }

  //at the stop, pulled in: it waits there for its time (tick)
  if (this.traffic === SHUTTLE) {
    this.dwelt = 0;
    this.stop = (this.stop + 1) % this.stops.length;
    return;
  }

  route = this.nextRoute(last.tile);

  if (route.length < 2) {
    this.man.respawn(this);
    return;
  }

  //it stands still at the end of the old route, so that is where the new one
  //starts from - no jump onto its first point
  driver.setPath(
    [
      { tile: last.tile, x: driver.x, y: driver.y, din: last.din, dout: null },
    ].concat(Traffic.routeWaypoints(route, last.din)),
  );
};

/**
 * Where it goes from here, as road tiles - by the clock for a light car,
 * anywhere for the rest.
 */
CarScript.prototype.nextRoute = function (from) {
  var man = this.man;

  //come the morning the night's drivers are off to work like everybody else,
  //and at everybody else's speed
  if (lightAllowed(man.root)) this.nightRider = false;

  //whoever is out in a light car in the small hours is in no mood to hang about
  this.driver.v0 = this.nightRider ? this.baseSpeed * SPEEDING : this.baseSpeed;

  return findRoute(
    man,
    from,
    this.traffic === COMMUTER ? wantedKind(man.root) : null,
  );
};

/**
 * A body type picked at random - the common ones more often - in a random
 * colour, and the speed that goes with it.
 *
 * @param [traffic] {number} COMMUTER, ERRAND or SHUTTLE to have one of those;
 *        leave it out for any type but a bus
 */
CarScript.prototype.dress = function (traffic) {
  var type = this.man.pickType(traffic),
    colors = Object.keys(type.frames),
    color = colors[(Math.random() * colors.length) | 0];

  this.type = type;
  this.looks = type.frames[color];
  this.heading = null;
  this.lamp = type.lamps === null ? 0 : (Math.random() * type.lamps.length) | 0;
  this.sinceLamp = 0;
  this.baseSpeed = SPEED * type.speed * (0.9 + Math.random() * 0.2);
  this.traffic = type.traffic;
  this.stops = null;
  //a light car that goes out at this hour is out for the night, not on its
  //way off the roads
  this.nightRider = type.traffic === COMMUTER && !lightAllowed(this.man.root);
};

/**
 * On the way to the last point of the route - the middle of where it goes to -
 * the next route is joined on, so the car drives straight on into it instead
 * of stopping there first.
 */
CarScript.prototype.extend = function () {
  var driver = this.driver,
    wps = driver.wps,
    last = wps[wps.length - 1],
    route;

  //in the small hours nothing is joined on for a light car on its way home:
  //it drives the last of this route and it is seen to when it gets there
  if (
    this.retires() ||
    this.done() ||
    this.home(last.tile) ||
    this.traffic === SHUTTLE ||
    last.din === null
  )
    return;

  route = this.nextRoute(last.tile);

  if (route.length < 2) return;

  //the new route starts in that same tile, the way the car came into it
  driver.extend(Traffic.routeWaypoints(route, last.din));
};

/**
 * Stops where it is, smoke coming out of the engine, for a while - and the
 * traffic behind it goes round it.
 */
CarScript.prototype.breakDown = function () {
  this.stalled =
    (BREAKDOWN_MINUTES * MINUTE * (0.6 + Math.random() * 0.8)) / GAME_SPEED;
  this.driven = 0;
  this.driver.stalled = this.driver.broken = true;
};

/**
 * Whether it is in its last few tiles before it breaks down - slow, and
 * smoking already.
 */
CarScript.prototype.failing = function () {
  return this.stalled <= 0 && this.driven >= BREAKDOWN_EVERY - FAILING_FOR;
};

/**
 * A bus at its stop: once it has stood there long enough, and it can pull
 * out, off to the next one.
 */
CarScript.prototype.atStop = function (dt) {
  var driver = this.driver,
    man = this.man,
    here = driver.tile(),
    next = this.stops[this.stop],
    d = [Math.round(driver.hx), Math.round(driver.hy)],
    route;

  this.dwelt += dt;

  if (this.dwelt < BUS_DWELL) return;

  //the night is no time for a bus
  if (this.retires()) {
    man.remove(this);
    return;
  }

  if (!driver.canPullOut()) return;

  route = man.routeOn(here, d, next);

  if (route.length < 2) {
    //that stop is gone, or cannot be got to: another round
    man.respawn(this);
    return;
  }

  driver.pullOut(route, true);
};
/**
 * A puff of smoke every so often: out of the tailpipe while it drives, out of
 * the engine, black, when it is about to break down, and more often still
 * while it stands broken down. Each rises from where it came out, so a car
 * driving leaves a trail of them behind.
 */
CarScript.prototype.smoke = function (dt) {
  var broken = this.stalled > 0,
    failing = this.failing(),
    engine = broken || failing,
    frame = this.looks[this.heading],
    at = engine ? frame.engine : frame.tailpipe;

  if (!engine && !EXHAUST) return;

  this.sinceSmoke += dt;

  if (
    this.sinceSmoke <
    (broken
      ? BREAKDOWN_SMOKE_EVERY
      : failing
        ? FAILING_SMOKE_EVERY
        : EXHAUST_EVERY)
  )
    return;

  this.sinceSmoke = 0;
  this.gameObject.transform.getPosition(position);

  //off the car as its picture has it, the camera turned (see client/view)
  var off = View.unvector(at[0], at[2]);

  SmokeSource.puff(
    this.gameObject.world,
    position[0] + off[0] * Config.tileSize,
    position[1] + at[1] * Config.tileZStep,
    position[2] + off[1] * Config.tileSize,
    engine ? SmokeScript.soot : SmokeScript.steam,
  );
};

CarScript.prototype.place = function () {
  var root = this.man.root,
    driver = this.driver,
    //which way it goes as it is seen, the camera turned (see client/view)
    heading = View.heading(View.headingOf(driver.hx, driver.hy) || "x+"),
    renderer,
    frame;

  if (heading !== this.heading && this.looks[heading] !== undefined) {
    this.heading = heading;
    frame = this.looks[heading];
    renderer = this.gameObject.spriteRenderer;
    renderer.setSprite(frame.sprite);
    renderer.pivotX = frame.pivotX;
    renderer.pivotY = frame.pivotY;
    this.showLamp();
  }

  this.gameObject.transform.setPosition(
    driver.x * Config.tileSize,
    groundHeight(root, driver.x, driver.y) * Config.tileZStep,
    driver.y * Config.tileSize,
  );
};

/**
 * Lays this flash of its lamp - or its sign, which is always the same one -
 * over the car, the way it is facing now.
 */
CarScript.prototype.showLamp = function () {
  var lamps = this.type.lamps,
    heading = this.heading;

  if (lamps === null) {
    this.gameObject.spriteRenderer.setLit(null);
    return;
  }

  this.gameObject.spriteRenderer.setLit(
    lamps[this.lamp][heading],
    this.type.flashes[heading],
  );
};

/**
 * Blue, then red, and round again - for as long as there is more than one
 * flash to show. A cab's sign has only the one and never changes.
 */
CarScript.prototype.blink = function (dt) {
  var lamps = this.type.lamps;

  if (lamps === null || lamps.length < 2) return;

  this.sinceLamp += dt;

  if (this.sinceLamp < LAMP_EVERY) return;

  this.sinceLamp = 0;
  this.lamp = (this.lamp + 1) % lamps.length;
  this.showLamp();
};

//whether what it queues behind - or what that queues behind, and so on -
//is broken down: a queue that will move once it is going again
function behindBreakdown(driver) {
  for (var d = driver.leader, n = 0; d !== null && n < 12; d = d.leader, n++)
    if (d.broken) return true;

  return false;
}

CarScript.prototype.tick = function (time) {
  var roadman = this.man.root.roadman,
    driver = this.driver,
    wps = driver === null ? [] : driver.wps,
    x,
    y;

  if (wps.length === 0) return;

  //the road it is on or heading for is gone
  if (
    roadman.getRoad(driver.tile()) === null ||
    (driver.target < wps.length &&
      roadman.getRoad(wps[driver.target].tile) === null)
  ) {
    this.man.respawn(this);
    return;
  }

  this.smoke(time.dt);
  this.blink(time.dt);

  if (this.stalled > 0) {
    this.stalled -= time.dt;

    if (this.stalled <= 0) driver.stalled = driver.broken = false;

    driver.update(time.dt);
    return;
  }

  if (driver.parked && this.traffic === SHUTTLE) {
    this.atStop(time.dt);
    if (this.driver === null || this.gameObject === null) return;
  }

  //crawling along on its last legs
  driver.v0 =
    (this.nightRider ? this.baseSpeed * SPEEDING : this.baseSpeed) *
    (this.failing() ? FAILING_SPEED : 1);

  x = driver.x;
  y = driver.y;
  driver.update(time.dt);

  if (driver.wps.length === 0 || this.driver === null) return;

  //stuck for good - a block of streets locked solid, which a city's traffic
  //does now and then: it turns off somewhere out of sight, and is put on
  //some other road
  this.waited =
    driver.v < 0.05 && driver.held !== "" && !behindBreakdown(driver)
      ? this.waited + time.dt
      : 0;

  if (this.waited > STUCK_FOR) {
    this.waited = 0;
    this.man.unstuck++;
    this.man.respawn(this);
    return;
  }

  this.driven += Math.abs(driver.x - x) + Math.abs(driver.y - y);
  this.place();

  if (this.driven >= BREAKDOWN_EVERY) this.breakDown();
};

/**
 * Draws a vehicle, and over it whatever gives off light of its own - a police
 * car's lamp, a cab's sign. The lit part is a picture of its own laid on top
 * rather than a picture of the whole car per flash, and it is drawn by this
 * one renderer so that it is sorted, and moves, with the car itself and
 * nothing can come between the two.
 *
 * It is also where a darkened car will part company with its lamp: night
 * shading belongs on the draw below, not on this one.
 */
function VehicleRenderer() {
  engine.SpriteRenderer.call(this);
}

VehicleRenderer.prototype = Object.create(engine.SpriteRenderer.prototype);

VehicleRenderer.prototype.constructor = VehicleRenderer;

//{sprite, pivotX, pivotY}, or null for a vehicle with nothing lit on it
VehicleRenderer.prototype.lit = null;

//every flash of it the way the vehicle is facing, the one showing among them
VehicleRenderer.prototype.flashes = null;

/**
 * @param lit {Object|null} what is lit on it now
 * @param [flashes] {Object[]} every flash it goes through, lit among them -
 *        kept cached while the one showing is drawn, so that none of them is
 *        put away between one flash and the next
 */
VehicleRenderer.prototype.setLit = function (lit, flashes) {
  this.lit = lit;
  this.flashes = flashes || null;
};

VehicleRenderer.prototype.render = function (
  layer,
  viewportRenderer,
  viewport,
  self,
) {
  engine.SpriteRenderer.prototype.render.call(
    self,
    layer,
    viewportRenderer,
    viewport,
    self,
  );

  var lit = self.lit;

  if (lit === null) return;

  var sprite = lit.sprite,
    flashes = self.flashes;

  if (flashes !== null)
    for (var i = 0; i < flashes.length; i++)
      if (flashes[i] !== lit) flashes[i].sprite.keep();

  if (sprite.width === 0) return;

  //where the vehicle itself was just drawn; the lamp was painted standing on
  //the car, about the same point, so its own pivot puts it back there
  var buffer = self.buf;

  engine.SpriteRenderer.picture(
    layer,
    self,
    lit.glow || (lit.glow = new Lamp(sprite)),
    Math.floor(buffer[0] - lit.pivotX + 0.5),
    Math.floor(buffer[1] - lit.pivotY + 0.5),
  );
};

/**
 * A lamp on a vehicle - a police car's - as it is drawn over it: its colours
 * as painted, and at night its own light (client/glview).
 */
function Lamp(sprite) {
  this.sprite = sprite;
  this.width = sprite.width;
  this.height = sprite.height;
}

Lamp.prototype.glQuad = function (renderer, flat, lit, night, d, o) {
  var s = this.sprite;

  if (!s.acquire()) return false;

  d[o] = d[o + 4] = d[o + 12] = s.sourceImage;
  d[o + 1] = d[o + 5] = d[o + 13] = s.offsetX;
  d[o + 2] = d[o + 6] = d[o + 14] = s.offsetY;
  d[o + 3] = GLView.FROM;
  //looking up, as high as the car under it stands
  d[o + 7] = lit ? GLView.DARK : GLView.SKIP;
  d[o + 11] = GLView.SKIP;
  d[o + 15] = night ? GLView.FROM : GLView.SKIP;

  return true;
};

//it draws only pictures (engine Canvas2dRenderer renderGL)
VehicleRenderer.prototype.litPasses = true;

function Car(man) {
  engine.GameObject.init(this, "car");

  //on the buildings layer rather than the one named after vehicles: a whole
  //layer is drawn over the one under it, so a car on its own layer goes
  //behind every building there is - including the porch or the fence of one
  //standing behind it, which is drawn over the road in front of it. Among
  //the buildings a car is sorted by where it actually is instead.
  var renderer = new VehicleRenderer();
  renderer.layer = RenderLayer.buildingsLayer;
  //its headlights and tail lights go on and off at its own time, a while
  //after the street lights (client/lighting lampsOn)
  renderer.lamps = Math.random();
  this.addComponent(renderer);

  this.car = this.addComponent(new CarScript(man));
}

Car.prototype = Object.create(engine.GameObject.prototype);

/**
 * How many cars a road tile takes at this hour: more in the rush hours, the
 * most at eight in the morning and five in the evening.
 */
function perRoad(root) {
  var time = root.core.time,
    h = time.hour + (time.minute || 0) / 60,
    rush = Math.max(
      Math.max(0, 1 - Math.abs(h - 8) / 1.5),
      Math.max(0, 1 - Math.abs(h - 17) / 1.75),
    );

  return CARS_PER_ROAD + (RUSH_PER_ROAD - CARS_PER_ROAD) * rush;
}

function reconcile(self) {
  if (self.types === null) return;

  var light = lightAllowed(self.root),
    roads = self.root.roadman.getRoadCount(),
    //as many as the roads take - though in the small hours the buses are
    //not running and the light cars are down to a few tearing about, so
    //what is left is the vans and the lorries
    most = Math.floor(roads * CARS_PER_ROAD),
    target,
    cars = self.cars,
    car,
    i;

  self.most = most;
  self.speeders = light ? 0 : Math.max(1, Math.round(most * NIGHT_LIGHT_SHARE));
  //a bus for every two stops, while they are running
  self.buses = light ? Math.floor(self.busStops().length / 2) : 0;

  target = light
    ? Math.floor(roads * perRoad(self.root))
    : Math.floor((most * self.nightWeight) / self.totalWeight) + self.speeders;
  self.target = target;

  //the few light cars of the night have their places kept for them, however
  //much else is out - the rest of the traffic is not turned out for them
  for (i = 0; i < SPAWN_BATCH; i++) {
    if (cars.length >= target && self.countLight() >= self.speeders) break;

    car = new Car(self);

    if (!car.car.spawn(self.wantsTraffic())) {
      if (car.car.driver !== null) self.traffic.remove(car.car.driver);
      break;
    }

    cars.push(car);
    self.root.game.logic.world.addGameObject(car);
  }

  //only when the roads themselves are gone - the night thins the traffic out
  //by letting the light cars finish and stay where they got to
  while (cars.length > Math.floor(roads * RUSH_PER_ROAD) + self.buses)
    self.remove(cars[cars.length - 1].car);
}

function CarManScript(man) {
  engine.Component.call(this);
  this.man = man;
}

CarManScript.prototype = Object.create(engine.Component.prototype);

CarManScript.prototype.elapsed = 0;

CarManScript.prototype.clock = 0;

CarManScript.prototype.tick = function (time) {
  this.elapsed += time.dt;
  this.clock += time.dt;

  //where everything is, for everything to look at as it drives
  this.man.traffic.frame(this.clock);

  if (this.elapsed >= RECONCILE_INTERVAL) {
    this.elapsed = 0;
    reconcile(this.man);
  }
};

function Carman(root) {
  this.root = root;
  this.cars = [];
  this.types = null;
  this.totalWeight = 0;
  //of that, what still runs between midnight and six
  this.nightWeight = 0;
  //as many as the roads take, which is what a type's share is of
  this.most = 0;
  //light cars allowed out at this hour of the night
  this.speeders = 0;
  //how many cars there are to be now, and how many of them buses
  this.target = 0;
  this.buses = 0;
  //what else drives the roads with them, to be lit as they are at night
  //(client/lighting) - the courier's car
  this.extras = [];
  //how many have given up on a queue that would not move (CarScript#tick)
  this.unstuck = 0;
  //everything on the roads, these and whatever else drives them
  //(client/traffic)
  this.traffic = new Traffic(root.roadman);
  //the bus stops loaded, as last found
  this._stops = null;
  this._stopsAt = 0;
  //roads by the places people drive to, by kind
  this.destinations = {};
}

Carman.prototype.init = function () {
  var go = new engine.GameObject("carman");
  go.addComponent(new CarManScript(this));
  this.root.game.logic.world.addGameObject(go);

  loadTypes(this);
  ensureStops(this.root);
};

//how far apart the stops put in a city are, at the least, in tiles - and how
//many road tiles of it there are to a stop
var STOP_APART = 7,
  ROADS_TO_A_STOP = 45;

/**
 * A city with no bus stops in it - one built before there were any - is
 * given a few: on straight streets of its road network with something built
 * along them, the nearest the middle of town first, none too close to
 * another. Kept with the roads in the save, like anything else about them.
 */
function ensureStops(root) {
  var city = root.core.cities.getCities()[0];

  if (!city) return;

  var buildings = city.buildings.getBuildings(),
    roads = new Map(),
    built = new Set(),
    i;

  for (i = 0; i < buildings.length; i++) {
    var b = buildings[i],
      data = BuildingData[b.buildingCode];

    if (data && data.classCode === BuildingClassCode.road) {
      if (b.look && b.look.stop) return;
      roads.set(b.tile, b);
    } else if (data && data.classCode !== BuildingClassCode.tree)
      built.add(b.tile);
  }

  function near(tile) {
    for (var dx = -2; dx <= 2; dx++)
      for (var dy = -2; dy <= 2; dy++)
        if (built.has(tile + dx + dy * Terrain.dy)) return true;

    return false;
  }

  function flat(b) {
    return (
      !Array.isArray(b.surface) ||
      b.surface.every(function (h) {
        return h === b.surface[0];
      })
    );
  }

  var c = city.center(),
    candidates = [];

  roads.forEach(function (b, tile) {
    var l = roads.has(tile - 1),
      r = roads.has(tile + 1),
      u = roads.has(tile - Terrain.dy),
      d = roads.has(tile + Terrain.dy);

    if (((l && r && !u && !d) || (u && d && !l && !r)) && flat(b) && near(tile))
      if (city.roads.inNetwork(tile)) candidates.push(tile);
  });

  candidates.sort(function (a, b) {
    return (
      Math.abs(Terrain.extractX(a) - c.x) +
      Math.abs(Terrain.extractY(a) - c.y) -
      (Math.abs(Terrain.extractX(b) - c.x) +
        Math.abs(Terrain.extractY(b) - c.y))
    );
  });

  var picked = [],
    most = Math.max(2, Math.min(6, Math.floor(roads.size / ROADS_TO_A_STOP)));

  for (i = 0; i < candidates.length && picked.length < most; i++) {
    var tile = candidates[i];

    if (
      picked.every(function (p) {
        return distance(p, tile) >= STOP_APART;
      })
    )
      picked.push(tile);
  }

  if (picked.length < 2) return;

  picked.forEach(function (tile) {
    var b = roads.get(tile),
      road = root.roadman.getRoad(tile);

    b.look = Object.assign({}, b.look || {}, { stop: true });

    if (road !== null) {
      if (road.data !== b) road.data.look = b.look;
      road.updateProfile();
    }
  });
}

/**
 * Takes the car off the road it is on and puts it on another - or off the map
 * altogether, when there is no road left to put it on.
 */
Carman.prototype.respawn = function (script) {
  if (!script.spawn(this.wantsTraffic())) this.remove(script);
};

/**
 * What the next one out should be. By day they all take their turn; in the
 * small hours it is vans and lorries, and the few light cars driving about -
 * no bus, they are not running at that hour.
 *
 * @returns {number|undefined}
 */
Carman.prototype.wantsTraffic = function () {
  if (lightAllowed(this.root))
    return this.countTraffic(SHUTTLE) < this.buses ? SHUTTLE : undefined;

  return this.countLight() < this.speeders ? COMMUTER : ERRAND;
};

/**
 * How many light cars are out over what the hour wants - which are done
 * when they get where they are going.
 */
Carman.prototype.surplus = function () {
  return this.cars.length - this.target;
};

/**
 * The bus stops loaded: road tiles with a stop on them (client/road). Found
 * again every so often, as roads come and go.
 */
Carman.prototype.busStops = function () {
  var now = Date.now();

  if (this._stops !== null && now - this._stopsAt < DESTINATIONS_TTL)
    return this._stops;

  this._stops = this.root.roadman.getStops();
  this._stopsAt = now;

  return this._stops;
};

/**
 * Which way something pulled in at the kerb of a stop faces: along the road,
 * either way it runs - or null when it is not a straight piece of road.
 */
Carman.prototype.kerbSide = function (tile) {
  var roadman = this.root.roadman,
    ways = DIRECTIONS.filter(function (d) {
      return Traffic.canDrive(roadman, tile, d);
    }),
    d;

  if (ways.length === 0) return null;

  d = ways[(Math.random() * ways.length) | 0];

  return [d[0], d[1]];
};

/**
 * A bus's round: from the first stop on to the nearest one not called at
 * yet, and so on - a few stops, all of them ones it can get to.
 */
Carman.prototype.round = function (first, stops) {
  var root = this.root,
    out = [first],
    left = stops.filter(function (s) {
      return s !== first;
    }),
    at = first;

  while (out.length < BUS_ROUND && left.length > 0) {
    left.sort(function (a, b) {
      return distance(at, a) - distance(at, b);
    });

    var next = left.shift();

    if (routeTo(root, at, next).length > 1) {
      out.push(next);
      at = next;
    }
  }

  return out;
};

/**
 * The way from tile, setting off the way d faces, to the tile `to`: straight
 * on into the next tile first if there is a road there, turning round on
 * this one if not.
 */
Carman.prototype.routeOn = function (tile, d, to) {
  var root = this.root,
    ahead = tile + d[0] + d[1] * Terrain.dy,
    on;

  if (
    Traffic.canDrive(root.roadman, tile, [d[0], d[1], ahead - tile]) &&
    (on = routeTo(root, ahead, to)).length > 0
  )
    return [tile].concat(on);

  return routeTo(root, tile, to);
};

/**
 * Takes the car off the roads for good. Whatever it is wanted for, another one
 * goes out in its place when there is room for it.
 */
Carman.prototype.remove = function (script) {
  var i = this.cars.indexOf(script.gameObject);

  if (script.driver !== null) {
    this.traffic.remove(script.driver);
    script.driver = null;
  }

  if (i !== -1) {
    this.cars.splice(i, 1);
    script.gameObject.destroy();
  }
};

/**
 * The loaded roads that run past a place people drive to at this time of day -
 * somewhere with work in it, or a house. Worked out again every so often, as
 * roads and buildings come and go.
 *
 * @param kind {string} WORK or HOME
 * @returns {number[]}
 */
Carman.prototype.getDestinations = function (kind) {
  var found = this.destinations[kind],
    now = Date.now();

  if (found !== undefined && now - found.at < DESTINATIONS_TTL)
    return found.tiles;

  var buildings = this.root.core.buildingService,
    roads = this.root.roadman.getRoadTiles(),
    tiles = [],
    tile,
    building,
    i,
    j;

  for (i = 0; i < roads.length; i++) {
    tile = roads[i];

    for (j = 0; j < DIRECTIONS.length; j++) {
      building = buildings.get(tile + DIRECTIONS[j][2]);

      if (building !== null && wanted(kind, building.data)) {
        tiles.push(tile);
        break;
      }
    }
  }

  this.destinations[kind] = { tiles: tiles, at: now };

  return tiles;
};

/**
 * A loaded road that runs past a building of that kind, or -1 when there is
 * none - where a light car setting out is put.
 */
Carman.prototype.pickRoadBy = function (kind) {
  var tiles = this.getDestinations(kind);

  return tiles.length === 0 ? -1 : tiles[(Math.random() * tiles.length) | 0];
};

/**
 * A body type, picked by how common it is, out of the ones wanted.
 *
 * Whatever is short of its share goes first. Traffic only leaves the roads at
 * night - and not all of it, the buses and the light cars rather than the vans
 * - so picking purely at random would let the vans that took their places keep
 * them for good, and a city that had had one night would never see a bus again.
 *
 * @param [traffic] {number} COMMUTER, ERRAND or SHUTTLE to have one of those;
 *        leave it out for any type at all
 */
Carman.prototype.pickType = function (traffic) {
  var types = this.types,
    counts = this.countTypes(),
    short = [],
    wanted = [],
    type,
    i;

  for (i = 0; i < types.length; i++) {
    type = types[i];

    if (!allowed(type, traffic)) continue;

    wanted.push(type);

    if (counts[type.name] < (type.weight / this.totalWeight) * this.most)
      short.push(type);
  }

  return byWeight(short.length > 0 ? short : wanted);
};

//anything but a bus, unless a bus is asked for: a bus only goes out when
//there are stops for it
function allowed(type, traffic) {
  return traffic === undefined
    ? type.traffic !== SHUTTLE
    : type.traffic === traffic;
}

//one of them, the common ones more often
function byWeight(types) {
  var weight = 0,
    r,
    i;

  for (i = 0; i < types.length; i++) weight += types[i].weight;

  r = Math.random() * weight;

  for (i = 0; i < types.length - 1; i++) {
    r -= types[i].weight;

    if (r < 0) break;
  }

  return types[i];
}

/**
 * How many of each body type are out right now, by name.
 */
Carman.prototype.countTypes = function () {
  var cars = this.cars,
    counts = {},
    types = this.types,
    name,
    i;

  for (i = 0; i < types.length; i++) counts[types[i].name] = 0;

  for (i = 0; i < cars.length; i++) {
    name = cars[i].car.type.name;
    counts[name]++;
  }

  return counts;
};

/**
 * How many of that kind of traffic are out right now.
 */
Carman.prototype.countTraffic = function (traffic) {
  var cars = this.cars,
    n = 0;

  for (var i = 0; i < cars.length; i++)
    if (cars[i].car.traffic === traffic) n++;

  return n;
};

/**
 * How many light cars are out right now.
 */
Carman.prototype.countLight = function () {
  var cars = this.cars,
    n = 0,
    i;

  for (i = 0; i < cars.length; i++) {
    if (cars[i].car.traffic === COMMUTER) n++;
  }

  return n;
};

/**
 * The body types, as the generator described them at build time
 * (gfx/generated/vehicles.json), with the sprites of every colour and heading
 * - each painted the first time a car of it is drawn. No car goes out without
 * them.
 */
function loadTypes(self) {
  var sprites = self.root.sprites,
    generated = self.root.generated,
    types = [],
    total = 0,
    night = 0;

  if (generated === null) return;

  function look(f) {
    return {
      sprite: sprites.getSprite(f.sprite),
      pivotX: f.pivotX,
      pivotY: f.pivotY,
    };
  }

  Object.keys(generated.vehicles).forEach(function (name) {
    //what works on building sites stays there
    if (generated.vehicles[name].street === false) return;

    var data = generated.vehicles[name],
      type = {
        name: name,
        speed: data.speed,
        //in tiles - a tile is 32 units
        length: (data.length || 13) / 32,
        width: (data.width || 6) / 32,
        weight: data.weight,
        traffic: TRAFFIC[name] !== undefined ? TRAFFIC[name] : COMMUTER,
        frames: {},
        //what is lit on it, a flash at a time: [{"x+": picture, ...}]
        lamps: null,
        //and every flash by the way it faces: {"x+": [picture, ...]}
        flashes: null,
        //the light each flash throws round it at night, 0..255, if any
        //(client/lighting)
        glows: data.glows || null,
      };

    Object.keys(data.colors).forEach(function (color) {
      var looks = (type.frames[color] = {});

      Object.keys(data.colors[color]).forEach(function (heading) {
        var f = data.colors[color][heading],
          l = (looks[heading] = look(f));

        l.engine = f.engine;
        l.tailpipe = f.tailpipe;
      });
    });

    if (data.lamps !== undefined) {
      type.lamps = data.lamps.map(function (phase) {
        var pictures = {};

        Object.keys(phase).forEach(function (heading) {
          pictures[heading] = look(phase[heading]);
        });

        return pictures;
      });

      type.flashes = {};
      Object.keys(type.lamps[0]).forEach(function (heading) {
        type.flashes[heading] = type.lamps.map(function (phase) {
          return phase[heading];
        });
      });
    }

    types.push(type);
    total += type.weight;

    //what still runs in the small hours: the vans and the lorries,
    //the cabs and the police
    if (type.traffic === ERRAND) night += type.weight;
  });

  self.types = types;
  self.totalWeight = total;
  self.nightWeight = night;
}

/**
 * The pictures of a body type in a colour, one for each way it drives -
 * {"x+": {sprite, pivotX, pivotY}, ...} - or null when there is no such thing
 * or the vehicles are not loaded.
 */
Carman.prototype.looksOf = function (name, color) {
  var types = this.types || [],
    i;

  for (i = 0; i < types.length; i++)
    if (types[i].name === name) return types[i].frames[color] || null;

  return null;
};

//for anything else that drives the roads the way the traffic does - the
//courier's car (client/delivery)
Carman.routeWaypoints = Traffic.routeWaypoints;
Carman.groundHeight = groundHeight;
Carman.VehicleRenderer = VehicleRenderer;
Carman.LANE = Traffic.LANE;
Carman.routeTo = routeTo;
Carman.ensureStops = ensureStops;

export default Carman;
