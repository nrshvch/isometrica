/**
 * The traffic testbed: the game's own traffic (src/client/traffic.js) - the
 * same Driver, the same junctions, lanes and routes - run on a few roads of
 * our choosing, with the cars we put on them, where we put them and where
 * they go; no city, no pictures. The lab page (lab/traffic.html) draws it
 * and lets you drive it by hand; tools/traffictest.js runs every scenario
 * (scenarios.js) headless and checks it.
 *
 * As it goes it keeps count of what goes wrong:
 *
 * - a car turning round where the road just goes on - not at a junction,
 *   not at a dead end;
 * - a car standing in the traffic (a queue, a junction, waiting to change
 *   lanes) - for how long, at most;
 * - cars each waiting on the next, round in a ring, all of them standing:
 *   locked;
 * - two cars on top of each other;
 * - a car with no way to where it is going.
 */
import Traffic from "../../src/client/traffic.js";
import Terrain from "../../src/core/terrain.js";
import * as RoadRules from "../../src/core/roadrules.js";

//the kinds of vehicle, as the game has them (shared/gen/vehicles): how long
//and wide, tiles, and how fast, of SPEED tiles a second
export var TYPES = {
  car: { length: 13 / 32, width: 6 / 32, speed: 1 },
  small: { length: 11 / 32, width: 6 / 32, speed: 1 },
  van: { length: 13 / 32, width: 6.5 / 32, speed: 0.9 },
  lorry: { length: 17 / 32, width: 7 / 32, speed: 0.75 },
  truck: { length: 21 / 32, width: 7 / 32, speed: 0.75 },
  bus: { length: 25 / 32, width: 7.5 / 32, speed: 0.7 },
};

var SPEED = 1.4,
  //how often a car sees whether it would be better off in the other lane
  //of a one-way road, ms (client/carman)
  LANE_EVERY = Traffic.Driver.LANE_EVERY,
  //how long a car standing in the traffic is locked, if it is in a ring of
  //them each waiting on the next, ms
  LOCKED_AFTER = 8000;

//a number 0..1 for each call, the same ones for the same seed
function seeded(seed) {
  var s = seed >>> 0 || 1;

  return function () {
    s = (s + 0x6d2b79f5) | 0;

    var t = Math.imul(s ^ (s >>> 15), 1 | s);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------------
 * The roads
 * --------------------------------------------------------------------- */

//one-way roads in a map drawn as text: the way each goes, -x, -y, +x, +y
var ARROWS = { "<": 0, "^": 1, ">": 2, v: 3 };

/**
 * Roads to drive: [x, y, way, height, ramp, stop, material] each - way -1
 * for both ways, else 0..3 for -x, -y, +x, +y; height a number for a flat
 * road, or the four heights of its corners; ramp 1..4 for a ramp, 0 for
 * none (client/road profile); stop 1 for a bus stop on it; material
 * "cobble" or "gravel", asphalt unless said (core/roadrules paceOf).
 */
export function World(roads) {
  var map = new Map();

  roads.forEach(function (r) {
    var tile = Terrain.convertToIndex(r[0], r[1]),
      h = r[3] || 0,
      surface = Array.isArray(h) ? h : [h, h, h, h];

    map.set(tile, {
      tile: tile,
      x: r[0],
      y: r[1],
      way: r[2],
      stop: !!r[5],
      typeCode: r[4] ? r[4] : 91111,
      material: r[6] || "asphalt",
      data: {
        tile: tile,
        look: Object.assign(
          r[2] >= 0 ? { way: r[2] } : {},
          r[6] ? { material: r[6] } : {},
        ),
      },
      surface: function () {
        return surface;
      },
    });
  });

  this.map = map;
  this.roads = roads;
  this.tiles = Array.from(map.keys());
  this.roadman = {
    getRoad: function (tile) {
      return map.get(tile) || null;
    },
  };

  var xs = roads.map(function (r) {
      return r[0];
    }),
    ys = roads.map(function (r) {
      return r[1];
    });

  this.box = [
    Math.min.apply(null, xs),
    Math.min.apply(null, ys),
    Math.max.apply(null, xs),
    Math.max.apply(null, ys),
  ];
}

/**
 * A world from a map drawn as text, a row a line: # a road both ways, S
 * one with a bus stop, c one of cobbles, g one of gravel, < ^ > v a one-way
 * road going -x, -y, +x, +y - the
 * first line the lowest y, the first column the lowest x - anything else
 * nothing. Its tiles start at (x0, y0).
 */
World.fromText = function (rows, x0, y0) {
  var roads = [];

  x0 = x0 === undefined ? 1000 : x0;
  y0 = y0 === undefined ? 1000 : y0;

  rows.forEach(function (row, j) {
    for (var i = 0; i < row.length; i++) {
      var c = row[i];

      if (c === "#") roads.push([x0 + i, y0 + j, -1, 0, 0, 0]);
      else if (c === "S") roads.push([x0 + i, y0 + j, -1, 0, 0, 1]);
      else if (c === "c") roads.push([x0 + i, y0 + j, -1, 0, 0, 0, "cobble"]);
      else if (c === "g") roads.push([x0 + i, y0 + j, -1, 0, 0, 0, "gravel"]);
      else if (ARROWS[c] !== undefined)
        roads.push([x0 + i, y0 + j, ARROWS[c], 0, 0, 0]);
    }
  });

  return new World(roads);
};

World.prototype.tileAt = function (x, y) {
  return Terrain.convertToIndex(x, y);
};

World.prototype.xy = function (tile) {
  return [Terrain.extractX(tile), Terrain.extractY(tile)];
};

/**
 * How many roads a tile is joined up with, whichever way they are driven -
 * 1 a dead end, 2 a road going on, 3 or 4 a junction.
 */
World.prototype.joins = function (tile) {
  return Traffic.joins(this.roadman, tile);
};

//whether the road goes straight through a tile: two roads joined to it,
//across from each other
World.prototype.straight = function (tile) {
  var roadman = this.roadman,
    ways = Traffic.DIRECTIONS.filter(function (d) {
      return (
        Traffic.canDrive(roadman, tile, d) ||
        Traffic.canDrive(roadman, tile + d[2], [-d[0], -d[1], -d[2]])
      );
    });

  return (
    ways.length === 2 &&
    ways[0][0] === -ways[1][0] &&
    ways[0][1] === -ways[1][1]
  );
};

World.prototype.stops = function () {
  var out = [];

  this.map.forEach(function (r) {
    if (r.stop) out.push(r.tile);
  });

  return out;
};

/* ------------------------------------------------------------------------
 * The bed
 * --------------------------------------------------------------------- */

/**
 * The traffic on a world, driven a step at a time (Bed#step), and what has
 * gone wrong with it (Bed#report).
 *
 * @param world {World}
 * @param [seed] {number} for whatever is picked at random - the same seed,
 *        the same run
 */
export function Bed(world, seed) {
  this.world = world;
  this.traffic = new Traffic(world.roadman);
  this.random = seeded(seed || 1);
  this.now = 0;
  this.cars = [];
  this.nextId = 1;
  this.log = [];
  this.counts = {
    arrived: 0,
    uturns: { junction: 0, deadEnd: 0, road: 0 },
    badTurns: [],
    noRoute: [],
    overlaps: [],
    locks: [],
    unplaced: 0,
  };
  this.overlapping = new Map();
  //the kerb spots parked in, or to be, by tile
  this.spots = new Map();
  this.checkedAt = 0;
}

Bed.prototype.note = function (text) {
  this.log.push(Math.round(this.now / 100) / 10 + "s " + text);
  if (this.log.length > 400) this.log.shift();
};

//the way from start to end, coming into start going `from` (Traffic.route)
Bed.prototype.route = function (start, from, end) {
  var roadman = this.world.roadman;

  return Traffic.route(start, from || null, end, function (tile, out) {
    return Traffic.neighbours(roadman, tile, out);
  });
};

//a road tile at random, other than `not`
Bed.prototype.anyTile = function (not) {
  var tiles = this.world.tiles,
    t;

  do t = tiles[(this.random() * tiles.length) | 0];
  while (t === not && tiles.length > 1);

  return t;
};

function tileOf(world, at) {
  return Array.isArray(at) ? world.tileAt(at[0], at[1]) : at;
}

/**
 * Puts a vehicle on the roads.
 *
 * @param spec {Object}
 *        type {string} one of TYPES - "car" unless said
 *        at {number[]|number} where it starts, [x, y] or a tile
 *        to {Array} where it goes, one place after another - [x, y] or
 *          tiles; none for anywhere at random, on and on
 *        then {string} at the last of them: "stop" standing in its lane
 *          (unless said), "park" pulled in at the kerb, "gone" off the
 *          roads, "again" on to anywhere at random, parking a while
 *          between
 *        bus {boolean} a bus going round `to` - the stops - for ever,
 *          standing at each a while, in its lane, to be gone round
 *        dwell {number} how long it stands at a stop, or parks, ms
 *        lanes {boolean} false to keep to the right lane of one-way roads
 * @returns {Object|null} the car, or null where there was no room for it or
 *          no way from there
 */
Bed.prototype.add = function (spec) {
  var world = this.world,
    traffic = this.traffic,
    type = TYPES[spec.type || "car"],
    self = this,
    car = {
      id: this.nextId++,
      spec: spec,
      type: spec.type || "car",
      goals: (spec.to || []).map(function (g) {
        return tileOf(world, g);
      }),
      goal: 0,
      legs: 0,
      stood: 0,
      mostStood: 0,
      dwell: 0,
      sinceLane: 0,
      done: false,
      passed: 0,
    };

  car.bus = !!spec.bus;
  car.lanes = spec.lanes !== false && !car.bus;
  car.driver = new Traffic.Driver(traffic, type.length, type.width, {
    nearEnd: function () {
      self.nearEnd(car);
    },
    end: function () {
      self.end(car);
    },
  });
  car.driver.v0 = SPEED * type.speed;

  var start = tileOf(world, spec.at);

  if (world.roadman.getRoad(start) === null) return null;
  if (car.goals.length === 0) car.goals.push(this.anyTile(start));

  var route = this.route(start, null, car.goals[0]);

  //anywhere at random it can get to
  for (var k = 0; route.length < 2 && !spec.to && k < 8; k++)
    route = this.route(start, null, (car.goals[0] = this.anyTile(start)));

  if (route.length < 2) {
    this.counts.noRoute.push({ car: car.id, from: start, to: car.goals[0] });
    return null;
  }

  var wps = Traffic.routeWaypoints(
    route,
    null,
    this.parksAt(car, 0),
    car.lanes,
  );

  if (!traffic.roomAt(wps[0].x, wps[0].y, car.driver.length)) {
    this.counts.unplaced++;
    return null;
  }

  traffic.add(car.driver);
  car.driver.setPath(wps);
  this.ends(car, 0);
  car.driver.v = car.driver.v0 * 0.5;
  traffic.enter(car.driver);
  this.cars.push(car);
  this.note("#" + car.id + " " + car.type + " on");

  return car;
};

//whether it pulls in at the kerb at the end of leg i - only where the road
//goes straight on, not in a junction or round a bend, where what turns
//would cut through it
//- nor where another is parked, or going to park
Bed.prototype.parksAt = function (car, i) {
  var last = i >= car.goals.length - 1 && !this.endless(car),
    tile = car.goals[i],
    taken = this.spots.get(tile);

  if (
    car.bus ||
    !((last && car.spec.then === "park") || car.spec.then === "again") ||
    !this.world.straight(tile) ||
    (taken !== undefined && taken !== car)
  )
    return false;

  this.spots.set(tile, car);

  return true;
};

//whether it goes on and on, given a new place to go each time
Bed.prototype.endless = function (car) {
  return !car.bus && !car.spec.to;
};

//how it stops at the end of leg i, if it does
Bed.prototype.ends = function (car, i) {
  var d = car.driver,
    last = i >= car.goals.length - 1,
    parks = this.parksAt(car, i);

  d.stopAtEnd = car.bus || parks || (last && !this.endless(car));
  d.pullIn = parks;
};

/**
 * Near the end of its way: on to the next place, if it goes straight on
 * there - joined on now, so it is in the lane for a turn at the start of it.
 */
Bed.prototype.nearEnd = function (car) {
  var d = car.driver;

  if (car.bus || d.stopAtEnd) return;

  var last = d.wps[d.wps.length - 1],
    route = [];

  //anywhere at random it can get to from here, going the way it goes
  if (this.endless(car))
    for (var k = 0; route.length < 2 && k < 8; k++) {
      car.goals[car.goal + 1] = this.anyTile(last.tile);
      route = this.route(last.tile, last.din, car.goals[car.goal + 1]);
    }
  else if (car.goal + 1 < car.goals.length)
    route = this.route(last.tile, last.din, car.goals[car.goal + 1]);
  else return;

  //nowhere: it stops at the end of this, and is taken off the roads there
  if (route.length < 2) {
    this.counts.noRoute.push({
      car: car.id,
      from: last.tile,
      to: car.goals[car.goal + 1],
    });
    car.goals.splice(car.goal + 1);
    car.lost = true;
    d.stopAtEnd = true;
    return;
  }

  car.goal++;
  d.extend(
    Traffic.routeWaypoints(
      route,
      last.din,
      this.parksAt(car, car.goal),
      car.lanes,
      last.lo,
    ),
  );
  this.ends(car, car.goal);
  car.legs++;
  this.counts.arrived++;
};

/**
 * At the end of its way: a bus at its stop, standing a while; parked, a
 * while too; or there.
 */
Bed.prototype.end = function (car) {
  car.arrivedAt = this.now;
  car.legs++;
  this.counts.arrived++;

  if (car.bus) {
    car.driver.passable = true;
    car.dwell = car.spec.dwell === undefined ? 6000 : car.spec.dwell;
    return;
  }

  //parked a while - or, with nowhere to park there, on again
  if (car.spec.then === "again") {
    if (car.driver.parked)
      car.dwell = car.spec.dwell === undefined ? 3000 : car.spec.dwell;
    else if (!this.onward(car)) this.remove(car);
    return;
  }

  //going on and on, and at the end of its way before it was given more of
  //it: on from where it stands, as the game's cars do (client/carman arrive)
  if (this.endless(car) && !car.lost && this.onward(car)) return;

  car.done = true;

  if (car.spec.then === "gone" || car.lost) this.remove(car);
};

//on from where it stands at the end of its way, somewhere new; whether it
//could
Bed.prototype.onward = function (car) {
  var d = car.driver,
    last = d.wps[d.wps.length - 1],
    route = [];

  for (var k = 0; route.length < 2 && k < 8; k++) {
    car.goals = [this.anyTile(last.tile)];
    car.goal = 0;
    route = this.route(last.tile, last.din, car.goals[0]);
  }

  if (route.length < 2) {
    this.counts.noRoute.push({
      car: car.id,
      from: last.tile,
      to: car.goals[0],
    });
    return false;
  }

  d.setPath(
    [{ tile: last.tile, x: d.x, y: d.y, din: last.din, dout: null }].concat(
      Traffic.routeWaypoints(
        route,
        last.din,
        this.parksAt(car, 0),
        car.lanes,
        last.lo,
      ),
    ),
  );
  this.ends(car, 0);

  return true;
};

Bed.prototype.remove = function (car) {
  this.traffic.remove(car.driver);
  this.cars.splice(this.cars.indexOf(car), 1);
  this.note("#" + car.id + " off");
};

//off again from where it stood: a bus to its next stop, a parked car to
//somewhere new
Bed.prototype.goOn = function (car) {
  var d = car.driver,
    here = d.tile(),
    heading = [Math.round(d.hx), Math.round(d.hy)];

  if (car.bus) {
    car.goal = (car.goal + 1) % car.goals.length;

    var route = this.route(here, heading, car.goals[car.goal]);

    if (route.length < 2) {
      this.counts.noRoute.push({
        car: car.id,
        from: here,
        to: car.goals[car.goal],
      });
      car.dwell = 2000;
      return;
    }

    d.driveOn(route, true);
    d.v0 = SPEED * TYPES[car.type].speed;
    return;
  }

  if (!d.canPullOut()) {
    car.dwell = 300;
    return;
  }

  var next = [];

  for (var k = 0; next.length < 2 && k < 8; k++) {
    car.goals = [this.anyTile(here)];
    car.goal = 0;
    next = this.route(here, heading, car.goals[0]);
  }

  if (next.length < 2) {
    this.counts.noRoute.push({ car: car.id, from: here, to: car.goals[0] });
    car.dwell = 2000;
    return;
  }

  this.spots.forEach(function (c, t, all) {
    if (c === car) all.delete(t);
  });

  //parked there a while too, if it can be: on a straight, nobody else's
  var parks = this.parksAt(car, 0);

  d.pullOut(next, parks);
  d.stopAtEnd = true;
  d.pullIn = parks;
};

/**
 * Drives everything on by dt, ms - as the game does a frame: where
 * everything is first, then each one on - and keeps count.
 */
Bed.prototype.step = function (dt) {
  var cars = this.cars,
    i;

  this.now += dt;
  this.traffic.frame(this.now);

  for (i = 0; i < cars.length; i++) {
    var car = cars[i],
      d = car.driver;

    if (car.done || d.wps.length === 0) continue;

    if (car.dwell > 0 && (d.parked || d.standing())) {
      car.dwell -= dt;
      if (car.dwell <= 0) this.goOn(car);
      continue;
    }

    car.sinceLane += dt;
    if (car.lanes && car.sinceLane > LANE_EVERY) {
      car.sinceLane = 0;
      d.switchLane();
    }

    var was = d.target,
      wps = d.wps;

    d.update(dt);

    if (d.wps === wps) this.turns(car, was, d.target);

    var held =
      d.v < 0.05 &&
      (d.held === "queue" || d.held === "junction" || d.held === "merge") &&
      !(d.leader && d.leader.passable);

    car.stood = held ? car.stood + dt : 0;
    car.mostStood = Math.max(car.mostStood, car.stood);
  }

  if (this.now - this.checkedAt >= 250) {
    this.checkedAt = this.now;
    this.overlaps();
    this.locks();
  }
};

//whether a point of a way is one turning it round: back the way it came
function round(p) {
  return (
    !!p &&
    p.din !== null &&
    p.dout !== null &&
    p.din[0] === -p.dout[0] &&
    p.din[1] === -p.dout[1]
  );
}

/**
 * The points of its way it has just gone through: any of them turning it
 * round, counted by where - a junction, three or four roads joined; a dead
 * end, one; else where the road just goes on, noted.
 */
Bed.prototype.turns = function (car, from, to) {
  var wps = car.driver.wps;

  for (var k = from; k < to && k < wps.length; k++) {
    var p = wps[k];

    //once a turn, not once a point of it
    if (!round(p) || (k > 0 && wps[k - 1].tile === p.tile && round(wps[k - 1])))
      continue;

    var joins = this.world.joins(p.tile),
      where = joins >= 3 ? "junction" : joins <= 1 ? "deadEnd" : "road";

    this.counts.uturns[where]++;

    if (where === "road") {
      var xy = this.world.xy(p.tile);

      this.counts.badTurns.push({
        car: car.id,
        type: car.type,
        x: xy[0],
        y: xy[1],
        at: this.now,
      });
      this.note("#" + car.id + " turned round at " + xy + ", mid-road");
    }
  }
};

//the corners of a car, a little smaller than it is
function corners(d, shrink) {
  var l = (d.length / 2) * shrink,
    w = (d.width / 2) * shrink,
    hx = d.hx,
    hy = d.hy;

  return [
    [d.x + hx * l - hy * w, d.y + hy * l + hx * w],
    [d.x + hx * l + hy * w, d.y + hy * l - hx * w],
    [d.x - hx * l + hy * w, d.y - hy * l - hx * w],
    [d.x - hx * l - hy * w, d.y - hy * l + hx * w],
  ];
}

function apart(a, b) {
  var axes = [a, b].flatMap(function (c) {
    return [
      [c[1][0] - c[0][0], c[1][1] - c[0][1]],
      [c[3][0] - c[0][0], c[3][1] - c[0][1]],
    ];
  });

  return axes.some(function (ax) {
    var pa = a.map(function (p) {
        return p[0] * ax[0] + p[1] * ax[1];
      }),
      pb = b.map(function (p) {
        return p[0] * ax[0] + p[1] * ax[1];
      });

    return (
      Math.max.apply(null, pa) < Math.min.apply(null, pb) ||
      Math.max.apply(null, pb) < Math.min.apply(null, pa)
    );
  });
}

/**
 * Any two cars on top of each other - the middle 80% of each - counted once
 * each time they come to be.
 */
Bed.prototype.overlaps = function () {
  var cars = this.cars.filter(function (c) {
      return !c.done && c.driver.wps.length > 0;
    }),
    now = new Map(),
    i,
    j;

  for (i = 0; i < cars.length; i++)
    for (j = i + 1; j < cars.length; j++) {
      var a = cars[i].driver,
        b = cars[j].driver;

      if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) continue;
      if (a.parked && b.parked) continue;
      if (apart(corners(a, 0.8), corners(b, 0.8))) continue;

      var key = cars[i].id + "-" + cars[j].id;

      now.set(key, true);

      if (!this.overlapping.has(key)) {
        this.counts.overlaps.push({
          cars: [cars[i].id, cars[j].id],
          x: +a.x.toFixed(2),
          y: +a.y.toFixed(2),
          at: this.now,
        });
        this.note(
          "#" + cars[i].id + " and #" + cars[j].id + " on top of each other",
        );
      }
    }

  this.overlapping = now;
};

/**
 * Rings of cars each standing, waiting on the next: locked. Noted once
 * each.
 */
Bed.prototype.locks = function () {
  var standing = new Map(),
    self = this;

  this.cars.forEach(function (c) {
    if (c.stood > LOCKED_AFTER) standing.set(c.driver, c);
  });

  standing.forEach(function (c, d) {
    var ring = [d],
      x = d.leader;

    while (x && standing.has(x) && ring.indexOf(x) === -1) {
      ring.push(x);
      x = x.leader;
    }

    if (x !== d || ring.length < 2) return;

    var key = ring
      .map(function (r) {
        return standing.get(r).id;
      })
      .sort(function (a, b) {
        return a - b;
      })
      .join(",");

    if (
      self.counts.locks.some(function (l) {
        return l.cars === key;
      })
    )
      return;

    self.counts.locks.push({
      cars: key,
      x: +d.x.toFixed(2),
      y: +d.y.toFixed(2),
      at: self.now,
    });
    self.note("locked: #" + key.split(",").join(" #"));
  });
};

/**
 * Runs it on for ms, in steps as long as a frame.
 */
Bed.prototype.run = function (ms, frame) {
  frame = frame || 33;

  for (var t = 0; t < ms; t += frame) this.step(frame);

  return this;
};

/**
 * What happened: how many places got to, turning round where, the longest
 * any one stood in the traffic, rings locked, cars on top of each other,
 * places with no way to them.
 */
Bed.prototype.report = function () {
  var c = this.counts,
    most = 0,
    who = null;

  this.cars.forEach(function (car) {
    if (car.mostStood > most) {
      most = car.mostStood;
      who = car;
    }
  });

  return {
    seconds: Math.round(this.now / 1000),
    cars: this.cars.length,
    arrived: c.arrived,
    uturns: c.uturns,
    badTurns: c.badTurns,
    mostStood: Math.round(most / 100) / 10,
    mostStoodBy: who && {
      id: who.id,
      type: who.type,
      at: [+who.driver.x.toFixed(2), +who.driver.y.toFixed(2)],
      held: who.driver.held,
    },
    locks: c.locks,
    overlaps: c.overlaps,
    noRoute: c.noRoute,
    unplaced: c.unplaced,
  };
};

Bed.TYPES = TYPES;
Bed.World = World;
Bed.RoadRules = RoadRules;
