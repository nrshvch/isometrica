import View from "./view";
import Config from "./config";
import Core from "../core/main";
import Rotation from "../core/rotation";

/**
 * Gets the world ready to be seen from the other sides before the camera
 * turns there, so that a turn shows it all straight away - every picture
 * whole, as it is drawn, not a piece of it missing nor painted a moment
 * later.
 *
 * Now and then (SURVEY_EVERY) - a little at a time, a few frames over, not
 * to hold any one up (SURVEY_MS) - it works out what would be on the screen from
 * each of the other sides - the two next to the one the camera is on first,
 * then the far side: the camera turned about where it is, the ground under
 * the middle of the screen (CameraScript turn), and what stands where it
 * would be seen from there - and what each of those things would be drawn
 * with from there (View peek, and every manager's seenSprites): the ground,
 * the trees, the buildings and the roads, the cars.
 *
 * Every frame, in what time painting has left in it once what is drawn has
 * had its share (client/canvascache warm), it puts those pictures on the
 * pages as they are drawn - lit, and at night the night's too - their parts
 * painted first, after anything wanted now (client/generator ahead). Only
 * where there is room: they never take the place of anything drawn lately,
 * and give their own up to whatever is drawn - and are kept there as long
 * as they would be seen from a side next to it, the one the camera came
 * from among them, so that it can turn back too.
 *
 * Nothing of it while the world is looked at from above, which is not
 * turned, nor while it is turning.
 */

//how often it looks over what would be seen from the other sides, ms; how
//long it may go through what is still to be put on the pages, a frame, ms;
//and how many frames something on the pages must have gone undrawn for it
//to be put away for what is to be ready
var SURVEY_EVERY = 1000,
  STEP_MS = 3,
  AGE = 240;

//how long it may go on looking over what would be seen, a frame, ms; and how
//many tiles, or buildings, it looks at at a time
var SURVEY_MS = 2,
  TILES_AT_ONCE = 250,
  BUILDINGS_AT_ONCE = 12;

//how far past the edges of the screen something is still taken to be seen,
//in pixels: across, above, and below - a tall building standing up over the
//tile it is drawn from - with room for a turn's pictures, which take in a
//little more than over says round where the turn lands (client/turner)
var MARGIN_X = 200,
  MARGIN_TOP = 200,
  MARGIN_BOTTOM = 500;

//the sides, in the order they are got ready: a quarter turn either way,
//then half a turn - and the side the camera is on, past the edges of the
//screen as far as a turn's pictures of it take in (client/turner over)
var SIDES = [1, 3, 2, 0];

/**
 * @param sprites {SpriteCache} its generator painting, its canvas cache
 *        holding the pictures drawn
 */
function Preloader(sprites) {
  this.sprites = sprites;
  this.generator = sprites.generator;
  //what is still to be put on the pages: entries of the canvas cache (client/
  //cachedsprite entries), those of the sides next to it first - and how far
  //through them it has got
  this.queue = [];
  this.at = 0;
  this.surveyed = 0;
  //the look over what would be seen going on, a few frames over - or null
  this.pass = null;
  //how many there are to have ready, on the pages or not, for a look
  this.wanted = 0;
}

/**
 * Once a frame has been drawn (client/lighting end): what would be seen from
 * the other sides looked over now and then, and as much of it put on the
 * pages as there is time for.
 *
 * @param root {Vkaria}
 */
Preloader.prototype.step = function (root) {
  var now = performance.now();

  if (View.top() || turning(root)) return;

  //a look over begun from the side the camera was on before it turned is
  //started over
  if (this.pass !== null && this.pass.turns !== View.turns()) this.pass = null;

  if (this.pass === null && now - this.surveyed > SURVEY_EVERY) {
    this.surveyed = now;
    this.begin(root);
  }

  if (this.pass !== null) this.work(SURVEY_MS);

  //anything wanted now goes first
  if (this.queue.length === 0 || !this.generator.idle()) return;

  var queue = this.queue,
    cache = this.sprites.cache,
    started = performance.now(),
    n = queue.length,
    k;

  for (k = 0; k < n && performance.now() - started < STEP_MS; k++) {
    var i = (this.at + k) % n,
      e = queue[i];

    if (e === null) continue;
    if (e.slot >= 0) {
      queue[i] = null;
      continue;
    }

    if (!this.painted(e)) continue;

    //no room, or no time left this frame: more next frame
    if (!cache.warm(e, AGE)) break;

    queue[i] = null;
  }

  this.at = (this.at + k) % n;
};

/**
 * Whether every part an entry is put together from is painted - asking for
 * those that are not to be painted ahead, after anything wanted now.
 */
Preloader.prototype.painted = function (e) {
  var sheets = e.sheets(),
    all = true;

  for (var j = 0; j < sheets.length; j++) {
    var sheet = sheets[j];

    if (sheet.image !== null) continue;

    all = false;
    if (sheet.generated !== null) this.generator.ahead(sheet);
    else this.sprites.loadSheet(sheet);
  }

  return all;
};

/**
 * What would be on the screen from each of the other sides, and what it
 * would be drawn with: what is on the pages already kept there, the rest
 * to be put there - and of the parts painted ahead, those still to be put
 * together kept, the rest let go of. All of it at once (begin and work
 * go over it a few frames at a time).
 */
Preloader.prototype.survey = function (root) {
  this.begin(root);
  if (this.pass !== null) this.work(Infinity);
};

/**
 * Starts looking over what would be seen from the other sides: the camera
 * as it is now, and what there is to look at then, cut up into tasks - a
 * few tiles, a few buildings at a time - each for one side.
 */
Preloader.prototype.begin = function (root) {
  var camera = root.camera && root.camera.camera,
    viewport = camera && camera.viewport;

  if (!viewport || !this.generator) return;

  var M = camera.getWorldToScreen().slice(),
    pos = root.camera.transform.getPosition(),
    lighting = root.lighting,
    //as much more than the screen shows as a turn's pictures take in
    over = (root.cameraControl && root.cameraControl.turner.over) || 1,
    turns = View.turns(),
    tiles = root.terrain ? root.terrain.tileKeys() : [],
    scenery = root.envman ? root.envman.sceneryKeys() : [],
    buildings = root.buildman ? root.buildman.getBuildingViews() : [],
    tasks = [],
    i;

  SIDES.forEach(function (by) {
    var near = nearAfter(
      M,
      pos[0],
      pos[2],
      by,
      viewport.width,
      viewport.height,
      over,
    );

    //each a part of what there is, seen from that side, into out
    function task(look) {
      tasks.push(function (out) {
        View.peek(turns + by, function () {
          look(out, near);
        });
      });
    }

    for (i = 0; i < tiles.length; i += TILES_AT_ONCE)
      (function (keys) {
        task(function (out, near) {
          root.terrain.seenSprites(out, near, keys);
        });
      })(tiles.slice(i, i + TILES_AT_ONCE));

    for (i = 0; i < scenery.length; i += TILES_AT_ONCE)
      (function (keys) {
        task(function (out, near) {
          root.envman.seenSprites(out, near, keys);
        });
      })(scenery.slice(i, i + TILES_AT_ONCE));

    for (i = 0; i < buildings.length; i += BUILDINGS_AT_ONCE)
      (function (some) {
        task(function (out, near) {
          some.forEach(function (b) {
            if (b.view && b.view.seenSprites && nearAny(b, near))
              b.view.seenSprites(out);
          });
        });
      })(buildings.slice(i, i + BUILDINGS_AT_ONCE));

    if (root.carman)
      task(function (out, near) {
        root.carman.seenSprites(out, near);
      });
  });

  this.pass = {
    turns: turns,
    tasks: tasks,
    at: 0,
    lit: !!lighting && !lighting.plain,
    night: !!lighting && lighting.night,
    seen: new Set(),
    queue: [],
    sheets: {},
    wanted: 0,
  };
};

/**
 * Goes on looking over what would be seen, for so long at most, ms - and
 * once it has looked at all of it, has what it found got ready.
 */
Preloader.prototype.work = function (ms) {
  var pass = this.pass,
    cache = this.sprites.cache,
    started = performance.now(),
    sprites = [];

  while (pass.at < pass.tasks.length && performance.now() - started < ms)
    pass.tasks[pass.at++](sprites);

  sprites.forEach(function (sprite) {
    if (!sprite) return;

    //water's ripples, every frame of them
    (sprite.frames || [sprite]).forEach(function (s) {
      if (!s || s.entries === undefined || pass.seen.has(s)) return;
      pass.seen.add(s);

      s.entries(pass.lit, pass.night).forEach(function (e) {
        pass.wanted++;

        if (e.slot >= 0) {
          cache.keepWarm(e);
          return;
        }

        pass.queue.push(e);
        e.sheets().forEach(function (sheet) {
          if (sheet.generated !== null)
            pass.sheets[sheet.generated.name] = true;
        });
      });
    });
  });

  if (pass.at < pass.tasks.length) return;

  this.pass = null;
  this.queue = pass.queue;
  this.at = 0;
  this.wanted = pass.wanted;
  //of the parts painted ahead, only those still to be put together kept
  this.generator.keep(pass.sheets);
};

/**
 * Whether any of a building's ground would be seen (near) - any corner of
 * it, or its middle: a big one's tile it stands on may be off the screen
 * while much of it is on it.
 */
function nearAny(b, near) {
  var data = b.data,
    staticData = b.staticData;

  if (!data || data.tile === undefined) return false;

  var x = Core.Terrain.extractX(data.tile),
    y = Core.Terrain.extractY(data.tile),
    sx = staticData ? Rotation.sizeX(staticData, data.rotation) || 1 : 1,
    sy = staticData ? Rotation.sizeY(staticData, data.rotation) || 1 : 1,
    ts = Config.tileSize,
    points = [
      [x, y],
      [x + sx - 1, y],
      [x, y + sy - 1],
      [x + sx - 1, y + sy - 1],
      [x + (sx - 1) / 2, y + (sy - 1) / 2],
    ];

  return points.some(function (p) {
    return near(p[0] * ts, p[1] * ts);
  });
}

//whether the world is being turned just now (client/turner)
function turning(root) {
  return !!(root.cameraControl && root.cameraControl.turner.active);
}

/**
 * Whether a point of the ground, x, z in the world, would be on the screen -
 * or near enough its edges - once the camera is turned `by` quarter turns:
 * turned about where it is (cx, cz), the ground in the middle of the screen,
 * which is the world turned the other way about that (CameraScript turn).
 * The screen taken `over` times as big about its middle, as a turn's
 * pictures take it in.
 */
function nearAfter(M, cx, cz, by, w, h, over) {
  var a = (by * Math.PI) / 2,
    c = Math.round(Math.cos(a)),
    s = Math.round(Math.sin(a)),
    //the screen as far as it is taken in, about its middle
    x0 = (w * (1 - over)) / 2 - MARGIN_X,
    x1 = (w * (1 + over)) / 2 + MARGIN_X,
    y0 = (h * (1 - over)) / 2 - MARGIN_TOP,
    y1 = (h * (1 + over)) / 2 + MARGIN_BOTTOM;

  return function (x, z) {
    var dx = x - cx,
      dz = z - cz,
      wx = cx + c * dx + s * dz,
      wz = cz - s * dx + c * dz,
      sx = M[0] * wx + M[8] * wz + M[12],
      sy = M[1] * wx + M[9] * wz + M[13];

    return sx > x0 && sx < x1 && sy > y0 && sy < y1;
  };
}

export default Preloader;
