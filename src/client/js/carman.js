import engine from "engine/main";
import Core from "core/main";
import Config from "./config";
import RenderLayer from "./renderlayer";
import Pathfinder from "./pathfinding/pathfinder";
import Vehicles from "data/vehicles";

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
    SPAWN_BATCH = 8;

var dy = Terrain.dy;

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

/**
 * Road tiles from start to some other one it is connected to, both included,
 * or an empty array when there is nowhere to go.
 */
function findRoute(root, start) {
    var end = pickDestination(root, start);

    if (end === -1)
        return [];

    return Pathfinder.searchTiles(start, end, function (tile, out) {
        neighbours(root, tile, out);
    }, distance);
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
//its pictures, one for each way it drives: {"x+": sprite, ...}
CarScript.prototype.looks = null;
CarScript.prototype.heading = null;

/**
 * Puts the car on a road tile picked at random, off on a route from it.
 *
 * @returns {boolean} false when there was no road to put it on
 */
CarScript.prototype.spawn = function () {
    var root = this.man.root, tile, route, attempt;

    for (attempt = 0; attempt < 4; attempt++) {
        tile = root.roadman.getRandomRoadTile();

        if (tile === -1)
            return false;

        route = findRoute(root, tile);

        if (route.length > 1) {
            this.waypoints = routeWaypoints(route, null);
            this.target = 1;
            this.x = this.waypoints[0].x;
            this.y = this.waypoints[0].y;
            this.dress();
            this.place();

            return true;
        }
    }

    return false;
};

/**
 * A body type picked at random - the common ones more often - in a random
 * colour, and the speed that goes with it.
 */
CarScript.prototype.dress = function () {
    var type = this.man.pickType(),
        colors = Object.keys(type.frames),
        color = colors[Math.random() * colors.length | 0];

    this.looks = type.frames[color];
    this.heading = null;
    this.speed = SPEED * type.speed * (0.9 + Math.random() * 0.2);
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
        route = findRoute(this.man.root, last.tile),
        from, next, i;

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
        step = this.speed * time.dt / 1000,
        wp, dx, dy, d;

    if (wps.length === 0)
        return;

    //the road it is on or heading for is gone
    if (roadman.getRoad(wps[this.target].tile) === null || roadman.getRoad(wps[this.target - 1].tile) === null) {
        this.man.respawn(this);
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

        if (this.target === wps.length - 1) {
            //there was nowhere to go on to from here
            this.man.respawn(this);
            return;
        }

        this.target++;

        if (this.target === wps.length - 1) {
            this.extend();
            wps = this.waypoints;
        }
    }

    this.place();
};

function Car(man) {
    engine.GameObject.init(this, "car");

    var renderer = new engine.SpriteRenderer();
    renderer.layer = RenderLayer.vehiclesLayer;
    this.addComponent(renderer);

    this.car = this.addComponent(new CarScript(man));
}

Car.prototype = Object.create(engine.GameObject.prototype);

function reconcile(self) {
    if (self.types === null)
        return;

    var target = Math.floor(self.root.roadman.getRoadCount() * CARS_PER_ROAD),
        cars = self.cars,
        car, i;

    for (i = 0; i < SPAWN_BATCH && cars.length < target; i++) {
        car = new Car(self);

        if (!car.car.spawn())
            break;

        cars.push(car);
        self.root.game.logic.world.addGameObject(car);
    }

    while (cars.length > target)
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
    if (script.spawn())
        return;

    script.waypoints = [];

    var i = this.cars.indexOf(script.gameObject);

    if (i !== -1) {
        this.cars.splice(i, 1);
        script.gameObject.destroy();
    }
};

/**
 * A body type, picked by how common it is.
 */
Carman.prototype.pickType = function () {
    var types = this.types,
        r = Math.random() * this.totalWeight,
        i;

    for (i = 0; i < types.length - 1; i++) {
        r -= types[i].weight;

        if (r < 0)
            break;
    }

    return types[i];
};

/**
 * Cuts the pictures out of the vehicles image once it is loaded; no car goes
 * out before that.
 */
function loadTypes(self) {
    var sprites = self.root.sprites,
        image = sprites.getSprite(Vehicles.image);

    sprites.whenReady(image, function () {
        var types = [], total = 0;

        Object.keys(Vehicles.types).forEach(function (name) {
            var data = Vehicles.types[name],
                type = {name: name, speed: data.speed, weight: data.weight, frames: {}};

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

                    looks[heading] = {sprite: sprite, pivotX: f[4], pivotY: f[5]};
                });
            });

            types.push(type);
            total += type.weight;
        });

        self.types = types;
        self.totalWeight = total;
    });
}

export default Carman;
