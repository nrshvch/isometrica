import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import Carman from "./carman";
import WorkLights from "./worklights";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";

var Terrain = Core.Terrain,
  TerrainType = Core.TerrainType;

/**
 * Ground being cleared, and the bulldozers clearing it.
 *
 * Whatever is cleared off the ground - the trees and the stones the world
 * put there, a tree somebody planted - is gone from the world the moment the
 * clearing is paid for (core/city clearTile), but it stays standing where it
 * was (client/envman, client/buildman hold), the grass under it, until a
 * bulldozer gets there: as its blade reaches it, it goes down in a cloud of
 * dust, and the tile is the bare earth the bulldozer leaves behind it
 * (client/terrain) - which the grass grows back over, in time. A building
 * stands too, till a bulldozer comes up to a tile of it: then that tile of
 * it comes down (client/demolition, knock), the bulldozer waiting a moment
 * off it till it is down, and pushes its rubble away. Till a bulldozer has
 * been over a tile, it is being cleared still (core/terrain beingCleared):
 * nothing is built on it.
 *
 * The tiles cleared that hang together, corners touching, are a stretch of
 * ground worked as one, the way a road being laid is (client/roadworks):
 * swept a row at a time, along the longer way of it, back and forth, by a
 * bulldozer to every few tiles of it - each with its share of the sweep. One
 * gets to a tile, backs up a little and pushes on over it again, and drives
 * on to the next. Ground cleared next to ground still being cleared is more
 * of the same stretch: the bulldozers already at it share it out among them
 * afresh, from wherever each of them is, with more of them to it if it is
 * big enough to need more.
 *
 * A bulldozer kicks up dust as it goes, comes out of the dust as it gets to
 * work, and goes off into it once its share is done; its amber beacon turns
 * on its roof, and after dark its lamps are on (client/worklights). None of
 * it is kept: the world has cleared the ground already, and after a reload
 * it is bare.
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
//the blade gets there; and how far off a tile's middle it is when it comes
//up to it, for a building there to come down (hold knock)
var BLADE = 0.25,
  KNOCK = 0.85;

//how long a bulldozer takes to come out of its dust, and to go off into it,
//ms
var FADE_MS = 600;

//how often a bulldozer at work kicks up dust, ms; and how many puffs go up
//where what stood on a tile goes down
var DUST_EVERY = 120,
  BURST = 9;

//how often the tiles waiting are looked over for anything built on them
//meanwhile, which has whatever stood there go at once, ms
var LOOK_EVERY = 500;

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

var events = {
  //a bulldozer got to a tile: it is free to build on again
  reached: 0,
};

function Clearworks(root) {
  this.root = root;
  //the tiles cleared no bulldozer has got to yet, by the tile - each with
  //what is to go from it once one does, what is to be done as one comes up
  //to it, and till when on clock none may drive onto it (hold)
  this.waiting = {};
  this.dozers = [];
  this.looked = 0;
  //how long the works have been going, ms
  this.clock = 0;
}

Clearworks.events = events;

Clearworks.prototype.init = function () {
  var go = new engine.GameObject("clearworks");

  go.addComponent(new ClearworksScript(this));
  this.root.game.logic.world.addGameObject(go);
};

/**
 * Clears tiles - clear(tile) clearing each in the world, and saying which
 * tiles it cleared, every tile of a building on it - and has the bulldozers
 * out to them: what stood on them stays standing until one gets there.
 *
 * @param tiles {number[]}
 * @param clear {function(number): number[]}
 */
Clearworks.prototype.clear = function (tiles, clear) {
  var cleared = [],
    self = this;

  tiles.forEach(function (tile) {
    clear(tile).forEach(function (t) {
      //held as it went, or nothing was (hold)
      var held = waitOn(self, t);

      cleared.push(t);

      //nothing held - nothing of it in sight - so nothing a bulldozer has
      //to push over: in its dust, there and then
      if (held.letGo.length === 0) burst(self, t);
    });
  });

  if (cleared.length > 0) crew(this, cleared);
};

//what is held on a tile being cleared, waiting for a bulldozer
function waitOn(self, tile) {
  return (
    self.waiting[tile] ||
    (self.waiting[tile] = { letGo: [], knock: [], until: self.clock })
  );
}

/**
 * Holds what stood on a tile being cleared (core/terrain beingCleared) till
 * a bulldozer gets to it, when letGo(push) takes it away - push the way the
 * bulldozer pushed it over, in the world ("x+", "y-" - client/view
 * headingOf), or none for gone without one - if the tile is being cleared
 * at all. As the bulldozer comes up to it, pushing on the way push goes,
 * knock(push) says so - a building there comes down then - and how long to
 * wait before driving onto it, ms.
 *
 * @param tile {number}
 * @param letGo {function(string=)}
 * @param [knock] {function(string): number}
 * @returns {boolean} whether it is held
 */
Clearworks.prototype.hold = function (tile, letGo, knock) {
  if (
    this.waiting[tile] === undefined &&
    !this.root.core.terrain.beingCleared(tile)
  )
    return false;

  var held = waitOn(this, tile);

  held.letGo.push(letGo);
  if (knock) held.knock.push(knock);

  return true;
};

/**
 * Has whatever is held on tiles come down, there and then, as it would as a
 * bulldozer came up to it (hold knock) - and none comes: for a bench (lab/)
 * to bring a building down whole at the push of a button.
 *
 * @param tiles {number[]}
 * @returns {number} how long till all of it is down, ms
 */
Clearworks.prototype.knock = function (tiles) {
  var self = this,
    most = 0;

  tiles.forEach(function (tile) {
    knock(self, tile);

    if (self.waiting[tile] !== undefined)
      most = Math.max(most, self.waiting[tile].until - self.clock);
  });

  return most;
};

/**
 * Has tiles cleared as a bulldozer getting to them would (reach) - what was
 * held on them let go of, and they are free to build on again - but quietly,
 * with no bulldozer and no dust: for a bench (lab/) to put back what it
 * brought down.
 *
 * @param tiles {number[]}
 */
Clearworks.prototype.reach = function (tiles) {
  var self = this;

  tiles.forEach(function (tile) {
    reach(self, tile, undefined, true);
  });
};

function ClearworksScript(man) {
  engine.Component.call(this);
  this.man = man;
}

ClearworksScript.prototype = Object.create(engine.Component.prototype);
ClearworksScript.prototype.profileName = "clearworks";

ClearworksScript.prototype.tick = function (time) {
  var man = this.man,
    dozers = man.dozers;

  man.clock += time.dt;
  man.looked += time.dt;
  if (man.looked >= LOOK_EVERY) {
    man.looked = 0;
    builtOver(man);
  }

  for (var i = 0; i < dozers.length; i++) work(man, dozers[i], time.dt);

  //the ones done and gone
  man.dozers = dozers.filter(function (d) {
    return d.go !== null;
  });
};

/**
 * A bulldozer got to a tile, pushing on the way `push` - or something was
 * built on it meanwhile, and there is no push: whatever stood on it goes
 * down in a cloud of dust, and the tile is the bare earth left
 * (client/terrain) - with no dust, if quiet.
 */
function reach(self, tile, push, quiet) {
  var held = self.waiting[tile];

  if (held === undefined) return;

  delete self.waiting[tile];
  held.letGo.forEach(function (letGo) {
    letGo(push);
  });

  //gone: the tile is free to build on again, and bare
  self.root.core.terrain.endClearing(tile);
  self.root.terrain.redraw([tile]);
  if (quiet !== true) burst(self, tile);
  Events.fire(self, events.reached, tile);
}

//a cloud of dust going up all over a tile
function burst(self, tile) {
  for (var k = 0; k < BURST; k++)
    dust(
      self,
      Terrain.extractX(tile) + (Math.random() - 0.5) * 0.8,
      Terrain.extractY(tile) + (Math.random() - 0.5) * 0.8,
      Math.random() * 6,
    );
}

/**
 * Whatever stood on a tile waiting goes at once once anything is built on it
 * - a building site, a road - rather than stand in the middle of it till the
 * bulldozer gets there; and the bulldozer leaves that tile out.
 */
function builtOver(self) {
  var buildings = self.root.core.buildingService;

  for (var tile in self.waiting)
    if (buildings.get(+tile) !== null) reach(self, +tile);
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

      if (self.waiting[t] === undefined || seen[t] === true) return;

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
function sweep(tiles) {
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
  var path = sweep(tiles),
    inStretch = {},
    shares = [],
    pairs = [],
    at,
    n,
    i;

  tiles.forEach(function (tile) {
    inStretch[tile] = true;
  });

  //at it already: with any of its tiles still to get to
  at = self.dozers.filter(function (d) {
    return (
      d.leaving === false &&
      d.queue.some(function (tile) {
        return inStretch[tile] === true;
      })
    );
  });

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
      pairs.push({ dozer: d, share: k, far: farTo(d, s) });
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
      rest = p.dozer.queue.filter(function (tile) {
        return inStretch[tile] !== true;
      });

    given[p.share] = true;
    busy.push(p.dozer);
    p.dozer.queue = nearEndFirst(p.dozer, s).concat(rest);
  });

  //any at it with no share - fewer shares than tiles - off to whatever else
  //it had, or done
  at.forEach(function (d) {
    if (busy.indexOf(d) === -1)
      d.queue = d.queue.filter(function (tile) {
        return inStretch[tile] !== true;
      });
  });

  shares.forEach(function (s, k) {
    if (given[k] !== true) self.dozers.push(dozer(self, s));
  });
}

//how far a bulldozer is from the nearer end of a share
function farTo(d, s) {
  return Math.min(far(d, s[0]), far(d, s[s.length - 1]));
}

function far(d, tile) {
  return Math.hypot(Terrain.extractX(tile) - d.x, Terrain.extractY(tile) - d.y);
}

//a share, from whichever end of it the bulldozer is nearer
function nearEndFirst(d, s) {
  return far(d, s[s.length - 1]) < far(d, s[0]) ? s.slice().reverse() : s;
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
    terrain = self.root.core.terrain,
    from = [x, y],
    go = new engine.GameObject("clearworks"),
    renderer = new WorkLights.Renderer(),
    tries = [away].concat(AROUND.slice(0, 4));

  //coming the way the sweep goes - or from any side of it there is land on
  for (var i = 0; i < tries.length; i++) {
    var w = tries[i];

    if (w[0] === 0 && w[1] === 0) continue;

    if (
      terrain.getTerrainType(x + w[0], y + w[1]) !== TerrainType.water &&
      self.waiting[Terrain.convertToIndex(x + w[0], y + w[1])] === undefined
    ) {
      from = [x + w[0], y + w[1]];
      break;
    }
  }

  renderer.layer = RenderLayer.buildingsLayer;
  go.addComponent(renderer);

  var d = {
    go: go,
    x: from[0],
    y: from[1],
    queue: queue,
    heading: View.headingOf(x - from[0], y - from[1]) || "x+",
    //the tile it is on, and how far into backing up and pushing on over
    //it, ms - -1 while it drives
    on: -1,
    shove: -1,
    //the tile it got to last
    got: -1,
    //how long it has been out, and going off; and since it last kicked up
    //dust, ms
    age: 0,
    leaving: false,
    gone: 0,
    dusted: 0,
    //the picture it has, as it is seen
    seen: null,
  };

  for (var k = 0; k < 3; k++)
    dust(
      self,
      d.x + (Math.random() - 0.5) * 0.6,
      d.y + (Math.random() - 0.5) * 0.6,
      2,
    );

  return d;
}

/**
 * Moves a bulldozer on by dt: on to the next tile of its share, the tile
 * going as its blade gets there; backing up on it and pushing on over it
 * again; or, its share done, going off into its dust.
 */
function work(self, d, dt) {
  d.age += dt;

  if (d.leaving) {
    d.gone += dt;
    if (d.gone >= FADE_MS) {
      if (d.go.world !== null) d.go.world.removeGameObject(d.go);
      d.go = null;
      return;
    }
  } else if (d.shove >= 0) {
    var k = (d.shove += dt) / SHOVE_MS,
      v = View.headingVector(d.heading),
      back = SHOVE * Math.sin(Math.PI * Math.min(1, k));

    d.x = Terrain.extractX(d.on) - v[0] * back;
    d.y = Terrain.extractY(d.on) - v[1] * back;

    if (k >= 1) d.shove = -1;
    //pushing on into it, the dust going up in front of it
    if (k > 0.5) kick(self, d, dt, BLADE);
  } else if (ahead(self, d)) {
    var next = d.queue[0],
      dx = Terrain.extractX(next) - d.x,
      dy = Terrain.extractY(next) - d.y,
      left = Math.hypot(dx, dy),
      step = (DRIVE * dt) / 1000;

    if (left > 0.01) d.heading = View.headingOf(dx, dy);

    //come up to it: whatever is to come down there comes down
    if (left <= KNOCK) knock(self, next, d.heading);

    //a tile off whatever is still coming down there, it waits
    if (left <= 1.05 && notYet(self, next)) {
      place(self, d);
      return;
    }

    //the blade gets to what stands there
    if (left <= BLADE) got(self, d, next);

    if (left <= step) {
      d.x += dx;
      d.y += dy;
      got(self, d, next);
      d.queue.shift();
      d.on = next;
      d.shove = 0;
    } else {
      d.x += (dx / left) * step;
      d.y += (dy / left) * step;
      kick(self, d, dt, BLADE);
    }
  } else {
    d.leaving = true;
    for (var p = 0; p < 3; p++)
      dust(
        self,
        d.x + (Math.random() - 0.5) * 0.6,
        d.y + (Math.random() - 0.5) * 0.6,
        2,
      );
  }

  place(self, d);
}

/**
 * Whether a bulldozer has a tile to go on to - leaving out those of its
 * share that were got to meanwhile some other way (builtOver).
 */
function ahead(self, d) {
  var queue = d.queue;

  while (
    queue.length > 0 &&
    self.waiting[queue[0]] === undefined &&
    d.got !== queue[0]
  )
    queue.shift();

  return queue.length > 0;
}

//a bulldozer has come up to a tile, pushing on the way push goes: it is
//told, and waits as long as it says (hold)
function knock(self, tile, push) {
  var held = self.waiting[tile];

  if (held === undefined || held.knock.length === 0) return;

  held.knock.forEach(function (knock) {
    held.until = Math.max(held.until, self.clock + knock(push));
  });
  held.knock = [];
}

//whether a tile is not to be driven onto yet (hold)
function notYet(self, tile) {
  var held = self.waiting[tile];

  return held !== undefined && held.until > self.clock;
}

//a bulldozer's blade got to a tile, pushing on the way it goes
function got(self, d, tile) {
  d.got = tile;
  reach(self, tile, d.heading);
}

/**
 * Kicks up a little dust now and then, `ahead` of the bulldozer's middle -
 * where its blade is - or wherever its tracks are.
 */
function kick(self, d, dt, ahead) {
  d.dusted += dt;
  if (d.dusted < DUST_EVERY) return;
  d.dusted = 0;

  var v = View.headingVector(d.heading),
    side = (Math.random() - 0.5) * 0.5;

  dust(
    self,
    d.x + v[0] * ahead - v[1] * side,
    d.y + v[1] * ahead + v[0] * side,
    Math.random() * 3,
  );
}

//a puff of dust at x, y in tiles, `up` over the ground there
function dust(self, x, y, up) {
  SmokeSource.puff(
    self.root.game.logic.world,
    x * Config.tileSize,
    (Carman.groundHeight(self.root, x, y) * Config.tileZStep || 0) + up,
    y * Config.tileSize,
    SmokeScript.dust,
  );
}

/**
 * Puts a bulldozer where it is, facing the way it does as it is seen - its
 * picture and its lights - coming out of its dust or going off into it.
 */
function place(self, d) {
  var go = d.go,
    heading = View.heading(d.heading),
    renderer = go.spriteRenderer,
    fading = d.leaving ? 1 - d.gone / FADE_MS : Math.min(1, d.age / FADE_MS);

  if (d.seen !== heading) {
    var vehicles = self.root.generated ? self.root.generated.vehicles : null,
      look =
        vehicles && vehicles.bulldozer
          ? vehicles.bulldozer.colors.yellow[heading]
          : null;

    if (!look) return;

    renderer.setSprite(self.root.sprites.getSprite(look.sprite));
    renderer.pivotX = look.pivotX;
    renderer.pivotY = look.pivotY;
    d.seen = heading;
  }

  //its lights on only once it is all there
  renderer.lights =
    fading < 1 ? null : WorkLights.machineOf("bulldozer", heading);
  renderer.opacity = Math.max(0, fading);

  go.transform.setPosition(
    d.x * Config.tileSize,
    Carman.groundHeight(self.root, d.x, d.y) * Config.tileZStep,
    d.y * Config.tileSize,
  );

  if (go.world === null) self.root.game.logic.world.addGameObject(go);
}

export default Clearworks;
