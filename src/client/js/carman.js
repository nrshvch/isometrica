import engine from "engine/main";
import Core from "core/main";
import Config from "./config";
import RenderLayer from "./renderlayer";
import Pathfinder from "./pathfinding/pathfinder";
import SmokeSource from "./components/smokesource";
import VTime from "core/vtime";
import CoreConfig from "core/config";
import Vehicles from "data/vehicles";
import BuildingClassCode from "data/classcode";

var Terrain = Core.Terrain;
var SlopeType = Terrain.SlopeType;

//Cars driving about the roads, for the look of it - they carry nothing and
//nobody waits for them.
//
//There is one for every four road tiles that are loaded. Each goes from a
//random road tile to another one it can reach, found with the pathfinder, and
//on from there to the next once it gets there. Whenever the roads under one
//go - demolished, or their chunk unloaded - it is put on some other road.
//
//A car keeps to the right hand side of the road: it drives along a line off
//the middle of the tile, to the right of the way it is going.
//
//Each one is some body type - a sedan, a van, a bus... - in some colour, with
//a picture for each of the four ways it can drive, all out of one image that
//tools/genvehicles.js paints (see data/vehicles.js). Bigger ones drive slower.
//
//Where one goes depends on what it is. A light car drives by the clock: to
//work in the morning, home in the evening, wherever in the afternoon. Between
//midnight and six it is on its way off the roads: it finishes the trip it is
//on, and is taken off when it gets there rather than setting out again. One
//still driving at six carries on and heads to work like the rest.
//
//The buses stop for the night too: one that reaches a stop between midnight
//and six is done, and goes back out in the morning.
//
//A few light cars do go out in the small hours, from anywhere to anywhere, and
//at that time of night they are in a hurry. Those are out for the night: they
//keep driving until it is over, rather than stopping at the first place they
//get to the way the evening's traffic does.
//Vans and lorries are about their own business and go wherever, at any hour.
//A bus is given two stops when it goes out and spends the rest of its day
//going between them. Only the choice of a new destination goes by any of this
//- one already on its way keeps its route.
//
//Now and then one breaks down: it stops where it is, smoke coming out of its
//engine as thick as a chimney's, for a few hours of the game's time, then
//carries on with its trip. The rest of the traffic goes by it the way cars go
//by each other here - straight through. Every one can puff a little smoke out
//of its tailpipe as it drives too - two puffs a second, thinner than a chimney
//- but that is switched off (EXHAUST).
//
//Positions here are in tiles: the middle of tile (x, y) is at (x, y), which is
//where the game puts the tile in the world too, and its edges are half a tile
//off it.

var CARS_PER_ROAD = 1 / 4,
    //how far off the middle of the road a lane is, in tiles
    LANE = 0.15,
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
    //how far a car drives between breakdowns, on average, in tiles
    BREAKDOWN_EVERY = 2000,
    //how long one stands broken down, in hours of the game's time - give or
    //take
    BREAKDOWN_HOURS = 3,
    //whether smoke comes out of the tailpipe as it drives
    EXHAUST = false,
    //how often a puff of it does, ms
    EXHAUST_EVERY = 500,
    //and out of the engine while it stands broken down - as often as out of a
    //chimney
    BREAKDOWN_SMOKE_EVERY = 300;

//game time that goes by in a millisecond of the real thing
var GAME_SPEED = VTime.millisecondsPerTick / CoreConfig.tickDelay,
    HOUR = 3600000;

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
    bus: SHUTTLE
};

function wanted(kind, data) {
    return kind === HOME ?
        data.classCode === BuildingClassCode.house :
        //anywhere anybody works: the shops, the industry, the town hall
        data.jobs > 0;
}

//from this hour to that one, light cars set out from buildings of one kind
//and drive to buildings of the other
var HOURS = [
    {from: 6, to: 12, origin: HOME, kind: WORK},
    {from: 18, to: 24, origin: WORK, kind: HOME}
];

//until this hour a light car that arrives somewhere stays there
var LIGHTS_OUT_UNTIL = 6;

var dy = Terrain.dy;

var position = new Float32Array(3);

//the four ways out of a tile: [dx, dy, tile offset]
var DIRECTIONS = [
    [1, 0, 1],
    [-1, 0, -1],
    [0, 1, dy],
    [0, -1, -dy]
];

/**
 * Which ways a road on this tile can be driven: along x, along y or both. A
 * road on a slope only runs up and down it.
 */
function roadAxes(root, tile) {
    var slope = root.core.terrain.tileSlope(tile);

    if (slope === SlopeType.AB || slope === SlopeType.CD)
        return 2; //along y
    else if (slope === SlopeType.AC || slope === SlopeType.BD)
        return 1; //along x

    return 3;
}

function canDrive(root, from, dir) {
    var to = from + dir[2],
        axis = dir[0] !== 0 ? 1 : 2;

    return root.roadman.getRoad(to) !== null &&
        (roadAxes(root, from) & axis) !== 0 &&
        (roadAxes(root, to) & axis) !== 0;
}

function neighbours(root, tile, out) {
    for (var i = 0; i < DIRECTIONS.length; i++) {
        if (canDrive(root, tile, DIRECTIONS[i]))
            out.push(tile + DIRECTIONS[i][2]);
    }

    return out;
}

function distance(a, b) {
    return Pathfinder.manhattan(Terrain.extractX(a), Terrain.extractY(a), Terrain.extractX(b), Terrain.extractY(b));
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
        tile, i;

    for (var head = 0; head < queue.length && queue.length < REACH; head++) {
        next.length = 0;
        neighbours(root, queue[head], next);

        for (i = 0; i < next.length; i++) {
            tile = next[i];

            if (!seen.has(tile)) {
                seen.add(tile);
                queue.push(tile);
            }
        }
    }

    if (queue.length < 2)
        return -1;

    return queue[1 + (Math.random() * (queue.length - 1) | 0)];
}

//the way from one road tile to another, or an empty array when there is none
function routeTo(root, start, end) {
    return Pathfinder.searchTiles(start, end, function (tile, out) {
        neighbours(root, tile, out);
    }, distance);
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
    var hour = root.core.time.hour, i;

    for (i = 0; i < HOURS.length; i++) {
        if (hour >= HOURS[i].from && hour < HOURS[i].to)
            return HOURS[i];
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
        tiles, end, found, i;

    if (kind !== null) {
        tiles = man.getDestinations(kind);

        for (i = 0; i < DESTINATION_TRIES && tiles.length > 0; i++) {
            end = tiles[Math.random() * tiles.length | 0];

            if (end !== start) {
                found = routeTo(root, start, end);

                if (found.length > 1)
                    return found;
            }
        }
    }

    end = pickDestination(root, start);

    return end === -1 ? [] : routeTo(root, start, end);
}

function direction(from, to) {
    return [Terrain.extractX(to) - Terrain.extractX(from), Terrain.extractY(to) - Terrain.extractY(from)];
}

//to the right of going d, seen from above: +x is up and to the right on the
//screen, +y up and to the left
function rightX(d) {
    return d[1];
}

function rightY(d) {
    return -d[0];
}

function waypoint(out, tile, x, y) {
    out.push({tile: tile, x: x, y: y});
}

/**
 * The points a car drives through along a route, each in its tile's lane.
 * Between two of them it always goes straight along x or y: turning, it drives
 * up to where the lane it is in meets the one it is turning into - short of
 * the middle turning right, past it turning left.
 *
 * @param route {number[]} road tiles
 * @param [from] {number[]} the way the car came into the first tile; it is
 *        already in that lane, just short of the middle. Without it the car
 *        starts in the middle of the first tile, in the lane it leaves by.
 */
function routeWaypoints(route, from) {
    var out = [],
        last = route.length - 1,
        tile, x, y, din, dout, i;

    for (i = 0; i <= last; i++) {
        tile = route[i];
        x = Terrain.extractX(tile);
        y = Terrain.extractY(tile);
        din = i === 0 ? from : direction(route[i - 1], tile);
        dout = i === last ? null : direction(tile, route[i + 1]);

        if (!din) {
            waypoint(out, tile, x + rightX(dout) * LANE, y + rightY(dout) * LANE);
        } else if (!dout || (din[0] === dout[0] && din[1] === dout[1])) {
            waypoint(out, tile, x + rightX(din) * LANE, y + rightY(din) * LANE);
        } else if (din[0] === -dout[0] && din[1] === -dout[1]) {
            //turning round: on past the middle, then over into the other lane
            waypoint(out, tile, x + (rightX(din) + din[0]) * LANE, y + (rightY(din) + din[1]) * LANE);
            waypoint(out, tile, x + (rightX(dout) + din[0]) * LANE, y + (rightY(dout) + din[1]) * LANE);
        } else {
            waypoint(out, tile, x + (rightX(din) + rightX(dout)) * LANE, y + (rightY(din) + rightY(dout)) * LANE);
        }
    }

    return out;
}

/**
 * The height of the ground at a point, in tiles, the way the terrain is drawn:
 * straight between the heights of the tile's corners.
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
        d = terrain.getGridPointHeight(x0 + 1, y0 + 1);

    return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function CarScript(man) {
    engine.Component.call(this);
    this.man = man;
    this.waypoints = [];
}

CarScript.prototype = Object.create(engine.Component.prototype);

CarScript.prototype.man = null;
CarScript.prototype.waypoints = null;
CarScript.prototype.target = 0;
CarScript.prototype.x = 0;
CarScript.prototype.y = 0;
CarScript.prototype.speed = SPEED;
//what it drives at when it is not in a hurry
CarScript.prototype.baseSpeed = SPEED;
//its pictures, one for each way it drives: {"x+": sprite, ...}
CarScript.prototype.looks = null;
CarScript.prototype.heading = null;
CarScript.prototype.traffic = COMMUTER;
//out for a drive in the small hours rather than on its way home for the night
CarScript.prototype.nightRider = false;
CarScript.prototype.type = null;
//a bus's two stops, whichever of them it is not at being where it goes next
CarScript.prototype.stops = null;
//real time left before it drives on again when it has broken down, ms; none
//when it is running
CarScript.prototype.stalled = 0;
//since the last puff of smoke out of it, ms
CarScript.prototype.sinceSmoke = 0;

/**
 * Puts the car on the roads, off on a route. A light car starts where the
 * people in it would be at this hour - outside a house in the morning, outside
 * work in the evening; anything else starts on a road picked at random.
 *
 * @returns {boolean} false when there was no road to put it on
 */
CarScript.prototype.spawn = function (traffic) {
    var man = this.man, root = man.root, origin, tile, route, attempt;

    //it is put on the new road running
    this.stalled = 0;
    //and does not puff in step with everything put out with it
    this.sinceSmoke = Math.random() * EXHAUST_EVERY;
    this.dress(traffic);

    origin = this.traffic === COMMUTER ? originKind(root) : null;

    for (attempt = 0; attempt < 4; attempt++) {
        tile = origin === null ? -1 : man.pickRoadBy(origin);

        //nowhere of that kind to start from, so anywhere will do
        if (tile === -1)
            tile = root.roadman.getRandomRoadTile();

        if (tile === -1)
            return false;

        route = this.nextRoute(tile);

        if (route.length > 1) {
            //a bus keeps the two ends of its first route and runs between them
            if (this.traffic === SHUTTLE)
                this.stops = [route[0], route[route.length - 1]];

            this.waypoints = routeWaypoints(route, null);
            this.target = 1;
            this.x = this.waypoints[0].x;
            this.y = this.waypoints[0].y;
            this.place();

            return true;
        }
    }

    return false;
};

/**
 * Got there. A light car that arrives between midnight and six is off the
 * roads for the night; anything else sets off again from where it stands -
 * one that was still driving at six among them, which now has the morning's
 * run to work ahead of it like any other.
 */
/**
 * Whether it is to be taken off the roads when it gets where it is going. In
 * the small hours the buses stop running and the evening's light cars are done
 * for the day; the few out driving about through the night are not.
 */
CarScript.prototype.retires = function () {
    if (lightAllowed(this.man.root))
        return false;

    return this.traffic === SHUTTLE || (this.traffic === COMMUTER && !this.nightRider);
};

CarScript.prototype.arrive = function () {
    var wps = this.waypoints,
        last = wps[wps.length - 1],
        before = wps[wps.length - 2],
        from = before === undefined || before.tile === last.tile ? null : direction(before.tile, last.tile),
        route, next, i;

    if (this.retires()) {
        this.man.remove(this);
        return;
    }

    route = this.nextRoute(last.tile);

    if (route.length < 2) {
        this.man.respawn(this);
        return;
    }

    //it stands still at the end of the old route, so that is where the new one
    //starts from - no jump onto its first point
    next = routeWaypoints(route, from);
    wps = [{tile: last.tile, x: this.x, y: this.y}];

    for (i = 0; i < next.length; i++)
        wps.push(next[i]);

    this.waypoints = wps;
    this.target = 1;
};

/**
 * Where it goes from here, as road tiles - by the clock for a light car, to
 * the other stop for a bus that has its two, anywhere for the rest.
 */
CarScript.prototype.nextRoute = function (from) {
    var man = this.man;

    //come the morning the night's drivers are off to work like everybody else,
    //and at everybody else's speed
    if (lightAllowed(man.root))
        this.nightRider = false;

    //whoever is out in a light car in the small hours is in no mood to hang about
    this.speed = this.nightRider ? this.baseSpeed * SPEEDING : this.baseSpeed;

    if (this.traffic === SHUTTLE && this.stops !== null)
        return routeTo(man.root, from, this.stops[0] === from ? this.stops[1] : this.stops[0]);

    return findRoute(man, from, this.traffic === COMMUTER ? wantedKind(man.root) : null);
};

/**
 * A body type picked at random - the common ones more often - in a random
 * colour, and the speed that goes with it.
 *
 * @param [traffic] {number} COMMUTER, ERRAND or SHUTTLE to have one of those;
 *        leave it out for any type at all
 */
CarScript.prototype.dress = function (traffic) {
    var type = this.man.pickType(traffic),
        colors = Object.keys(type.frames),
        color = colors[Math.random() * colors.length | 0];

    this.type = type;
    this.looks = type.frames[color];
    this.heading = null;
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
    var wps = this.waypoints,
        last = wps[wps.length - 1],
        before = wps[wps.length - 2],
        route, from, next, i;

    //in the small hours nothing is joined on for a light car on its way home:
    //it drives the last of this route and it is seen to when it gets there
    if (this.retires())
        return;

    route = this.nextRoute(last.tile);

    if (route.length < 2)
        return;

    //the way the car came into the tile it is driving to - the last tile of a
    //route has only the one point, so the one before is in the tile it came from
    from = direction(before.tile, last.tile);
    next = routeWaypoints(route, from);

    //what is behind the car is dropped, and its last point too - the new route
    //starts in that same tile
    wps = wps.slice(this.target - 1, wps.length - 1);

    for (i = 0; i < next.length; i++)
        wps.push(next[i]);

    this.waypoints = wps;
    this.target = 1;
};

/**
 * Stops where it is, smoke coming out of the engine, for a few hours.
 */
CarScript.prototype.breakDown = function () {
    this.stalled = BREAKDOWN_HOURS * HOUR * (0.6 + Math.random() * 0.8) / GAME_SPEED;
};

/**
 * A puff of smoke every so often: out of the tailpipe while it drives, out of
 * the engine, more often, while it stands broken down. Each rises from where
 * it came out, so a car driving leaves a trail of them behind.
 */
CarScript.prototype.smoke = function (dt) {
    var broken = this.stalled > 0,
        frame = this.looks[this.heading],
        at = broken ? frame.engine : frame.tailpipe;

    if (!broken && !EXHAUST)
        return;

    this.sinceSmoke += dt;

    if (this.sinceSmoke < (broken ? BREAKDOWN_SMOKE_EVERY : EXHAUST_EVERY))
        return;

    this.sinceSmoke = 0;
    this.gameObject.transform.getPosition(position);

    SmokeSource.puff(this.gameObject.world,
        position[0] + at[0] * Config.tileSize,
        position[1] + at[1] * Config.tileZStep,
        position[2] + at[2] * Config.tileSize
    );
};

/**
 * Where the car is in the world, and which way round it is drawn.
 */
CarScript.prototype.place = function () {
    var root = this.man.root,
        to = this.waypoints[this.target],
        from = this.waypoints[this.target - 1],
        dx = to.x - from.x,
        dy = to.y - from.y,
        heading = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "x+" : "x-") : (dy > 0 ? "y+" : "y-"),
        renderer, frame;

    if (heading !== this.heading) {
        this.heading = heading;
        frame = this.looks[heading];
        renderer = this.gameObject.spriteRenderer;
        renderer.setSprite(frame.sprite);
        renderer.pivotX = frame.pivotX;
        renderer.pivotY = frame.pivotY;
    }

    this.gameObject.transform.setPosition(
        this.x * Config.tileSize,
        groundHeight(root, this.x, this.y) * Config.tileZStep,
        this.y * Config.tileSize
    );
};

CarScript.prototype.tick = function (time) {
    var roadman = this.man.root.roadman,
        wps = this.waypoints,
        travel = this.speed * time.dt / 1000,
        step = travel,
        wp, dx, dy, d;

    if (wps.length === 0)
        return;

    //the road it is on or heading for is gone
    if (roadman.getRoad(wps[this.target].tile) === null || roadman.getRoad(wps[this.target - 1].tile) === null) {
        this.man.respawn(this);
        return;
    }

    this.smoke(time.dt);

    if (this.stalled > 0) {
        this.stalled -= time.dt;
        return;
    }

    while (step > 0) {
        wp = wps[this.target];
        dx = wp.x - this.x;
        dy = wp.y - this.y;
        d = Math.abs(dx) + Math.abs(dy);

        if (d > step) {
            this.x += dx / d * step;
            this.y += dy / d * step;
            break;
        }

        this.x = wp.x;
        this.y = wp.y;
        step -= d;

        //nothing was joined on, so this is where the route ends
        if (this.target === wps.length - 1) {
            this.arrive();
            return;
        }

        this.target++;

        if (this.target === wps.length - 1) {
            this.extend();
            wps = this.waypoints;
        }
    }

    this.place();

    if (Math.random() < travel / BREAKDOWN_EVERY)
        this.breakDown();
};

function Car(man) {
    engine.GameObject.init(this, "car");

    //on the buildings layer rather than the one named after vehicles: a whole
    //layer is drawn over the one under it, so a car on its own layer goes
    //behind every building there is - including the porch or the fence of one
    //standing behind it, which is drawn over the road in front of it. Among
    //the buildings a car is sorted by where it actually is instead.
    var renderer = new engine.SpriteRenderer();
    renderer.layer = RenderLayer.buildingsLayer;
    this.addComponent(renderer);

    this.car = this.addComponent(new CarScript(man));
}

Car.prototype = Object.create(engine.GameObject.prototype);


function reconcile(self) {
    if (self.types === null)
        return;

    var light = lightAllowed(self.root),
        //as many as the roads take - though in the small hours the buses are
        //not running and the light cars are down to a few tearing about, so
        //what is left is the vans and the lorries
        most = Math.floor(self.root.roadman.getRoadCount() * CARS_PER_ROAD),
        target, cars = self.cars, car, i;

    self.most = most;
    self.speeders = light ? 0 : Math.max(1, Math.round(most * NIGHT_LIGHT_SHARE));

    target = light ? most : Math.floor(most * self.nightWeight / self.totalWeight) + self.speeders;

    //the few light cars of the night have their places kept for them, however
    //much else is out - the rest of the traffic is not turned out for them
    for (i = 0; i < SPAWN_BATCH; i++) {
        if (cars.length >= target && self.countLight() >= self.speeders)
            break;

        car = new Car(self);

        if (!car.car.spawn(self.wantsTraffic()))
            break;

        cars.push(car);
        self.root.game.logic.world.addGameObject(car);
    }

    //only when the roads themselves are gone - the night thins the traffic out
    //by letting the light cars finish and stay where they got to
    while (cars.length > most)
        cars.pop().destroy();
}

function CarManScript(man) {
    engine.Component.call(this);
    this.man = man;
}

CarManScript.prototype = Object.create(engine.Component.prototype);

CarManScript.prototype.elapsed = 0;

CarManScript.prototype.tick = function (time) {
    this.elapsed += time.dt;

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
    //roads by the places people drive to, by kind
    this.destinations = {};
}

Carman.prototype.init = function () {
    var go = new engine.GameObject("carman");
    go.addComponent(new CarManScript(this));
    this.root.game.logic.world.addGameObject(go);

    loadTypes(this);
};

/**
 * Takes the car off the road it is on and puts it on another - or off the map
 * altogether, when there is no road left to put it on.
 */
Carman.prototype.respawn = function (script) {
    if (!script.spawn(this.wantsTraffic()))
        this.remove(script);
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
        return undefined;

    return this.countLight() < this.speeders ? COMMUTER : ERRAND;
};

/**
 * Takes the car off the roads for good. Whatever it is wanted for, another one
 * goes out in its place when there is room for it.
 */
Carman.prototype.remove = function (script) {
    var i = this.cars.indexOf(script.gameObject);

    script.waypoints = [];

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
        tile, building, i, j;

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

    this.destinations[kind] = {tiles: tiles, at: now};

    return tiles;
};

/**
 * A loaded road that runs past a building of that kind, or -1 when there is
 * none - where a light car setting out is put.
 */
Carman.prototype.pickRoadBy = function (kind) {
    var tiles = this.getDestinations(kind);

    return tiles.length === 0 ? -1 : tiles[Math.random() * tiles.length | 0];
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
        type, i;

    for (i = 0; i < types.length; i++) {
        type = types[i];

        if (!allowed(type, traffic))
            continue;

        wanted.push(type);

        if (counts[type.name] < type.weight / this.totalWeight * this.most)
            short.push(type);
    }

    return byWeight(short.length > 0 ? short : wanted);
};

function allowed(type, traffic) {
    return traffic === undefined || type.traffic === traffic;
}

//one of them, the common ones more often
function byWeight(types) {
    var weight = 0, r, i;

    for (i = 0; i < types.length; i++)
        weight += types[i].weight;

    r = Math.random() * weight;

    for (i = 0; i < types.length - 1; i++) {
        r -= types[i].weight;

        if (r < 0)
            break;
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
        name, i;

    for (i = 0; i < types.length; i++)
        counts[types[i].name] = 0;

    for (i = 0; i < cars.length; i++) {
        name = cars[i].car.type.name;
        counts[name]++;
    }

    return counts;
};

/**
 * How many light cars are out right now.
 */
Carman.prototype.countLight = function () {
    var cars = this.cars, n = 0, i;

    for (i = 0; i < cars.length; i++) {
        if (cars[i].car.traffic === COMMUTER)
            n++;
    }

    return n;
};

/**
 * Cuts the pictures out of the vehicles image once it is loaded; no car goes
 * out before that.
 */
function loadTypes(self) {
    var sprites = self.root.sprites,
        image = sprites.getSprite(Vehicles.image);

    sprites.whenReady(image, function () {
        var types = [], total = 0, night = 0;

        Object.keys(Vehicles.types).forEach(function (name) {
            var data = Vehicles.types[name],
                type = {
                    name: name,
                    speed: data.speed,
                    weight: data.weight,
                    traffic: TRAFFIC[name] !== undefined ? TRAFFIC[name] : COMMUTER,
                    frames: {}
                };

            Object.keys(data.colors).forEach(function (color) {
                var looks = type.frames[color] = {};

                Object.keys(data.colors[color]).forEach(function (heading) {
                    var f = data.colors[color][heading],
                        sprite = new engine.SpriteManager.Sprite();

                    sprite.sourceImage = image.sourceImage;
                    sprite.offsetX = image.offsetX + f[0];
                    sprite.offsetY = image.offsetY + f[1];
                    sprite.width = f[2];
                    sprite.height = f[3];

                    looks[heading] = {
                        sprite: sprite,
                        pivotX: f[4],
                        pivotY: f[5],
                        engine: [f[6], f[7], f[8]],
                        tailpipe: [f[9], f[10], f[11]]
                    };
                });
            });

            types.push(type);
            total += type.weight;

            //what still runs in the small hours: the vans and the lorries
            if (type.traffic === ERRAND)
                night += type.weight;
        });

        self.types = types;
        self.totalWeight = total;
        self.nightWeight = night;
    });
}

export default Carman;
