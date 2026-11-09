/**
 * The ground for the lab's benches that go the game's own way (lab/
 * demolition.html, replace.html, explosion.html): the game's own client and
 * world, out
 * in the open sea, and of all of it only the bench's own patch drawn - flat
 * grass, as a save puts ground back (core/terrain load), with nothing of the
 * world's own on it - and a city of nobody to own what is put up, rich
 * enough never to be short. The clock stands still at ten in the morning in
 * clear weather, no traffic drives its roads, nothing is saved, nothing is
 * heard; and the client goes as fast or as slowly as asked, or not at all -
 * and the building sites with it, sitePace times as fast again.
 *
 * What is put up goes up whole, there and then - unpaid, nothing floated
 * over it (put) - on tiles counted from the middle of the patch.
 */
import ReactiveProperty from "reactive-property";
import Core from "../../src/core/main";
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
var GROUND = 2;

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

/**
 * Brings a bench's world up in el, the camera over its middle.
 *
 * @param el {HTMLElement}
 * @returns {Promise<World>}
 */
export function open(el) {
  Weather.override = "clear";

  var core = new Core.Logic({ tick: 300000, saves: SAVES }),
    client = new Client.Vkaria(core, bridge(), {
      create: function (vkaria) {
        //nobody's city: no name over it
        vkaria.cityman.names = false;
      },
    });

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
 * middle: flat grass, made so the way a save puts ground back (core/terrain
 * load) - its grid points all as high, and nothing of the world's own on
 * any of its tiles - and drawn, and nothing else; the patch drawn before it
 * gone where it is not this one.
 */
World.prototype.ground = function (dx, dy, w, h) {
  var core = this.core,
    client = this.client,
    x0 = Terrain.extractX(MIDDLE) + dx,
    y0 = Terrain.extractY(MIDDLE) + dy,
    was = this.area,
    points = [],
    cleared = [],
    tiles = [],
    i,
    j;

  for (i = 0; i <= w; i++)
    for (j = 0; j <= h; j++)
      points.push([Terrain.convertToIndex(x0 + i, y0 + j), GROUND]);

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) {
      var tile = Terrain.convertToIndex(x0 + i, y0 + j);

      tiles.push(tile);
      if (core.terrain.clearedTiles[tile] !== true) cleared.push(tile);
    }

  core.terrain.load({ points: points, cleared: cleared });

  this.area = { x: x0, y: y0, w: w, h: h };

  //what was drawn of the patch before, and is not of this one, gone
  if (was !== null)
    for (i = was.x; i < was.x + was.w; i++)
      for (j = was.y; j < was.y + was.h; j++)
        if (i < x0 || i >= x0 + w || j < y0 || j >= y0 + h)
          client.terrain.clear(i, j, 1, 1);

  this.drawGround(x0, y0, w, h);
  client.terrain.redraw(tiles);
};

//the client's clock going speed times as fast as the real one - and the
//building sites with it
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
 * Whatever is going up goes up by the bench's clock, sitePace times as fast,
 * rather than by the real one the game times it by (core/construction) -
 * stood still with it - and is drawn a stage on as it gets to one
 * (client/buildingview drawSite), which it would otherwise be by the real
 * clock too.
 */
function sites(self, dt) {
  self.core.buildings.underConstruction().forEach(function (b) {
    var was = self.progress.has(b) ? self.progress.get(b) : b.getProgress(),
      now = Math.min(1, was + (dt * self.sitePace) / b.data.constructionTime),
      seen = self.client.buildman.getBuilding(b.tile),
      drawn = seen !== null && seen.view ? seen.view.drawnAs : null;

    self.progress.set(b, now);
    b.setProgress(now);

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
 * The heaps of rubble lying on the bench (data/buildings rubble), by the
 * tile.
 *
 * @returns {number[]}
 */
World.prototype.rubble = function () {
  return this.city.buildings
    .getBuildings()
    .filter(function (b) {
      return b.data.variantOf === BuildingCode.rubble;
    })
    .map(function (b) {
      return b.tile;
    });
};

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

  client.clearworks.clear(tiles, function (tile) {
    var cleared = city.clearTile(tile);

    count += cleared.length;
    total +=
      cleared.cost !== undefined
        ? cleared.cost
        : cleared.length * Core.Config.clearTileCost;

    return cleared;
  });

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
 * or is blowing up (client/explosion).
 */
World.prototype.busy = function () {
  var works = this.client.clearworks;

  return (
    works.dozers.length > 0 ||
    Object.keys(works.waiting).length > 0 ||
    this.city.buildings.replacing().length > 0 ||
    explosions(this).length > 0
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
 * pieces flying and lying about, and the heaps of rubble left lying there
 * for good (data/buildings rubble); what waits to go up where
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
    dozers: works.dozers.length,
    waiting: Object.keys(works.waiting).length,
    coming: named.demolition || 0,
    falling: named.felling || 0,
    rubble: named.rubble || 0,
    fence: named.fence || 0,
    replacing: this.city.buildings.replacing().length,
    blowing: explosions(this).length,
    pieces: explosions(this).reduce(function (n, e) {
      return n + e.pieces();
    }, 0),
    heaps: this.rubble().length,
    sites: this.core.buildings.underConstruction().map(function (b) {
      return b.getProgress();
    }),
    roads: Object.keys(root.buildman.held).filter(function (tile) {
      var b = root.buildman.held[tile];

      return b.staticData && b.staticData.classCode === BuildingClassCode.road;
    }).length,
  };
};
