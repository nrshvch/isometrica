/**
 * A stage for a bench to draw on (lab/buildings.html): the game's own
 * drawing - its engine, its pictures, its light and its camera (client/vkaria
 * prepare, start) - and of a world nothing but a patch of flat grass, drawn
 * the way the game draws ground (client/terrain), on ground of its own laid
 * flat the way a save lays it (core/terrain load). Nothing else runs: no
 * world ticking, no city, no bulldozers, no traffic - what is drawn on it is
 * whatever the bench puts there. The light is ten in the morning's, the
 * weather clear, nothing is heard; and it goes as fast or as slowly as
 * asked, or not at all.
 */
import Client from "../../src/client/main";
import Config from "../../src/client/config";
import Weather from "../../src/client/weather";
import Terrain from "../../src/core/terrain";
import BuildingCode from "../../src/data/buildingcode";
import BuildingData from "../../src/data/buildings";
import BuildingClassCode from "../../src/data/classcode";

//how high the ground is, steps
var GROUND = 2;

//the middle of the stage, a tile anywhere
var MIDDLE = Terrain.convertToIndex(30000, 30000);

//the hour it is, ms of the day
var TEN = 10 * 3600000;

//how close the camera is to begin with (engine CameraComponent zoom)
var CLOSE = 2;

/**
 * Brings a stage up in el, the camera over its middle.
 *
 * @param el {HTMLElement}
 * @returns {Promise<Stage>}
 */
export function open(el) {
  Weather.override = "clear";

  var terrain = new Terrain(null),
    //all there is of a world for the drawing: the ground, the hour, and no
    //building anywhere next to one (client/compoundbuilding walled)
    core = {
      terrain: terrain,
      time: { now: TEN, hour: 10, minute: 0, day: 1 },
      buildingService: {
        get: function () {
          return null;
        },
      },
    },
    client;

  core.world = core;
  client = new Client.Vkaria(core, null, null);

  //nothing to hear
  client.sound.wants.music = client.sound.wants.sounds = false;
  client.sound.on = false;

  return new Promise(function (resolve) {
    client.prepare(resolve);
  }).then(function () {
    client.start();
    attach(client, el);
    client.terrain.init();

    return new Stage(core, client);
  });
}

//drawn into el, in a canvas the size of it (as the city builder's
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

function Stage(core, client) {
  this.core = core;
  this.client = client;
  //how fast it goes: 1 as the game goes, 0 stood still
  this.speed = 1;
  //the patch of ground drawn, {x, y, w, h} in tiles - none yet (ground)
  this.area = null;

  pace(this);
  this.look(0, 0);
  client.camera.cameraScript.zoom(CLOSE);

  //for the console: bench.stage
  window.bench = { stage: this };
}

//the clock going speed times as fast as the real one
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

/**
 * The tile dx, dy from the middle of the stage.
 */
Stage.prototype.tile = function (dx, dy) {
  return MIDDLE + dx + dy * Terrain.dy;
};

/**
 * The patch of ground drawn, w by h tiles from dx, dy off the middle: flat
 * grass - and nothing else; the patch drawn before it gone where it is not
 * this one.
 */
Stage.prototype.ground = function (dx, dy, w, h) {
  var terrain = this.client.terrain,
    x0 = Terrain.extractX(MIDDLE) + dx,
    y0 = Terrain.extractY(MIDDLE) + dy,
    was = this.area,
    points = [],
    tiles = [],
    i,
    j;

  for (i = 0; i <= w; i++)
    for (j = 0; j <= h; j++)
      points.push([Terrain.convertToIndex(x0 + i, y0 + j), GROUND]);

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) tiles.push(Terrain.convertToIndex(x0 + i, y0 + j));

  this.core.terrain.load({ points: points });
  this.area = { x: x0, y: y0, w: w, h: h };

  if (was !== null)
    for (i = was.x; i < was.x + was.w; i++)
      for (j = was.y; j < was.y + was.h; j++)
        if (i < x0 || i >= x0 + w || j < y0 || j >= y0 + h)
          terrain.clear(i, j, 1, 1);

  terrain.draw(x0, y0, w, h);
  terrain.redraw(tiles);
};

/**
 * The camera over the ground x, y tiles from the middle of the stage - a
 * tile's middle for whole numbers.
 */
Stage.prototype.look = function (x, y) {
  this.client.camera.cameraScript.lookAt(
    (Terrain.extractX(MIDDLE) + x) * Config.tileSize,
    (Terrain.extractY(MIDDLE) + y) * Config.tileSize,
  );
};

/**
 * The camera turned a quarter turn either way, or looking from straight
 * above, or back.
 */
Stage.prototype.turn = function (by) {
  this.client.turnView(by);
};

Stage.prototype.top = function (on) {
  this.client.setTopView(on);
};

/**
 * What is going on, by what is drawn: what is coming down (client/demolition),
 * the heaps of rubble, the stretches of fence, the pieces flung about.
 */
Stage.prototype.status = function () {
  var named = {};

  this.client.game.logic.world.gameObjects.forEach(function (go) {
    if (go && go.world !== null && go.name)
      named[go.name] = (named[go.name] || 0) + 1;
  });

  return {
    coming: named.demolition || 0,
    rubble: named.rubble || 0,
    fence: named.fence || 0,
  };
};

/**
 * What can be put up that comes down: every building there is but the
 * roads, the trees and the cliffs - one of each kind that comes in several
 * (data/buildings variants) - by name, the smallest first.
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
        b.code !== BuildingCode.cliff
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
