/**
 * Which chunks of ground are drawn: regions of a quadtree whose leaves are
 * the chunks, and the camera an observer with rings that hold
 * (shared/interest) - worked out once a frame from where the camera ended
 * up. Skill rendering, chunks.md.
 */
import engine from "engine";
import Config from "./config";
import Events from "events";
import Core from "../core/main";
import { Interest, NEAR, UNLOADED, VIEW } from "shared/interest";
import { Quadtree } from "shared/spatial";
import { List, NumMap } from "shared/typed";

var events = {
  tileLoad: 0,
  tileRemove: 1,
};

//how long a chunk stays a level up once the camera has gone (shared/interest
//hold), ms: a chunk left goes down to near after it, and is let go of after
//it once more
var HOLD = 2000;

//how far out the coarse ring reaches, in chunks: entered at three beyond the
//view, left beyond four
var COARSE_ENTER = 3,
  COARSE_LEAVE = 4;

//a tile is this many pixels across on screen from the side, and half as many
//down; from above, a unit of the world is this many (camerascript TOP_SCALE)
var TILE_WIDTH = Config.tileSize * Math.SQRT2,
  TOP_SCALE = Math.SQRT2;

function Tilesman() {
  this.chunkSize = Config.chunkSize;
  this.events = events;

  var size = this.chunkSize * Config.tileSize,
    depth = 0;

  //the chunks are the leaves; the root covers every tile there can be
  while (this.chunkSize * Math.pow(2, depth) < 65536) depth++;

  var tree = Quadtree(0, 0, size * Math.pow(2, depth), depth);

  this.tree = tree;
  this.depth = depth;
  //drawn in the view ring, kept in the near one: a chunk a frame's footprint
  //touches is drawn, and let go of only once a chunk and more beyond it; the
  //coarse ring is the traffic's (client/carman), nothing drawn in it
  this.interest = Interest(
    {
      within: function (minX, minZ, maxX, maxZ, out) {
        return tree.within(minX, minZ, maxX, maxZ, depth, out);
      },
      bounds: tree.bounds,
    },
    {
      rings: {
        view: { enter: 0, leave: size },
        near: { enter: size, leave: 2 * size },
        coarse: { enter: COARSE_ENTER * size, leave: COARSE_LEAVE * size },
      },
      hold: HOLD,
      keepAlive: HOLD,
    },
  );
  this.observer = this.interest.observer();
  //the chunks drawn, by key, and listed
  this.made = NumMap(64);
  this.list = List(Float64Array, 64);
  this.camera = null;
  //what of the ground the camera saw when it last moved, x and z, min then
  //max (footprint) - for what is found by its reach (client/smoke)
  this.seen = new Float64Array(4);
  //told of every region's level changing (listen)
  this.listeners = [];
  //counted up whenever a chunk is drawn or let go of: what was found in
  //the chunks drawn is found again (client/carman)
  this.version = 0;

  var self = this;

  //only noted: the chunks follow where the camera is at the next frame
  this.onCameraMove = function () {
    self.moved = true;
  };
}

Tilesman.events = events;

Tilesman.prototype.constructor = Tilesman;

Tilesman.prototype.chunkSize = 24;
Tilesman.prototype.moved = false;

//once nothing more moves, how long until nothing more changes, ms - for the
//tools that count what is made and let go of (tools/world/streams)
Tilesman.prototype.settle = 2 * HOLD + 100;

/**
 * The region (a leaf: a chunk) tile x, y is in, -1 outside the world.
 */
Tilesman.prototype.regionOf = function (x, y) {
  var s = this.chunkSize;

  return this.tree.key(Math.floor(x / s), Math.floor(y / s), this.depth);
};

//the tile at a region's corner, x and y
Tilesman.prototype.cornerX = function (key) {
  return this.tree.cellX(key) * this.chunkSize;
};

Tilesman.prototype.cornerY = function (key) {
  return this.tree.cellZ(key) * this.chunkSize;
};

/**
 * The level of a region (shared/interest VIEW, NEAR, COARSE, KEEP or
 * UNLOADED).
 */
Tilesman.prototype.levelOf = function (key) {
  return this.interest.levelOf(key);
};

//whether a region's chunk is drawn
Tilesman.prototype.drawn = function (key) {
  return this.made.has(key);
};

/**
 * fn(key, from, to) for every region whose level changes, once a frame -
 * told at once of every region that has a level already, as from UNLOADED.
 */
Tilesman.prototype.listen = function (fn) {
  var regions = this.interest.regions;

  this.listeners.push(fn);
  for (var i = 0; i < regions.count; i++) {
    var slot = regions.live[i],
      level = regions.cols.level[slot];

    if (level !== UNLOADED) fn(regions.cols.key[slot], UNLOADED, level);
  }
};

/**
 * Holds the chunks as they are while on - none drawn nor let go of however
 * the camera moves meanwhile, while the camera is turned round the world,
 * say (client/turner), not for pictures of it - and once off, the next frame
 * catches up with where the camera is then.
 */
Tilesman.prototype.held = false;

Tilesman.prototype.hold = function (on) {
  this.held = on;
};

Tilesman.prototype.start = function () {
  var cam = vkaria.game.logic.world.findByName("mainCamera"),
    ticker = new engine.GameObject("tilesman"),
    script = new engine.Component(),
    self = this;

  this.camera = cam;
  cam.camera.addEventListener(cam.camera.events.update, this.onCameraMove);
  //only the tiles around the ground that moved have to be drawn again
  Events.on(
    vkaria.core.terrain,
    Core.Terrain.events.gridUpdate,
    function (terrain, args) {
      vkaria.terrain.redraw(args.tiles);
    },
    this,
  );

  script.profileName = "tilesman";
  script.tick = function () {
    self.update(performance.now());
  };
  ticker.addComponent(script);
  vkaria.game.logic.world.addGameObject(ticker);

  //the chunks round where the camera starts, for whoever comes up next
  this.update(performance.now());
};

var box = new Float64Array(4),
  position = new Float32Array(3);

/**
 * What of the ground the camera sees, as a box in the world (x, z): from the
 * side, the screen's corners along the tiles' axes, which run corner to
 * corner across it; from above, the screen itself.
 */
function footprint(camera, out) {
  var corner = camera.camera.frustumSize[1],
    p = camera.transform.getPosition(position),
    hx,
    hz;

  if (camera.cameraScript && camera.cameraScript.top) {
    hx = corner[0] / TOP_SCALE;
    hz = corner[1] / TOP_SCALE;
  } else {
    hx = hz =
      (corner[0] / TILE_WIDTH + corner[1] / (TILE_WIDTH / 2)) * Config.tileSize;
  }

  out[0] = p[0] - hx;
  out[1] = p[2] - hz;
  out[2] = p[0] + hx;
  out[3] = p[2] + hz;

  return out;
}

/**
 * Once a frame: the rings worked out again from where the camera is, and
 * what came into view drawn, what has gone beyond the near ring let go of.
 */
Tilesman.prototype.update = function (now) {
  if (this.held || this.camera === null) return;

  var interest = this.interest;

  if (this.moved || interest.count === 0) {
    footprint(this.camera, box);
    this.seen.set(box);
    interest.look(this.observer, box[0], box[1], box[2], box[3]);
    this.moved = false;
  }

  var n = interest.update(now),
    changes = interest.changes,
    listeners = this.listeners;

  for (var i = 0; i < n; i++) {
    var key = changes.key[i],
      to = changes.to[i];

    if (to === VIEW && !this.made.has(key)) load(this, key);
    else if (to < NEAR && this.made.has(key)) unload(this, key);

    for (var k = 0; k < listeners.length; k++)
      listeners[k](key, changes.from[i], to);
  }
};

function load(self, key) {
  var s = self.chunkSize,
    x = self.tree.cellX(key) * s,
    y = self.tree.cellZ(key) * s;

  self.made.set(key, 1);
  self.list.push(key);
  self.version++;
  Events.fire(self, events.tileLoad, { meta: { x: x, y: y, w: s, h: s } });
  vkaria.terrain.draw(x, y, s, s);
}

function unload(self, key) {
  var s = self.chunkSize,
    x = self.tree.cellX(key) * s,
    y = self.tree.cellZ(key) * s;

  self.made.delete(key);
  self.list.remove(key);
  self.version++;
  Events.fire(self, events.tileRemove, { x: x, y: y, w: s, h: s });
  vkaria.terrain.clear(x, y, s, s);
}

/**
 * The chunks drawn, as the tile at their corner.
 *
 * @returns {{x: number, y: number}[]}
 */
Tilesman.prototype.getCurrentChunks = function () {
  var r = [],
    s = this.chunkSize;

  for (var i = 0; i < this.list.count; i++)
    r.push({
      x: this.tree.cellX(this.list.items[i]) * s,
      y: this.tree.cellZ(this.list.items[i]) * s,
    });

  return r;
};

export default Tilesman;
