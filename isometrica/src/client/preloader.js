/**
 * Paints ahead the pictures the city will want once the camera turns: for
 * every generated picture on screen, from the side of the world the camera
 * is on, the same thing's pictures from the other sides (client/generator
 * ahead) -
 * kept apart, and handed over the moment they are wanted, so that a turn
 * finds them there rather than having them all painted then.
 *
 * Only ever after what is wanted now: one is asked for only while nothing
 * wanted is being waited for, and no more than AHEAD of them at a time, for
 * anything wanted to be painted next. The two sides next to the one the
 * camera is on come first, the far side after them, and the cars - which go
 * every way anyway - last; and those for what is no longer on screen are let
 * go of, for room for those that are.
 *
 * Which picture is which side's is in its name (shared/gen): a part turned
 * by r0 to r3 (a building's, a tree's, a park's), a code of four - the
 * corners of a tile of ground, the ways a road goes - which turns round as
 * the world does, and the way a car faces, x+, y-, x+y-. The other sides'
 * are those names turned - those there are.
 */

//how many are painted ahead at a time, at most; how often it looks whether
//it can ask for more, ms; how often it looks over what is on screen, ms, and
//over how many frames back something drawn is taken to be on it
var AHEAD = 2,
  EVERY = 40,
  SURVEY_EVERY = 1000,
  RECENT = 30;

//the ways a car faces, a quarter turn apart
var HEADINGS = ["x+", "y+", "x-", "y-"];

//one part of a name turned by n quarter turns, either way (way 1 or -1) - or
//null if it is not one that turns
function turnPart(part, n, way) {
  var m;

  if ((m = /^r([0-3])$/.exec(part)))
    return "r" + ((((+m[1] + n * way) % 4) + 4) % 4);

  if ((m = /^([0-9]{4})(_\d+)?$/.exec(part))) {
    var code = m[1],
      k = (((n * way) % 4) + 4) % 4;

    return code.slice(k) + code.slice(0, k) + (m[2] || "");
  }

  if (/^([xy][+-])+$/.test(part))
    return part.replace(/[xy][+-]/g, function (h) {
      return HEADINGS[(((HEADINGS.indexOf(h) + n * way) % 4) + 4) % 4];
    });

  return null;
}

/**
 * The names of the same thing's pictures from the other sides, those there
 * are: [name, look, near] - near, a side next to it rather than across.
 */
function others(sprites, name) {
  var look = null,
    hash = name.indexOf("#");

  if (hash >= 0) {
    look = name.slice(hash + 1);
    name = name.slice(0, hash);
  }

  if (name.indexOf("@t") >= 0) return [];

  var parts = name.split("/"),
    turning = parts.map(function (p) {
      return turnPart(p, 0, 1) !== null;
    });

  if (turning.indexOf(true) === -1) return [];

  var out = [],
    seen = {};

  [1, 3, 2].forEach(function (n) {
    //which way each part turns as the world does is its own: both ways
    [1, -1].forEach(function (way) {
      var turned = parts
        .map(function (p, i) {
          return turning[i] ? turnPart(p, n, way) : p;
        })
        .join("/");

      if (turned !== name && !seen[turned] && sprites.sheets[turned]) {
        seen[turned] = true;
        out.push([turned, look, n !== 2]);
      }
    });
  });

  return out;
}

/**
 * @param sprites {SpriteCache} its generator painting, its canvas cache
 *        saying what is on screen
 */
function Preloader(sprites) {
  var self = this;

  this.sprites = sprites;
  this.generator = sprites.generator;
  //what to paint ahead: the near sides', the far sides', the cars'
  this.queues = [[], [], []];
  this.surveyed = 0;

  setInterval(function () {
    self.pump();
  }, EVERY);
}

/**
 * What is on screen - the pictures drawn in the last RECENT frames (client/
 * canvascache) - and from that, what to paint ahead: those same things'
 * pictures from the other sides, each in the looks it is drawn in.
 */
Preloader.prototype.survey = function () {
  var cache = this.sprites.cache,
    since = cache.clock.frame - RECENT,
    names = {},
    queues = [[], [], []],
    self = this,
    i;

  for (i = 0; i < cache.slotCount; i++) {
    //a picture, or one of the looks of one it is drawn in (client/
    //cachedsprite Layers)
    var e = cache.owners[i],
      parts = e && (e.parts || (e.sprite && e.sprite.parts));

    if (!parts || cache.slotUsed[i] < since) continue;

    for (var k = 0; k < parts.length; k++) {
      var g = parts[k].sheet && parts[k].sheet.generated;

      if (g)
        names[e.look ? g.name.split("#")[0] + "#" + e.look : g.name] = true;
    }
  }

  var queued = {};

  Object.keys(names).forEach(function (name) {
    var car = name.indexOf("/vehicles/") >= 0;

    others(self.sprites, name).forEach(function (o) {
      var key = o[0] + (o[1] ? "#" + o[1] : "");

      if (queued[key]) return;
      queued[key] = true;
      queues[car ? 2 : o[2] ? 0 : 1].push(o);
    });
  });

  this.queues = queues;
  this.onScreen = Object.keys(names).length;
  //and what was painted ahead for what is no longer on screen let go of,
  //for room for what is
  this.generator.keep(queued);
};

//as many as may be painted ahead now asked for - only while nothing wanted
//is being waited for, and there is room for them (client/generator STASH) -
//what is on screen looked over now and then
Preloader.prototype.pump = function () {
  var g = this.generator,
    now = Date.now();

  if (now - this.surveyed > SURVEY_EVERY) {
    this.surveyed = now;
    this.survey();
  }

  while (g.idle() && g.roomy() && g.comingCount < AHEAD) {
    var o =
      this.queues[0].shift() ||
      this.queues[1].shift() ||
      this.queues[2].shift();

    if (o === undefined) return;

    var sheet = this.sprites.sheets[o[0]];

    if (sheet && o[1] !== null) sheet = this.sprites.lookSheet(sheet, o[1]);
    if (sheet) g.ahead(sheet);
  }
};

export default Preloader;
