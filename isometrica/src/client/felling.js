import engine from "engine";
import Events from "events";
import Config from "./config";
import View from "./view";
import Carman from "./carman";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";

/**
 * A tree pushed over by the bulldozer clearing it (client/clearworks).
 *
 * As the blade bites, it shudders a moment where it stands; then it goes
 * over the way it is pushed - slowly at first, faster and faster - through
 * the pictures painted of it going over (shared/gen/trees FALLS), and hits
 * the ground in a puff of dust along the length of it. It lies there a
 * moment, and is gone, a pixel at a time, dithered the way the smoke is.
 *
 * It is pushed the way the bulldozer drives, the nearest of the ways along
 * the tiles - one way or the other for one driving aslant, the same every
 * time for the same tile. Whatever it was drawn as is let go of as it starts
 * to go over: this draws it from then on, from the picture it was drawn
 * with. A stump, the wood lying about already, a stone, is not pushed over
 * but gone at once, in the bulldozer's dust; and from straight above, or
 * turned round while it falls, it is gone too.
 */
var Felling = {};

//how long it shudders before it goes, ms - the pictures of it going over
//painted meanwhile - and how far it shakes, pixels; how long it takes to go
//over, from standing to lying; how long it lies there, and how long it
//takes going, a pixel at a time
var SHUDDER_MS = 260,
  SHAKE = 1,
  FALL_MS = 700,
  LIE_MS = 1300,
  GO_MS = 600;

//how long it waits, at most, for a picture of it going over to be painted,
//before going without the rest, ms
var WAIT_MS = 1500;

//how many pictures it goes over in, the last lying on the ground
//(shared/gen/trees FALLS)
var STAGES = 3;

//how many puffs of dust go up along it as it hits the ground, and how far
//along it they are, tiles
var PUFFS = 5,
  LONG = 1.4;

//what is going over now, to be gone the moment the camera turns
var falling = [],
  turned = null;

/**
 * Pushes over the tree drawn by renderer, the way push goes in the world
 * ("x+", "x+y-" - client/view headingOf), from where it stands on tile.
 *
 * @returns {boolean} whether it goes over - else whoever drew it lets it go
 *          at once, as ever
 */
Felling.fell = function (root, renderer, push, tile) {
  var names = picturesOf(root, renderer, push, tile);

  if (names === null) return false;

  var way = alongTiles(push, tile),
    go = new engine.GameObject("felling"),
    drawn = new engine.SpriteRenderer(),
    at = renderer.gameObject.transform.getPosition([0, 0, 0]);

  drawn.layer = renderer.layer;
  go.addComponent(drawn);
  drawn.setSprite(renderer.sprite);
  drawn.pivotX = renderer.pivotX;
  drawn.pivotY = renderer.pivotY;
  go.transform.setPosition(at[0], at[1], at[2]);

  var script = new FellingScript(root, names, View.headingVector(way));

  go.addComponent(script);
  root.game.logic.world.addGameObject(go);

  falling.push(script);
  if (turned === null)
    turned = Events.on(View, View.events.change, function () {
      falling.slice().forEach(function (f) {
        f.end();
      });
    });

  return true;
};

/**
 * Has the pictures of the tree drawn by renderer going over the way push
 * goes painted, as the bulldozer comes up to it, for it to go over at once
 * when it gets there (fell) - if it goes over at all.
 */
Felling.expect = function (root, renderer, push, tile) {
  var names = picturesOf(root, renderer, push, tile),
    lighting = root.lighting,
    lit = !!lighting && !lighting.plain;

  if (names === null) return;

  names.forEach(function (name) {
    root.sprites
      .getSprite(name)
      .entries(lit, lit && lighting.night)
      .forEach(function (e) {
        //waited for, not asked for every frame: painted, and kept a while
        e.sheets().forEach(function (sheet) {
          root.sprites.loadSheet(sheet).catch(function () {});
        });
      });
  });
};

//the pictures of the tree drawn by renderer going over the way push goes,
//standing to lying - null for none: not a tree standing tall, nothing to go
//over from, or seen from straight above
function picturesOf(root, renderer, push, tile) {
  if (!push || View.top() || !renderer || !renderer.sprite) return null;

  var base = renderer.sprite.key,
    seen = View.heading(alongTiles(push, tile)),
    names = [];

  if (typeof base !== "string" || seen === undefined) return null;

  for (var i = 1; i <= STAGES; i++) names.push(base + "/" + seen + "/" + i);

  return root.sprites.has(names[0]) ? names : null;
}

//the nearest way along the tiles to push: aslant, one way or the other of
//it, by the tile
function alongTiles(push, tile) {
  if (push.length <= 2) return push;

  return (tile | 0) & 1 ? push.slice(0, 2) : push.slice(2);
}

/**
 * Whether a picture is painted, as it is drawn now - asking for it if it is
 * not, which has to be asked every frame till it is (SpriteCache want).
 */
function ready(root, sprite) {
  var lighting = root.lighting,
    lit = !!lighting && !lighting.plain,
    all = true;

  sprite.entries(lit, lit && lighting.night).forEach(function (e) {
    if (!e.ready()) all = false;
  });

  return all;
}

function FellingScript(root, names, along) {
  engine.Component.call(this);

  this.root = root;
  this.frames = names.map(function (name) {
    return root.sprites.getSprite(name);
  });
  //where the foot is in each of them
  this.feet = names.map(function (name) {
    return root.sprites.frame(name);
  });
  this.along = along;
  //how far along it is, ms - held back while a picture it is to show next
  //is still being painted; and how long it has been held back
  this.t = 0;
  this.waited = 0;
  //which picture of it going over shows, 0 for standing
  this.stage = 0;
  this.pivotX = 0;
}

FellingScript.prototype = Object.create(engine.Component.prototype);
FellingScript.prototype.profileName = "felling";

FellingScript.prototype.start = function () {
  this.pivotX = this.gameObject.spriteRenderer.pivotX;
};

FellingScript.prototype.tick = function (time) {
  var renderer = this.gameObject.spriteRenderer,
    root = this.root,
    t = (this.t += time.dt);

  //shuddering, the pictures of it going over asked for meanwhile
  if (t < SHUDDER_MS) {
    for (var i = this.stage; i < STAGES; i++) ready(root, this.frames[i]);

    renderer.pivotX = this.pivotX + (Math.floor(t / 45) % 2 ? SHAKE : -SHAKE);
    return;
  }

  renderer.pivotX = this.pivotX;

  //going over, faster and faster: on to the next picture of it once it is
  //that far over - and painted, else it waits for it, a while
  if (this.stage < STAGES) {
    var k = Math.min(1, (t - SHUDDER_MS) / FALL_MS),
      stage = Math.min(STAGES, Math.floor(k * k * STAGES + 0.25));

    for (var s = this.stage; s < STAGES; s++) ready(root, this.frames[s]);

    if (stage > this.stage) {
      var next = this.frames[this.stage];

      if (!ready(root, next) && this.waited < WAIT_MS) {
        this.waited += time.dt;
        this.t -= time.dt;
        return;
      }

      //waited too long: gone as it is
      if (!ready(root, next)) {
        this.stage = STAGES;
        this.t = SHUDDER_MS + FALL_MS + LIE_MS;
        return;
      }

      var foot = this.feet[this.stage];

      this.stage++;
      renderer.setSprite(next);
      renderer.pivotX = this.pivotX = foot.pivotX;
      renderer.pivotY = foot.pivotY;

      if (this.stage === STAGES) landed(this);
    }

    return;
  }

  //lying there a moment, then gone a pixel at a time
  var going = (t - SHUDDER_MS - FALL_MS - LIE_MS) / GO_MS;

  if (going <= 0) return;

  if (going >= 1) {
    this.end();
    return;
  }

  renderer.dither = true;
  renderer.opacity = 1 - going;
};

//down on the ground: dust going up along the length of it, thrown out from
//under it
function landed(self) {
  var at = self.gameObject.transform.getPosition([0, 0, 0]),
    v = self.along,
    x = at[0] / Config.tileSize,
    y = at[2] / Config.tileSize;

  for (var i = 0; i < PUFFS; i++) {
    var d = 0.25 + (LONG * (i + Math.random() * 0.5)) / PUFFS,
      side = (Math.random() - 0.5) * 0.5,
      px = x + v[0] * d - v[1] * side,
      py = y + v[1] * d + v[0] * side;

    SmokeSource.puff(
      self.root.game.logic.world,
      px * Config.tileSize,
      (Carman.groundHeight(self.root, px, py) * Config.tileZStep || at[1]) +
        Math.random() * 4,
      py * Config.tileSize,
      SmokeScript.dust,
      -v[1] * side * 16,
      v[0] * side * 16,
    );
  }
}

//gone
FellingScript.prototype.end = function () {
  var go = this.gameObject,
    i = falling.indexOf(this);

  if (i !== -1) falling.splice(i, 1);
  if (go !== null && go.world !== null) go.world.removeGameObject(go);
};

export default Felling;
