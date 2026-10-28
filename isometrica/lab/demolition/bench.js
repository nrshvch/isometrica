/**
 * The demolition bench (lab/demolition.html): the game's own client - the
 * world, the bulldozers clearing it, a building coming down a tile at a
 * time, a tree going over, a road broken up - on the city every new player
 * starts on (data/initialcity), in a save of its own that is thrown away
 * every time the page comes up, so nothing done here lasts.
 *
 * Next to the city is a stage: open ground, put up on and cleared as often
 * as wanted - a building of any kind, a few trees planted, a crossing of
 * roads, or all of them - and cleared the way the game clears ground (the
 * city builder's client/terrainman): every tile charged, and what it all
 * comes to floated up once over the lot. Or any tiles at all, picked the
 * way the game picks them (client/areaselector) - the woods round the city
 * among them. All of it as slowly as asked, turned round, or from above.
 */
import ReactiveProperty from "reactive-property";
import Core from "../../src/core/main";
import Client from "../../src/client/main";
import InitialCity from "../../src/data/initialcity";
import BuildingData from "../../src/data/buildings";
import BuildingClassCode from "../../src/data/classcode";
import BuildingCode from "../../src/data/buildingcode";
import TerrainType from "../../src/core/terraintype";
import CityBuildings from "../../src/core/city/citybuildings";
import Resource from "../../src/core/resourcecode";
import AreaSelector from "../../src/client/areaselector";
import Config from "../../src/client/config";
import Events from "events";

var Terrain = Core.Terrain;

//what the bench's cities are kept under while it is up (core/persistence
//citystore) - thrown away as it comes up
var SAVES = "lab.demolition";

//how big the stage is, tiles a side - and how far from the city's middle it
//is looked for, at most
var STAGE = 8,
  FAR = 24;

//how close the camera comes to look at it (engine CameraComponent zoom)
var CLOSE = 2;

//the white the tiles picked are outlined in, as the city builder outlines
//them (client/terrainman)
var PICKED = "rgba(255,255,255,1)";

//the tree planted - a kind picked at random for each (data/buildings
//variants)
var TREE = BuildingCode.tree;

//the money the city is kept in, for clearing never to stop for the want of
//it
var PURSE = 1e7;

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

  [
    "canRotate",
    "canShuffle",
    "canSubmit",
    "tools",
    "onSubmit",
    "onCancel",
  ].forEach(function (name) {
    c[name] = ReactiveProperty();
  });

  return c;
}

//every save the bench left behind, gone
function forget() {
  try {
    for (var i = localStorage.length - 1; i >= 0; i--) {
      var key = localStorage.key(i);

      if (key !== null && key.indexOf(SAVES + ".") === 0)
        localStorage.removeItem(key);
    }
  } catch (e) {
    //no storage: nothing kept to forget
  }
}

/**
 * What can be put up on the stage that comes down: every building there is
 * but the roads, the trees and the cliffs - by its name, the smallest first.
 *
 * @returns {{value: string, label: string}[]}
 */
export function buildings() {
  return Object.keys(BuildingData)
    .map(function (code) {
      return { code: +code, data: BuildingData[code] };
    })
    .filter(function (b) {
      var c = b.data && b.data.classCode;

      return (
        b.data &&
        b.data.name &&
        !b.data.variants &&
        c !== BuildingClassCode.road &&
        c !== BuildingClassCode.tree &&
        b.code !== BuildingCode.cliff &&
        b.code !== BuildingCode.cityHall
      );
    })
    .sort(function (a, b) {
      return (
        a.data.sizeX * a.data.sizeY - b.data.sizeX * b.data.sizeY ||
        a.data.name.localeCompare(b.data.name)
      );
    })
    .map(function (b) {
      return {
        value: String(b.code),
        label: b.data.name + " (" + b.data.sizeX + "×" + b.data.sizeY + ")",
      };
    });
}

/**
 * Brings the bench up in el: the game's client on the initial city, the
 * camera over the stage.
 *
 * @param el {HTMLElement}
 * @returns {Promise<Bench>}
 */
export function boot(el) {
  forget();

  var core = new Core.Logic({
      tick: 300000,
      saves: SAVES,
      initialCity: InitialCity,
    }),
    client = new Client.Vkaria(core, bridge(), null);

  return new Promise(function (resolve) {
    client.prepare(resolve);
  })
    .then(function () {
      core.start();

      return core.persistence.prepare(null);
    })
    .then(function () {
      core.persistence.open(null, true);
      client.start();
      attach(client, el);
      client.startServices();

      return new Bench(core, client);
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
 * The bench, up.
 */
function Bench(core, client) {
  var self = this;

  this.core = core;
  this.client = client;
  //how fast it all goes: 1 as the game goes, 0 stood still
  this.speed = 1;
  //what was last put up on the stage, to be put up again (again)
  this.last = null;
  //the tiles picked, and their outlines
  this.picker = null;
  this.outlines = [];
  //what went wrong last, for the page to say
  this.said = "";

  //the world's clock stood still - the day as it is, nothing else going up
  //or coming down - and the client's going as fast as asked
  core.pause();
  pace(this);

  this.stage = stageNear(this);

  //for the console: demolition.bench
  window.demolition = { bench: this };

  //once the city is in sight, the camera over the stage
  setTimeout(function () {
    self.look();
  }, 0);
}

//the client's clock going speed times as fast as the real one
function pace(self) {
  var time = self.client.game.time;

  time.tick = function () {
    var real = Date.now();

    this.dt = Math.min(real - this._lastReal, 200) * self.speed;
    this._lastReal = real;
    this.time += this.dt;
    this.now += this.dt;
    this.frame++;
  };
}

function city(self) {
  return self.core.cities.getCity(0);
}

/**
 * Open ground near the city's middle, STAGE tiles a side: land, nothing
 * built on it nor being cleared, and flat in the middle of it for a
 * building to go up there - the wild trees and stones on it, if any, to be
 * cleared with the rest.
 *
 * @returns {{x: number, y: number}|null} its corner with the least x and y
 */
function stageNear(self) {
  var core = self.core,
    c = city(self),
    at = c ? c.tile() : self.client.camera.transform.getPosition(),
    cx = c ? Terrain.extractX(at) : Math.floor(at[0] / Config.tileSize),
    cy = c ? Terrain.extractY(at) : Math.floor(at[2] / Config.tileSize);

  for (var r = 4; r <= FAR; r++)
    for (var dx = -r; dx <= r; dx++)
      for (var dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;

        var x = cx + dx,
          y = cy + dy;

        if (open(core, x, y)) return { x: x, y: y };
      }

  return null;
}

//whether the square of STAGE tiles from x, y is open ground, flat in the
//middle
function open(core, x, y) {
  var terrain = core.terrain,
    h = terrain.getGridPointHeight(x + 2, y + 2),
    i,
    j;

  for (i = 0; i < STAGE; i++)
    for (j = 0; j < STAGE; j++) {
      var tile = Terrain.convertToIndex(x + i, y + j);

      if (
        core.buildingService.get(tile) !== null ||
        terrain.beingCleared(tile) ||
        terrain.getTerrainType(tile) !== TerrainType.grass
      )
        return false;
    }

  for (i = 2; i <= STAGE - 2; i++)
    for (j = 2; j <= STAGE - 2; j++)
      if (terrain.getGridPointHeight(x + i, y + j) !== h) return false;

  return true;
}

//every tile of the stage
function stageTiles(self) {
  var out = [],
    s = self.stage;

  for (var i = 0; i < STAGE; i++)
    for (var j = 0; j < STAGE; j++)
      out.push(Terrain.convertToIndex(s.x + i, s.y + j));

  return out;
}

//the camera over a tile's middle
function lookAtTile(self, x, y) {
  self.client.camera.cameraScript.lookAt(
    x * Config.tileSize,
    y * Config.tileSize,
  );
}

/**
 * The camera over the middle of the stage.
 */
Bench.prototype.look = function () {
  if (this.stage === null) return;

  lookAtTile(this, this.stage.x + STAGE / 2, this.stage.y + STAGE / 2);
  //near enough to see the dust, the pieces and the bulldozers
  if (this.client.camera.cameraScript.zoom() < CLOSE)
    this.client.camera.cameraScript.zoom(CLOSE);
};

/**
 * Puts something up on the stage - a building, by its code, in the middle
 * of it; "trees", nine planted three by three; "roads", a crossing of a
 * street and a lane; "all", a building with a road along it and trees round
 * it - over whatever is up there already, where there is room.
 *
 * @param what {string}
 * @returns {boolean} whether anything went up
 */
Bench.prototype.put = function (what) {
  var s = this.stage,
    c = city(this),
    self = this,
    world = this.client.game.logic.world,
    from = world.gameObjects.length,
    put = 0;

  this.said = "";

  if (s === null || !c) {
    this.said = "no open ground near the city for a stage";
    return false;
  }

  function at(code, i, j, look) {
    var tile = Terrain.convertToIndex(s.x + i, s.y + j);

    code = CityBuildings.variantOf(code);

    if (self.core.buildingService.test(code, tile, 0) !== 0) return;

    c.buildings.restore(code, tile, 0, true, look);
    put++;
  }

  function trees(spots) {
    spots.forEach(function (p) {
      at(TREE, p[0], p[1]);
    });
  }

  function roads(material) {
    var i;

    //a street across the stage, and a lane off it
    for (i = 0; i < STAGE; i++)
      at(BuildingCode.road, i, 1, { material: material });
    for (i = 2; i < 6; i++) at(BuildingCode.road, 5, i, { material: "gravel" });
  }

  if (what === "trees")
    trees([
      [2, 2],
      [3, 2],
      [4, 2],
      [2, 3],
      [3, 3],
      [4, 3],
      [2, 4],
      [3, 4],
      [4, 4],
    ]);
  else if (what === "roads") roads("asphalt");
  else if (what === "all") {
    roads("cobble");
    at(+this.code || 2126, 1, 3);
    trees([
      [0, 6],
      [1, 7],
      [3, 7],
      [6, 6],
      [7, 3],
      [7, 6],
    ]);
  } else at(+what, 2, 2);

  //put up here, not paid for: none of the prices the game floats over what
  //goes up (client/buildman showConstructionCost)
  world.gameObjects.slice(from).forEach(function (go) {
    if (go !== null && go.name === "tileMessage") world.removeGameObject(go);
  });

  if (put === 0)
    this.said = "nothing went up - the stage is taken, or being cleared";
  else this.last = what;

  return put > 0;
};

/**
 * Clears tiles the way the game does (the city builder's client/
 * terrainman): what stands on them stays till a bulldozer gets to it, and
 * what it all came to goes up once over the lot.
 *
 * @param tiles {number[]}
 * @returns {number} how many tiles were cleared, every tile of a building on
 *          any of them
 */
Bench.prototype.clear = function (tiles) {
  var c = city(this),
    client = this.client,
    total = 0,
    count = 0,
    x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;

  if (!c || tiles.length === 0) return 0;

  //never short of it here
  if (!c.resourcesService.hasEnoughResource(Resource.money, PURSE / 2))
    c.resourcesModule.addResource(Resource.money, PURSE);

  tiles.forEach(function (tile) {
    x0 = Math.min(x0, Terrain.extractX(tile));
    y0 = Math.min(y0, Terrain.extractY(tile));
    x1 = Math.max(x1, Terrain.extractX(tile));
    y1 = Math.max(y1, Terrain.extractY(tile));
  });

  client.clearworks.clear(tiles, function (tile) {
    var cleared = c.clearTile(tile);

    count += cleared.length;
    total += cleared.length * Core.Config.clearTileCost;

    return cleared;
  });

  if (total > 0)
    client.buildman.showCost(
      Terrain.convertToIndex(x0, y0),
      x1 - x0 + 1,
      y1 - y0 + 1,
      total,
    );

  this.said = count === 0 ? "nothing there to clear" : "";

  return count;
};

/**
 * Clears the whole of the stage.
 */
Bench.prototype.clearStage = function () {
  return this.stage === null ? 0 : this.clear(stageTiles(this));
};

/**
 * What was last put up on the stage, put up again and cleared a moment
 * after - once the stage is clear of the last time.
 *
 * @returns {boolean} whether it went
 */
Bench.prototype.again = function () {
  var self = this;

  if (this.last === null) {
    this.said = "put something up first";
    return false;
  }

  if (!this.put(this.last)) return false;

  //a moment to see it up, as the game goes
  wait(this, 900, function () {
    self.clearStage();
  });

  return true;
};

//f once the client's clock has gone ms on - as fast as it goes
function wait(self, ms, f) {
  var time = self.client.game.time,
    until = time.time + ms,
    timer = setInterval(function () {
      if (time.time < until) return;

      clearInterval(timer);
      f();
    }, 30);
}

/**
 * Picks tiles to clear the way the game picks ground - dragged, resized by
 * the handles round them, a building tapped picking what it stands on - or
 * stops picking, with false. Starts on the tile in the middle of the screen.
 */
Bench.prototype.pick = function (on) {
  var self = this,
    root = this.client;

  if (on === (this.picker !== null)) return;

  root.ui.gameScreen().worldScreen().busy(on);

  if (!on) {
    this.picker.dispose();
    this.picker = null;
    root.hiliteMan.disable(this.outlines);
    this.outlines = [];
    return;
  }

  this.picker = new AreaSelector(root, { underwater: true, buildings: true });
  Events.on(this.picker, AreaSelector.events.change, function () {
    outline(self);
  });
  outline(this);
};

//the tiles picked, outlined
function outline(self) {
  var root = self.client;

  root.hiliteMan.disable(self.outlines);
  self.outlines = root.hiliteMan.hilite(
    self.picker.tiles().map(function (tile) {
      return {
        x: Terrain.extractX(tile),
        y: Terrain.extractY(tile),
        borderColor: PICKED,
        borderWidth: 2,
        underwater: true,
      };
    }),
  );
}

/**
 * Clears the tiles picked.
 */
Bench.prototype.clearPicked = function () {
  if (this.picker === null) {
    this.said = "pick some ground first";
    return 0;
  }

  return this.clear(this.picker.tiles());
};

//whether the world's own scenery drawn on a tile is a tree, not stones
function tree(self, tile) {
  var go = self.client.envman._scenery[tile];

  return go !== undefined && /^gen\/trees\//.test(go.scenery.path);
}

/**
 * Picks the patch of the world's own woods nearest the stage with the most
 * standing trees on it, four by three - for the ground to be cleared of
 * them - and looks at it: of the trees drawn, round what is in sight.
 *
 * @returns {boolean} whether there is one
 */
Bench.prototype.woods = function () {
  var core = this.core,
    s = this.stage || { x: 0, y: 0 },
    best = null;

  for (var x = s.x - FAR; x < s.x + FAR; x++)
    for (var y = s.y - FAR; y < s.y + FAR; y++) {
      var n = 0,
        tiles = [];

      for (var i = 0; i < 4; i++)
        for (var j = 0; j < 3; j++) {
          var tile = Terrain.convertToIndex(x + i, y + j);

          tiles.push(tile);
          if (tree(this, tile)) n++;
          if (core.buildingService.get(tile) !== null) n -= 100;
        }

      var far = Math.hypot(x - s.x, y - s.y);

      if (n > 0 && (best === null || n * 10 - far > best.score))
        best = { score: n * 10 - far, tiles: tiles, x: x, y: y };
    }

  if (best === null) {
    this.said = "no woods near the stage";
    return false;
  }

  lookAtTile(this, best.x + 2, best.y + 1.5);
  this.pick(true);
  this.picker.selectTiles(best.tiles);
  outline(this);

  return true;
};

/**
 * Turns the camera round by a quarter turn either way, or looks from straight
 * above, or back.
 */
Bench.prototype.turn = function (by) {
  this.client.turnView(by);
};

Bench.prototype.top = function (on) {
  this.client.setTopView(on);
};

/**
 * What is going on: the bulldozers out, the tiles still waiting for one,
 * what is coming down and going over - for the page's panel.
 */
Bench.prototype.status = function () {
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
    roads: Object.keys(root.buildman.held).filter(function (tile) {
      var b = root.buildman.held[tile];

      return b.staticData && b.staticData.classCode === BuildingClassCode.road;
    }).length,
  };
};
