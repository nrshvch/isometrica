import Terrain from "./terrain";
import TerrainType from "./terraintype";
import { NumMap, Store } from "shared/typed";

/**
 * The bulldozers clearing ground and bringing down what is being
 * demolished, as records: a row a bulldozer, the tiles still to get to, and
 * every tile waiting for one. Stepped by whoever has the clock (client/
 * clearworks, by region and tier), by any stretch of time in one go; what a
 * bulldozer does - a tile cleared, a tile of a building down - is done here,
 * whether anyone sees it or not, and saved with the city.
 * See isometrica/.claude/skills/buildings/going-up.md (The bulldozers as
 * records).
 */

//how many tiles of a stretch a bulldozer takes on, at most
var SHARE = 6;

//how fast a bulldozer drives, tiles a second; and on every tile it gets to,
//how far it backs up and pushes on over it again, tiles, and how long that
//takes, ms
var DRIVE = 0.9,
  SHOVE = 0.3,
  SHOVE_MS = 1400;

//how far ahead of its middle its blade is, tiles: what is on a tile goes as
//the blade gets there; how far off a tile's middle it is when it comes up
//to it, for a building there to come down (knock); and how near it comes
//to a tile not to be driven onto yet
var BLADE = 0.25,
  KNOCK = 0.85,
  WAIT_OFF = 1.05;

//how long a bulldozer takes to come out of its dust, and to go off into it,
//ms
var FADE_MS = 600;

//how long a tile of a building takes to come down, ms, with nobody to show
//it (a demolition in sight says how long its own does: client/demolition)
var KNOCK_MS = 2400;

//how often the tiles waiting are looked over for anything built on them
//meanwhile, which has whatever stood there go at once, ms
var LOOK_EVERY = 500;

//how long a bulldozer goes unstepped at most, ms: one asleep is brought up
//to date this often, so what it does is done on time give or take this
var DUE_EVERY = 1000;

//how much time gone by a save is brought up to date for at most, ms
var MOST_AWAY = 86400000;

//what a bulldozer is doing
var DRIVING = 0,
  WAITING = 1,
  SHOVING = 2,
  LEAVING = 3;

//the eight headings round from +x (client/view ROUND), and each one's way
//along the ground, a unit long
var S = Math.SQRT1_2,
  HX = [1, S, 0, -S, -1, -S, 0, S],
  HY = [0, S, 1, S, 0, -S, -1, -S];

//the tiles round a tile, sides and corners
var AROUND = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

//the nearest of the eight headings to going dx, dy; -1 for nowhere
function headingOf(dx, dy) {
  if (dx === 0 && dy === 0) return -1;

  return (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
}

//a tile as a key of a NumMap (keys are not negative)
function key(tile) {
  return tile >>> 0;
}

/**
 * @param world {Logic} its terrain and buildings
 */
function Works(world) {
  this.world = world;
  //the works' own time, ms - moved on by whoever steps them (#tick)
  this.clock = 0;
  this.looked = 0;
  //a row a bulldozer: where it is (tiles), its heading (HX), what it is
  //doing and how far into it, ms, how long it has been out, ms, the tile it
  //is on (shoving) and the one it got to last, and when it was last stepped
  //(the clock)
  this.store = Store(
    {
      x: Float64Array,
      y: Float64Array,
      heading: Uint8Array,
      phase: Uint8Array,
      t: Float64Array,
      age: Float64Array,
      on: Float64Array,
      got: Float64Array,
      at: Float64Array,
    },
    16,
  );
  //the tiles each still has to get to, by its slot, in order
  this.queues = [];
  //every tile cleared no bulldozer has got to yet: till when on the clock
  //none may drive onto it - -1 till one has come up to it (knock)
  this.waiting = NumMap(64);
  //whoever shows it: told of a bulldozer out (added), going (leaving) and
  //gone (removed); asked how long what stands on a tile takes to come down
  //as one comes up to it (knocked: ms, or -1 for none shown); told as its
  //blade gets to a tile, before what was there is gone in the world
  //(reaching), and after (reached)
  this.view = null;
}

Works.HEADINGS = ["x+", "x+y+", "y+", "x-y+", "x-", "x-y-", "y-", "x+y-"];
Works.headingOf = headingOf;
Works.DRIVING = DRIVING;
Works.WAITING = WAITING;
Works.SHOVING = SHOVING;
Works.LEAVING = LEAVING;
Works.FADE_MS = FADE_MS;
Works.SHOVE_MS = SHOVE_MS;
Works.SHOVE = SHOVE;
Works.BLADE = BLADE;
Works.DUE_EVERY = DUE_EVERY;

/**
 * Clears tiles - clear(tile) clearing each in the world (core/city
 * clearTile), saying which tiles it cleared - and has the bulldozers out to
 * them.
 *
 * @param tiles {number[]}
 * @param clear {function(number): number[]}
 * @returns {number[]} the tiles cleared
 */
Works.prototype.clear = function (tiles, clear) {
  var cleared = [],
    self = this;

  tiles.forEach(function (tile) {
    clear(tile).forEach(function (t) {
      wait(self, t);
      cleared.push(t);
    });
  });

  if (cleared.length > 0) crew(this, cleared);

  return cleared;
};

/**
 * Has the bulldozers out to the tiles a building is to go up on
 * (core/city/citybuildings buildBuilding): every one of them swept, bare or
 * not, before it goes up.
 *
 * @param tiles {number[]}
 */
Works.prototype.sweep = function (tiles) {
  var self = this;

  tiles.forEach(function (tile) {
    wait(self, tile);
  });

  if (tiles.length > 0) crew(this, tiles);
};

function wait(self, tile) {
  if (!self.waiting.has(key(tile))) self.waiting.set(key(tile), -1);
}

//whether a tile waits for a bulldozer
Works.prototype.waits = function (tile) {
  return this.waiting.has(key(tile));
};

//whether a bulldozer has come up to a tile waiting, what stands there
//coming down (knock)
Works.prototype.knocked = function (tile) {
  return this.waiting.get(key(tile), -1) >= 0;
};

/**
 * Moves the works' clock on, ms - looking over the tiles waiting now and
 * then, and bringing any bulldozer not stepped for a while up to date
 * (DUE_EVERY): one whose region nobody looks at goes on all the same.
 */
Works.prototype.tick = function (dt) {
  this.clock += dt;
  this.looked += dt;
  if (this.looked >= LOOK_EVERY) {
    this.looked = 0;
    builtOver(this);
  }

  var store = this.store,
    at = store.cols.at,
    due = this.clock - DUE_EVERY;

  //from the last: a row done is taken out by moving the last one into it
  for (var i = store.count - 1; i >= 0; i--) {
    var slot = store.live[i];

    if (at[slot] <= due) this.advance(slot, this.clock);
  }
};

/**
 * Brings a bulldozer up to time on the clock, however long since it was
 * last: driving, coming up to tiles and waiting there, pushing over them,
 * going - all of it in one go.
 *
 * @returns {boolean} whether it is still out
 */
Works.prototype.advance = function (slot, to) {
  var cols = this.store.cols,
    dt = to - cols.at[slot];

  cols.at[slot] = to;
  if (dt > 0) return step(this, slot, to - dt, dt);

  return true;
};

//how many bulldozers there are, and tiles waiting for one
Works.prototype.count = function () {
  return this.store.count;
};

Works.prototype.waitingCount = function () {
  return this.waiting.size;
};

/**
 * Moves a bulldozer on by dt from time on the clock: each thing it does
 * taken to where it ends, or as far as dt goes.
 */
function step(self, slot, time, dt) {
  var cols = self.store.cols,
    queue = self.queues[slot],
    waiting = self.waiting;

  cols.age[slot] += dt;

  for (var guard = 0; guard < 100000; guard++) {
    var phase = cols.phase[slot];

    if (phase === LEAVING) {
      var go = FADE_MS - cols.t[slot];

      if (dt < go) {
        cols.t[slot] += dt;
        return true;
      }

      remove(self, slot);
      return false;
    }

    if (phase === SHOVING) {
      var on = cols.on[slot],
        rest = SHOVE_MS - cols.t[slot],
        h = cols.heading[slot],
        k,
        back;

      if (dt < rest) {
        cols.t[slot] += dt;
        k = cols.t[slot] / SHOVE_MS;
        back = SHOVE * Math.sin(Math.PI * k);
        cols.x[slot] = Terrain.extractX(on) - HX[h] * back;
        cols.y[slot] = Terrain.extractY(on) - HY[h] * back;
        return true;
      }

      dt -= rest;
      time += rest;
      cols.x[slot] = Terrain.extractX(on);
      cols.y[slot] = Terrain.extractY(on);
      cols.phase[slot] = DRIVING;
      cols.t[slot] = 0;
      continue;
    }

    //what it has to get to, leaving out what was got to some other way
    while (
      queue.length > 0 &&
      !waiting.has(key(queue[0])) &&
      cols.got[slot] !== queue[0]
    )
      queue.shift();

    if (queue.length === 0) {
      cols.phase[slot] = LEAVING;
      cols.t[slot] = 0;
      if (self.view !== null) self.view.leaving(slot);
      continue;
    }

    var next = queue[0],
      dx = Terrain.extractX(next) - cols.x[slot],
      dy = Terrain.extractY(next) - cols.y[slot],
      left = Math.hypot(dx, dy),
      until = waiting.get(key(next), -1);

    if (phase === WAITING) {
      var hold = until - time;

      if (hold > 0 && dt < hold) return true;

      if (hold > 0) {
        dt -= hold;
        time += hold;
      }
      cols.phase[slot] = DRIVING;
      continue;
    }

    if (left > 0.01) cols.heading[slot] = headingOf(dx, dy);

    //come up to it: whatever is to come down there comes down
    if (left <= KNOCK + 1e-9 && until === -1 && waiting.has(key(next))) {
      knock(self, next, cols.heading[slot], time);
      until = waiting.get(key(next), -1);
    }

    //a tile off whatever is still coming down there, it waits
    if (left <= WAIT_OFF && until > time) {
      cols.phase[slot] = WAITING;
      continue;
    }

    //the blade gets to what stands there
    if (left <= BLADE + 1e-9 && cols.got[slot] !== next) {
      cols.got[slot] = next;
      reach(self, next, cols.heading[slot]);
      continue;
    }

    if (left <= 1e-9) {
      cols.x[slot] = Terrain.extractX(next);
      cols.y[slot] = Terrain.extractY(next);
      if (cols.got[slot] !== next) {
        cols.got[slot] = next;
        reach(self, next, cols.heading[slot]);
      }
      queue.shift();
      cols.on[slot] = next;
      cols.phase[slot] = SHOVING;
      cols.t[slot] = 0;
      continue;
    }

    if (dt <= 0) return true;

    //as far as the next thing that happens on the way, or dt takes it
    var stop = 0;

    if (cols.got[slot] !== next && left > BLADE) stop = BLADE;
    if (until === -1 && left > KNOCK && waiting.has(key(next))) stop = KNOCK;
    if (until > time && left > WAIT_OFF) stop = WAIT_OFF;

    var need = ((left - stop) / DRIVE) * 1000,
      by;

    if (need <= dt) {
      by = left - stop;
      dt -= need;
      time += need;
    } else {
      by = (DRIVE * dt) / 1000;
      dt = 0;
    }

    if (left - by <= 1e-9) {
      cols.x[slot] = Terrain.extractX(next);
      cols.y[slot] = Terrain.extractY(next);
    } else {
      cols.x[slot] += (dx / left) * by;
      cols.y[slot] += (dy / left) * by;
    }
  }

  return true;
}

/**
 * A bulldozer has come up to a tile, pushing on heading: what stands there
 * comes down, and none drives onto it till it has - as long as whoever
 * shows it says it takes, or KNOCK_MS for a building with nobody to.
 */
function knock(self, tile, heading, time) {
  var shown = self.view !== null ? self.view.knocked(tile, heading) : -1,
    b = self.world.buildingService.get(tile),
    takes =
      shown >= 0
        ? shown
        : b !== null && b.demolishing && !b.isDown(tile)
          ? KNOCK_MS
          : 0;

  self.waiting.set(key(tile), time + takes);
}

/**
 * A bulldozer's blade got to a tile, pushing on heading (-1 for something
 * built on it meanwhile): the tile is free to build on again and bare - a
 * building being demolished one tile further down.
 */
function reach(self, tile, heading) {
  if (!self.waiting.has(key(tile))) return;

  self.waiting.delete(key(tile));
  if (self.view !== null) self.view.reaching(tile, heading);

  var b = self.world.buildingService.get(tile),
    city = b !== null && b.demolishing ? b.getCity() : null;

  if (city !== null) city.tileDown(tile);
  self.world.terrain.endClearing(tile);
  if (self.view !== null) self.view.reached(tile);
}

/**
 * Whatever stood on a tile waiting goes at once once anything is built on it
 * - a building site, a road - rather than stand in the middle of it till the
 * bulldozer gets there; and the bulldozer leaves that tile out. A building
 * being demolished is no such thing: it stands there till it is down; nor
 * is one waiting for this very ground to be cleared before it goes up.
 */
function builtOver(self) {
  var buildings = self.world.buildingService,
    over = [];

  self.waiting.forEach(function (k) {
    var tile = k | 0,
      b = buildings.get(tile);

    if (b !== null && !b.demolishing && !(b.clearing && b.clearing()))
      over.push(tile);
  });

  over.forEach(function (tile) {
    reach(self, tile, -1);
  });
}

/**
 * Has bulldozers out to the stretches of ground the tiles just cleared are
 * in - each the whole of what is waiting that hangs together with them.
 */
function crew(self, fresh) {
  var seen = {};

  fresh.forEach(function (tile) {
    if (seen[tile] !== true) share(self, stretchOf(self, tile, seen));
  });
}

//every tile waiting that hangs together with start, corners touching
function stretchOf(self, start, seen) {
  var tiles = [start],
    open = [start];

  seen[start] = true;

  while (open.length > 0) {
    var tile = open.pop(),
      x = Terrain.extractX(tile),
      y = Terrain.extractY(tile);

    AROUND.forEach(function (d) {
      var t = Terrain.convertToIndex(x + d[0], y + d[1]);

      if (!self.waiting.has(key(t)) || seen[t] === true) return;

      seen[t] = true;
      tiles.push(t);
      open.push(t);
    });
  }

  return tiles;
}

/**
 * The way a stretch is swept: a row at a time along the longer way of it,
 * every other row back the other way.
 */
function sweepOf(tiles) {
  var x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    y1 = -Infinity;

  tiles.forEach(function (tile) {
    var x = Terrain.extractX(tile),
      y = Terrain.extractY(tile);

    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  });

  //rows along x, or along y: a and b along and across them
  var alongX = x1 - x0 >= y1 - y0;

  function a(tile) {
    return alongX ? Terrain.extractX(tile) : Terrain.extractY(tile);
  }

  function b(tile) {
    return alongX ? Terrain.extractY(tile) : Terrain.extractX(tile);
  }

  return tiles.slice().sort(function (p, q) {
    var row = b(p) - b(q);

    if (row !== 0) return row;

    //back the other way every other row
    return (b(p) - (alongX ? y0 : x0)) % 2 === 0 ? a(p) - a(q) : a(q) - a(p);
  });
}

/**
 * Shares a stretch out among the bulldozers: the way it is swept cut into
 * as many shares as it needs - or as there are at it already - each to the
 * one nearest to it of those already at it, who leave off wherever they
 * were, and to a new one for each share left.
 */
function share(self, tiles) {
  var path = sweepOf(tiles),
    inStretch = {},
    shares = [],
    pairs = [],
    store = self.store,
    at = [],
    n,
    i;

  tiles.forEach(function (tile) {
    inStretch[tile] = true;
  });

  //at it already: with any of its tiles still to get to
  for (i = 0; i < store.count; i++) {
    var slot = store.live[i];

    if (
      store.cols.phase[slot] !== LEAVING &&
      self.queues[slot].some(function (tile) {
        return inStretch[tile] === true;
      })
    )
      at.push(slot);
  }

  n = Math.max(at.length, Math.ceil(path.length / SHARE));

  for (i = 0; i < n; i++)
    shares.push(
      path.slice(
        Math.round((i * path.length) / n),
        Math.round(((i + 1) * path.length) / n),
      ),
    );

  shares = shares.filter(function (s) {
    return s.length > 0;
  });

  //the nearest of them first, each to one share
  at.forEach(function (d) {
    shares.forEach(function (s, k) {
      pairs.push({ dozer: d, share: k, far: farTo(self, d, s) });
    });
  });
  pairs.sort(function (p, q) {
    return p.far - q.far;
  });

  var given = {},
    busy = [];

  pairs.forEach(function (p) {
    if (given[p.share] === true || busy.indexOf(p.dozer) !== -1) return;

    var s = shares[p.share],
      //whatever it had to get to besides, off this stretch, after it
      rest = self.queues[p.dozer].filter(function (tile) {
        return inStretch[tile] !== true;
      });

    given[p.share] = true;
    busy.push(p.dozer);
    self.queues[p.dozer] = nearEndFirst(self, p.dozer, s).concat(rest);
  });

  //any at it with no share - fewer shares than tiles - off to whatever else
  //it had, or done
  at.forEach(function (d) {
    if (busy.indexOf(d) === -1)
      self.queues[d] = self.queues[d].filter(function (tile) {
        return inStretch[tile] !== true;
      });
  });

  shares.forEach(function (s, k) {
    if (given[k] !== true) dozer(self, s);
  });
}

//how far a bulldozer is from the nearer end of a share
function farTo(self, d, s) {
  return Math.min(far(self, d, s[0]), far(self, d, s[s.length - 1]));
}

function far(self, d, tile) {
  var cols = self.store.cols;

  return Math.hypot(
    Terrain.extractX(tile) - cols.x[d],
    Terrain.extractY(tile) - cols.y[d],
  );
}

//a share, from whichever end of it the bulldozer is nearer
function nearEndFirst(self, d, s) {
  return far(self, d, s[s.length - 1]) < far(self, d, s[0])
    ? s.slice().reverse()
    : s;
}

/**
 * A new bulldozer for a share, coming out of its dust a tile off where it
 * starts - on the side away from where it goes next, on land - to drive on
 * to it.
 */
function dozer(self, queue) {
  var tile = queue[0],
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    next = queue.length > 1 ? queue[1] : tile,
    away = [
      Math.sign(x - Terrain.extractX(next)),
      Math.sign(y - Terrain.extractY(next)),
    ],
    terrain = self.world.terrain,
    from = [x, y],
    tries = [away].concat(AROUND.slice(0, 4));

  //coming the way the sweep goes - or from any side of it there is land on
  for (var i = 0; i < tries.length; i++) {
    var w = tries[i];

    if (w[0] === 0 && w[1] === 0) continue;

    if (
      terrain.getTerrainType(x + w[0], y + w[1]) !== TerrainType.water &&
      !self.waiting.has(key(Terrain.convertToIndex(x + w[0], y + w[1])))
    ) {
      from = [x + w[0], y + w[1]];
      break;
    }
  }

  var h = headingOf(x - from[0], y - from[1]);

  return add(self, {
    x: from[0],
    y: from[1],
    heading: h === -1 ? 0 : h,
    phase: DRIVING,
    t: 0,
    age: 0,
    on: -1,
    got: -1,
    queue: queue,
  });
}

//a row for a bulldozer, stepped from now
function add(self, d) {
  var store = self.store,
    slot = store.slot(store.add()),
    cols = store.cols;

  cols.x[slot] = d.x;
  cols.y[slot] = d.y;
  cols.heading[slot] = d.heading;
  cols.phase[slot] = d.phase;
  cols.t[slot] = d.t;
  cols.age[slot] = d.age;
  cols.on[slot] = d.on;
  cols.got[slot] = d.got;
  cols.at[slot] = self.clock;
  self.queues[slot] = d.queue;

  if (self.view !== null) self.view.added(slot);

  return slot;
}

function remove(self, slot) {
  self.store.remove(self.store.handle(slot));
  self.queues[slot] = null;
  if (self.view !== null) self.view.removed(slot);
}

/**
 * The bulldozers out and the tiles waiting for them, as they go into the
 * city's save (core/persistence/citypersistence), times as they stand to
 * the clock - each as far as it was last stepped, and how long ago that
 * was: stepped now, it might do what the city saved before it has not.
 */
Works.prototype.save = function () {
  var store = this.store,
    cols = store.cols,
    clock = this.clock,
    dozers = [],
    waiting = [],
    i;

  for (i = 0; i < store.count; i++) {
    var slot = store.live[i];

    //going off into its dust: done
    if (cols.phase[slot] === LEAVING) continue;

    dozers.push([
      cols.x[slot],
      cols.y[slot],
      cols.heading[slot],
      cols.phase[slot],
      cols.t[slot],
      cols.age[slot],
      cols.on[slot],
      cols.got[slot],
      this.queues[slot].slice(),
      cols.at[slot] - clock,
    ]);
  }

  this.waiting.forEach(function (k, until) {
    waiting.push([k | 0, until < 0 ? -1 : until - clock]);
  });

  return { dozers: dozers, waiting: waiting };
};

/**
 * Puts the works back the way #save left them - the tiles waiting being
 * cleared again (core/terrain beingCleared) - and brings them up to date
 * for the time since, ms: what they would have done meanwhile done. A
 * building being demolished with tiles standing no bulldozer is coming to
 * (a save from before they were kept) has them sent.
 *
 * @param data {Object|null} what #save gave, or null for none
 * @param away {number} ms
 */
Works.prototype.load = function (data, away) {
  var self = this,
    terrain = this.world.terrain,
    buildings = this.world.buildingService.buildings || {},
    left = [];

  data = data || {};

  (data.waiting || []).forEach(function (w) {
    self.waiting.set(key(w[0]), w[1] < 0 ? -1 : self.clock + w[1]);
    terrain.startClearing(w[0]);
  });

  (data.dozers || []).forEach(function (d) {
    var slot = add(self, {
      x: d[0],
      y: d[1],
      heading: d[2],
      phase: d[3],
      t: d[4],
      age: d[5],
      on: d[6],
      got: d[7],
      queue: d[8].slice(),
    });
    //as far behind as it was
    if (d[9] < 0) self.store.cols.at[slot] += d[9];
  });

  for (var id in buildings)
    if (buildings[id].demolishing)
      buildings[id].tilesLeft().forEach(function (t) {
        if (!self.waits(t)) left.push(t);
      });
  left.forEach(function (t) {
    terrain.startClearing(t);
  });
  if (left.length > 0) this.sweep(left);

  this.catchUp(away);
};

/**
 * Brings the works on by ms of time gone by at once - a save opened again
 * (#load): bulldozers done meanwhile are gone, and what they did is done.
 */
Works.prototype.catchUp = function (ms) {
  var store = this.store,
    by = Math.min(MOST_AWAY, ms > 0 ? ms : 0);

  this.clock += by;
  for (var i = store.count - 1; i >= 0; i--)
    this.advance(store.live[i], this.clock);

  //ground built over meanwhile, or with no bulldozer on its way to it any
  //more: cleared
  builtOver(this);

  var queued = {},
    self = this,
    orphans = [];

  for (i = 0; i < store.count; i++)
    this.queues[store.live[i]].forEach(function (tile) {
      queued[tile] = true;
    });
  this.waiting.forEach(function (k) {
    if (queued[k | 0] !== true) orphans.push(k | 0);
  });
  orphans.forEach(function (tile) {
    reach(self, tile, -1);
  });
};

export default Works;
