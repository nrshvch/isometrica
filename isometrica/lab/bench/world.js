/**
 * The ground for the benches that go the game's own way: the game's client
 * and world out at sea, only the bench's patch drawn, a city of nobody,
 * ten in the morning, as fast or slow as asked; put() puts things up whole.
 * See isometrica/.claude/skills/lab/SKILL.md (The two kinds of bench).
 */
import ReactiveProperty from "reactive-property";
import Events from "events";
import Core from "../../src/core/main";
import Climate from "../../src/core/climate";
import Client from "../../src/client/main";
import BuildingCode from "../../src/data/buildingcode";
import BuildingClassCode from "../../src/data/classcode";
import CityBuildings from "../../src/core/city/citybuildings";
import Resource from "../../src/core/resourcecode";
import Config from "../../src/client/config";
import Weather from "../../src/client/weather";
import BuildingState from "../../src/core/buildingstate";
import BuildingData from "../../src/data/buildings";
import { stageOf } from "../../src/shared/gen/stacking";

var Terrain = Core.Terrain;

//what a bench's cities would be kept under - none are: nothing is opened to
//be saved (core/persistence)
var SAVES = "lab.bench";

//how high the bench's ground is, steps - land, clear of the sea
export var GROUND = 2;

//how warm the bench is, °C: the middle of the green (core/climate ZONES)
var GREEN = 15;

//the middle of the bench, out in the open sea: deep water for thirty tiles
//round it, nothing of the world's own anywhere near
var MIDDLE = Terrain.convertToIndex(29960, 29960);

//the hour it is, and the money the city has
var TEN = 10 * 3600000,
  PURSE = 1e9;

//how close the camera is to begin with (engine CameraComponent zoom)
var CLOSE = 2;

/**
 * What the game's client asks of the screens round the world - which is
 * nothing here but whether the world is busy (an action owns the clicks).
 */
function bridge() {
  var world = {
      busy: ReactiveProperty(false),
      show: function () {},
      showHint: function () {},
      hideHint: function () {},
      showButtons: function () {},
      showControls: function () {
        return controls();
      },
      showTools: function () {},
    },
    screen = {
      worldScreen: function () {
        return world;
      },
      showWorld: function () {},
      showActionControls: function () {
        return controls();
      },
      showToolControls: function () {
        return controls();
      },
      showPrompt: function () {},
      hidePrompt: function () {},
    };

  return {
    gameScreen: function () {
      return screen;
    },
  };
}

//controls nobody sees, for whatever the client puts up
function controls() {
  var c = {};

  ["canRotate", "canShuffle", "canSubmit", "tools", "onSubmit", "onCancel"]
    //each one of them a property to set and watch
    .forEach(function (name) {
      c[name] = ReactiveProperty();
    });

  return c;
}

/**
 * Every building the catalogue offers, by its size and then its name:
 * {value, label} each.
 */
export function kinds() {
  return Object.keys(BuildingData)
    .filter(function (code) {
      var b = BuildingData[code];

      return (
        !b.hidden &&
        b.classCode !== BuildingClassCode.road &&
        b.classCode !== BuildingClassCode.tree
      );
    })
    .sort(function (a, b) {
      var x = BuildingData[a],
        y = BuildingData[b];

      return (
        x.sizeX * x.sizeY - y.sizeX * y.sizeY || x.name.localeCompare(y.name)
      );
    })
    .map(function (code) {
      var b = BuildingData[code];

      return {
        value: code,
        label: b.name + " (" + b.sizeX + "×" + b.sizeY + ")",
      };
    });
}

//the bench's world, once it is being brought up: one to a page, as the
//client is - it puts itself up as the page's vkaria, which everything in it
//goes by (client/vkaria) - and a second client brought up next to it would
//have the first one's services find the second one's camera, not up yet
//(client/tilesman start)
var opened = null;

/**
 * Brings a bench's world up in el, the camera over its middle - once: asked
 * for again (as React's StrictMode does in development, mounting a page
 * twice over), it is the same world, wherever it was brought up.
 *
 * @param el {HTMLElement}
 * @returns {Promise<World>}
 */
export function open(el) {
  if (opened === null) opened = up(el);

  return opened;
}

function up(el) {
  Weather.override = "clear";
  Climate.setHeat(function () {
    return GREEN;
  });

  var core = new Core.Logic({ tick: 300000, saves: SAVES }),
    client = new Client.Vkaria(core, bridge(), {
      create: function (vkaria) {
        //nobody's city: no name over it
        vkaria.cityman.names = false;
      },
    });

  //the world goes by the bench's clock, speed and all (client/vkaria
  //CoreClock), not the real one
  client.frameClock = true;

  //nothing to hear
  client.sound.wants.music = client.sound.wants.sounds = false;
  client.sound.on = false;

  return new Promise(function (resolve) {
    client.prepare(resolve);
  }).then(function () {
    core.start();
    core.time.setTime(TEN);
    core.pause();

    var city = core.cities.restoreCity({
      tile: MIDDLE,
      name: "",
      resources: { money: PURSE },
    });

    var world = new World(core, client, city);

    client.start();
    attach(client, el);
    only(world);
    client.startServices();
    stopTraffic(client);
    world.start();

    return world;
  });
}

/**
 * Only the bench's own patch of ground drawn: whatever is to be drawn round
 * the camera as it moves (client/tilesman) cut down to it, and the sea round
 * it left undrawn.
 */
function only(self) {
  var terrain = self.client.terrain,
    draw = terrain.draw;

  self.drawGround = function (x0, y0, w, h) {
    draw.call(terrain, x0, y0, w, h);
  };

  terrain.draw = function (x0, y0, w, h) {
    var a = self.area;

    if (a === null) return;

    var ax0 = Math.max(x0, a.x),
      ay0 = Math.max(y0, a.y),
      ax1 = Math.min(x0 + w, a.x + a.w),
      ay1 = Math.min(y0 + h, a.y + a.h);

    if (ax1 > ax0 && ay1 > ay0)
      draw.call(terrain, ax0, ay0, ax1 - ax0, ay1 - ay0);
  };

  //and the trees and the stones the world puts on the land by itself
  //(core/ambient) only on it - not floating over the ground left undrawn
  var service = self.core.envService,
    getTree = service.getTree,
    getRock = service.getRock;

  function on(tile) {
    var a = self.area,
      x = Terrain.extractX(tile),
      y = Terrain.extractY(tile);

    return a !== null && x >= a.x && y >= a.y && x < a.x + a.w && y < a.y + a.h;
  }

  service.getTree = function (tile) {
    return on(tile) ? getTree.call(this, tile) : null;
  };
  service.getRock = function (tile) {
    return on(tile) ? getRock.call(this, tile) : null;
  };
}

//no traffic on the roads: whatever puts the cars on (client/carman) taken
//out of the world before it puts any on
function stopTraffic(client) {
  var world = client.game.logic.world;

  world.gameObjects.forEach(function (go) {
    if (go !== null && go.name === "carman") world.removeGameObject(go);
  });
}

//the world drawn into el, in a canvas the size of it (as the city builder's
//ui/session attach)
function attach(client, el) {
  var canvas = document.createElement("canvas"),
    viewport;

  canvas.className = "block size-full";
  el.appendChild(canvas);
  viewport = client.game.graphics.createViewport(canvas);
  viewport.setCamera(client.camera);
  viewport.setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);

  new ResizeObserver(function () {
    viewport.setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);
  }).observe(el);
}

/**
 * A bench's world, up.
 */
function World(core, client, city) {
  this.core = core;
  this.client = client;
  this.city = city;
  //how fast the client goes: 1 as the game goes, 0 stood still
  this.speed = 1;
  //and how much faster than that the building sites go up: 1 as the game
  //has them - and how far along each is by the bench's clock
  this.sitePace = 1;
  this.progress = new WeakMap();
  //the patch of ground drawn, {x, y, w, h} in tiles of the world - none
  //yet (ground)
  this.area = null;

  //for the console: bench.world
  window.bench = { world: this };
}

//once the client is up: going at its own pace, the camera over the middle
World.prototype.start = function () {
  pace(this);
  this.look(0, 0);
  this.client.camera.cameraScript.zoom(CLOSE);
};

/**
 * The patch of ground the bench stands on, w by h tiles from dx, dy off its
 * middle: grass, made so the way a save puts ground back (core/terrain
 * load) - its grid points all as high, flat, or each as high as rise(i, j)
 * says it is over that, i, j along the patch from its corner (no grid point
 * more than a step over the ones next to it) - nothing of the world's own
 * on any of its tiles, and drawn, and nothing else; the patch drawn before
 * it gone where it is not this one.
 *
 * @param [o] {function(number, number): number|Object} rise, steps - or
 *        {heights, wild}: heights, how high the grid point i, j from the
 *        patch's corner is, steps, outright (0 to w, 0 to h; no two next to
 *        each other more than a step apart); wild, the world's own trees and
 *        stones left standing on it (core/ambient) rather than cleared off
 */
World.prototype.ground = function (dx, dy, w, h, o) {
  var core = this.core,
    client = this.client,
    x0 = Terrain.extractX(MIDDLE) + dx,
    y0 = Terrain.extractY(MIDDLE) + dy,
    rise = typeof o === "function" ? o : null,
    heights = (o && typeof o === "object" && o.heights) || null,
    wild = !!(o && typeof o === "object" && o.wild),
    was = this.area,
    points = [],
    cleared = [],
    tiles = [],
    i,
    j;

  for (i = 0; i <= w; i++)
    for (j = 0; j <= h; j++)
      points.push([
        Terrain.convertToIndex(x0 + i, y0 + j),
        heights !== null ? heights(i, j) : GROUND + (rise ? rise(i, j) : 0),
      ]);

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) {
      var tile = Terrain.convertToIndex(x0 + i, y0 + j);

      tiles.push(tile);
      if (!wild && core.terrain.clearedTiles[tile] !== true) cleared.push(tile);
    }

  core.terrain.load({ points: points, cleared: wild ? [] : cleared });

  this.area = { x: x0, y: y0, w: w, h: h };

  //what was drawn of the patch before, and is not of this one, gone
  if (was !== null)
    for (i = was.x; i < was.x + was.w; i++)
      for (j = was.y; j < was.y + was.h; j++)
        if (i < x0 || i >= x0 + w || j < y0 || j >= y0 + h)
          client.terrain.clear(i, j, 1, 1);

  this.drawGround(x0, y0, w, h);
  client.terrain.redraw(tiles);

  //the world's own trees and stones put on it, at its height, as the game
  //puts them where the ground moved (client/envman)
  if (wild)
    Events.fire(core.terrain, Terrain.events.gridUpdate, {
      points: {},
      tiles: tiles,
    });
};

//the client's clock going speed times as fast as the real one - and the
//world's with it (client/vkaria CoreClock), the building sites and the
//bulldozers on it
function pace(self) {
  var time = self.client.game.time;

  time.tick = function () {
    var real = Date.now();

    this.dt = Math.min(real - this._lastReal, 200) * self.speed;
    this._lastReal = real;
    this.time += this.dt;
    this.now += this.dt;
    this.frame++;

    sites(self, this.dt);
  };
}

/**
 * Whatever is going up goes up sitePace times as fast as the bench's clock
 * - stood still with it - rather than as the world's clock alone would have
 * it (core/construction; the client moves that on by the same frames), and
 * is drawn a stage on as it gets to one (client/buildingview drawSite).
 */
function sites(self, dt) {
  self.core.buildings.underConstruction().forEach(function (b) {
    var was = self.progress.has(b) ? self.progress.get(b) : b.getProgress(),
      now = Math.min(1, was + (dt * self.sitePace) / b.data.constructionTime),
      seen = self.client.buildman.getBuilding(b.tile),
      drawn = seen !== null && seen.view ? seen.view.drawnAs : null;

    b.setProgress(now);
    //no further than it goes while its ground is cleared still (core/
    //construction awaitClearing)
    now = Math.min(now, b.getProgress());
    self.progress.set(b, now);

    if (
      now < 1 &&
      drawn &&
      drawn.state === BuildingState.underConstruction &&
      stageOf(now) !== stageOf(drawn.progress)
    )
      seen.view.update();
  });
}

/**
 * The tile dx, dy from the middle of the bench.
 */
World.prototype.tile = function (dx, dy) {
  return MIDDLE + dx + dy * Terrain.dy;
};

/**
 * The camera over the ground x, y tiles from the middle of the bench - a
 * tile's middle for whole numbers.
 */
World.prototype.look = function (x, y) {
  this.client.camera.cameraScript.lookAt(
    (Terrain.extractX(MIDDLE) + x) * Config.tileSize,
    (Terrain.extractY(MIDDLE) + y) * Config.tileSize,
  );
};

/**
 * Puts up code - a kind that comes in several, one of them at random
 * (data/buildings variants) - finished, its corner with the least x and y
 * dx, dy from the middle, turned so many times, looking the way look says
 * (client/compoundbuilding) or a way of its own picked as it is first seen:
 * as it would come out of a save, not paid for, and with nothing floated
 * over it for what it would have cost.
 *
 * @returns {Building|null} the core's, or null where it does not fit
 */
World.prototype.put = function (code, dx, dy, rotation, look) {
  var world = this.client.game.logic.world,
    from = world.gameObjects.length,
    tile = this.tile(dx, dy),
    building;

  code = CityBuildings.variantOf(+code);

  if (this.core.buildingService.test(code, tile, rotation || 0) !== 0)
    return null;

  building = this.city.buildings.restore(code, tile, rotation || 0, true, look);

  //put up here, not paid for: none of the prices the game floats over what
  //goes up (client/buildman showConstructionCost)
  world.gameObjects.slice(from).forEach(function (go) {
    if (go !== null && go.name === "tileMessage") world.removeGameObject(go);
  });

  return building;
};

/**
 * Puts code up in the place of the building dx, dy from the middle, the way
 * the game does (client/buildman replace): fenced off, coming down as the
 * bulldozers get to it, and a building site on its ground once they are
 * done - code another variant of its own, or another look, for the kind of
 * building it is.
 *
 * @returns {number} ErrorCode - 0 once it is under way
 */
World.prototype.replace = function (dx, dy, code) {
  var city = this.city;

  if (!city.resourcesService.hasEnoughResource(Resource.money, PURSE / 2))
    city.resourcesModule.addResource(Resource.money, PURSE);

  return this.client.buildman.replace(this.tile(dx, dy), code);
};

/**
 * Blows up the building dx, dy from the middle, the way the game does
 * (client/buildman explode): torn into pieces thrown all round in a
 * fireball, and a heap of rubble left on every tile of it.
 *
 * @returns {number} ErrorCode - 0 once it has gone up
 */
World.prototype.explode = function (dx, dy) {
  return this.client.buildman.explode(this.tile(dx, dy));
};

/**
 * What lies on the bench left by what was blown up (data/buildings rubble):
 * its heaps of rubble and its wrecked yards, by the tile - or only the one
 * or the other.
 *
 * @param [only] {string} "heaps", "wrecks", "fallen" - the trees knocked
 *        down, lying
 * @returns {number[]}
 */
World.prototype.rubble = function (only) {
  return this.city.buildings
    .getBuildings()
    .filter(function (b) {
      if (b.data.variantOf !== BuildingCode.rubble) return false;

      var wreck = !!(b.look && b.look.wreck),
        fallen = !!(b.look && b.look.fallen);

      return only === "heaps"
        ? !wreck && !fallen
        : only === "wrecks"
          ? wreck
          : only === "fallen"
            ? fallen
            : true;
    })
    .map(function (b) {
      return b.tile;
    });
};

//what is coming down on the bench by itself still (client/collapse)
function collapses(self) {
  return self.client.game.logic.world.gameObjects.filter(function (go) {
    return go && go.collapse && go.world !== null;
  });
}

//what is blowing up on the bench still (client/explosion)
function explosions(self) {
  return self.client.game.logic.world.gameObjects
    .filter(function (go) {
      return go && go.explosion && go.world !== null;
    })
    .map(function (go) {
      return go.explosion;
    });
}

/**
 * The building sites on the bench finished there and then.
 */
World.prototype.finish = function () {
  this.core.buildings.underConstruction().forEach(function (b) {
    b.setProgress(1);
  });
};

/**
 * A tree planted dx, dy from the middle, of a kind picked at random.
 */
World.prototype.plant = function (dx, dy) {
  return this.put(BuildingCode.tree, dx, dy, 0);
};

/**
 * A road from dx, dy along x for so many tiles, or along y if alongY - laid
 * in material, "gravel", "cobble" or "asphalt".
 */
World.prototype.road = function (dx, dy, length, alongY, material) {
  for (var i = 0; i < length; i++)
    this.put(
      BuildingCode.road,
      dx + (alongY ? 0 : i),
      dy + (alongY ? i : 0),
      0,
      { material: material || "asphalt" },
    );
};

/**
 * Clears tiles the way the game does (the city builder's client/
 * terrainman): what stands on them stays till a bulldozer gets to it, and
 * what it all came to floats up once over the lot.
 *
 * @returns {number} how many tiles were cleared, every tile of a building on
 *          any of them
 */
World.prototype.clear = function (tiles) {
  var city = this.city,
    client = this.client,
    total = 0,
    count = 0,
    x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;

  if (!city.resourcesService.hasEnoughResource(Resource.money, PURSE / 2))
    city.resourcesModule.addResource(Resource.money, PURSE);

  tiles.forEach(function (tile) {
    x0 = Math.min(x0, Terrain.extractX(tile));
    y0 = Math.min(y0, Terrain.extractY(tile));
    x1 = Math.max(x1, Terrain.extractX(tile));
    y1 = Math.max(y1, Terrain.extractY(tile));
  });

  //the game's own way: a command to the world (core/commands clear)
  var result = client.clearworks.clear({
    type: "clear",
    city: city.id(),
    tiles: tiles,
  });

  count = result.cleared.length;
  total = result.cost;

  if (total > 0)
    client.buildman.showCost(
      Terrain.convertToIndex(x0, y0),
      x1 - x0 + 1,
      y1 - y0 + 1,
      total,
    );

  return count;
};

//tiles grass again, however they were cleared
function grass(self, tiles) {
  var terrain = self.core.terrain;

  tiles.forEach(function (tile) {
    delete terrain.bareSince[tile];
  });
  self.client.terrain.redraw(tiles);
}

/**
 * Everything gone from the w by h tiles from dx, dy, at once and with
 * nothing to show for it, and grass again: for the bench to start over -
 * once the bulldozers are done, not before.
 *
 * @returns {boolean} whether it was, nothing being cleared still
 */
World.prototype.wipe = function (dx, dy, w, h) {
  var tiles = [],
    core = this.core;

  if (this.busy()) return false;

  //nothing waits to go up on it any more
  this.city.buildings.dropReplacing();

  for (var i = 0; i < w; i++)
    for (var j = 0; j < h; j++) tiles.push(this.tile(dx + i, dy + j));

  tiles.forEach(function (tile) {
    if (core.buildingService.get(tile)) core.terrain.clearTile(tile);
  });

  grass(this, tiles);

  return true;
};

/**
 * Whether anything is being cleared still - a bulldozer out, a tile it has
 * not got to yet - or waits to go up where it is (client/buildman replace),
 * or is blowing up (client/explosion), or coming down by itself, blown up
 * or hit by the blast (client/collapse), or burnt (client/fires).
 */
World.prototype.busy = function () {
  var works = this.client.clearworks;

  return (
    works.dozers() > 0 ||
    works.waiting() > 0 ||
    this.city.buildings.replacing().length > 0 ||
    explosions(this).length > 0 ||
    collapses(this).length > 0 ||
    this.client.fires.falling()
  );
};

/**
 * The camera turned a quarter turn either way, or looking from straight
 * above, or back.
 */
World.prototype.turn = function (by) {
  this.client.turnView(by);
};

World.prototype.top = function (on) {
  this.client.setTopView(on);
};

/**
 * What is going on: the bulldozers out, the tiles still waiting for one,
 * the buildings coming down, the trees going over, the roads still to
 * break up and the heaps of rubble lying about; what is blowing up, its
 * pieces flying and lying about, what is coming down by itself, and the
 * heaps of rubble and the wrecked yards left lying there for good
 * (data/buildings rubble); what waits to go up where
 * something is coming down for it, and the building sites going up, how far
 * along each, 0..1.
 */
World.prototype.status = function () {
  var root = this.client,
    works = root.clearworks,
    named = {};

  root.game.logic.world.gameObjects.forEach(function (go) {
    if (go && go.world !== null && go.name)
      named[go.name] = (named[go.name] || 0) + 1;
  });

  return {
    dozers: works.dozers(),
    waiting: works.waiting(),
    coming: named.demolition || 0,
    falling: named.felling || 0,
    rubble: named.rubble || 0,
    fence: named.fence || 0,
    replacing: this.city.buildings.replacing().length,
    blowing: explosions(this).length,
    pieces: explosions(this).reduce(function (n, e) {
      return n + e.pieces();
    }, 0),
    heaps: this.rubble("heaps").length,
    wrecks: this.rubble("wrecks").length,
    fallen: this.rubble("fallen").length,
    collapsing: collapses(this).length,
    sites: this.core.buildings.underConstruction().map(function (b) {
      return b.getProgress();
    }),
    roads: Object.keys(root.buildman.held).filter(function (tile) {
      var b = root.buildman.held[tile];

      return b.staticData && b.staticData.classCode === BuildingClassCode.road;
    }).length,
  };
};
