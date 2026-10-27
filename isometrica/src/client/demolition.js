import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import Trees from "../data/trees";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import { changed } from "./looks";

var Terrain = Core.Terrain;

/**
 * A building coming down: cleared away (core/city clearTile), it is gone
 * from the world at once, but what it looked like comes down there and then
 * - in pieces, in a cloud of grey dust - into a heap of rubble on every tile
 * of it, which stays till a bulldozer pushes it away (client/clearworks).
 *
 * Every tile of a building is drawn as one picture of the parts it is put
 * together out of - its ground storey, a storey on that for every one more,
 * its roof (client/compoundbuilding) - and it comes down as those parts: it
 * shakes a moment, then its floors give, the top first, each dropping onto
 * the ones under it as they go, the whole of it sinking into its own dust,
 * the parts on the outside drifting out a little as they fall. A building
 * drawn as a picture or two comes down the same, the picture whole. Its
 * dust goes up as it shakes, wherever a piece hits the ground, up its face
 * as it falls, and rolls out over everything round it once it is down -
 * whatever the pieces do going into the ground, the dust is over it.
 *
 * None of it is kept: the camera turned, it is down at once, in the rubble.
 */

//how far up the world a pixel up the screen is (a step of the ground is
//eight); and a tile across
var PER_PIXEL = Config.tileZStep / 8,
  TILE = Config.tileSize;

//how long it shakes before it gives, ms; how long after the top starts down
//the bottom does; and as much again, at most, between one tile and the next
var SHAKE_MS = 500,
  STAGGER_MS = 500,
  JITTER_MS = 160;

//how fast a piece falls faster, world units a second each second; how far
//it sinks into the ground at the least, going, world units - more for a
//taller one; and how far out it drifts, world units a second
var FALL = 170,
  SINK = 14,
  DRIFT = 7;

//how often dust goes up as it shakes and as it falls, ms; how many puffs
//where a piece hits the ground, and over every tile once it is down; and how
//many in all at the most, for a big building
var DUST_EVERY = 25,
  HIT_PUFFS = 2,
  DOWN_PUFFS = 7,
  MOST_PUFFS = 320;

//the rubble a tile is left under (shared/gen/stones), any of them
var RUBBLE = [
  "gen/scenery/rubble",
  "gen/scenery/rubble-m",
  "gen/scenery/rubble0",
  "gen/scenery/rubble0-m",
];

//where the middle of a tile is in a picture of rubble, as in a stones' one
//(data/rocks)
var RUBBLE_PIVOT_X = 32,
  RUBBLE_PIVOT_Y = 24;

/**
 * Brings a building down where it stood - if it was cleared away, its
 * tiles being cleared (core/terrain beingCleared) for the bulldozers to get
 * to (client/clearworks); its view is gone, and what it looked like comes
 * down in its place.
 *
 * @param root {Vkaria}
 * @param building {Building} the client's, its view up still
 * @returns {boolean} whether it is coming down - its view let go of then
 */
function bringDown(root, building) {
  var works = root.clearworks,
    terrain = root.core.terrain,
    tiles = [],
    iter = building.data.occupiedTiles();

  while (!iter.done) tiles.push(iter.next());

  if (
    !works ||
    !tiles.every(function (tile) {
      return terrain.beingCleared(tile);
    })
  )
    return false;

  new Demolition(root, building, tiles);
  building.destroy();

  return true;
}

function Demolition(root, building, tiles) {
  var view = building.view.gameObject,
    at = view.transform.getPosition([0, 0, 0]);

  this.root = root;
  this.tiles = tiles;
  this.age = 0;
  this.dusted = 0;
  this.puffs = 0;
  this.down = false;
  this.turned = null;
  //the heaps of rubble left, by the tile, while they are there - null once
  //a bulldozer has pushed it away
  this.rubble = {};

  //the middle of it, in tiles
  this.mx = 0;
  this.my = 0;
  tiles.forEach(function (tile) {
    this.mx += Terrain.extractX(tile) / tiles.length;
    this.my += Terrain.extractY(tile) / tiles.length;
  }, this);

  this.go = new engine.GameObject("demolition");
  this.go.transform.setPosition(at[0], at[1], at[2]);
  this.pieces = piecesOf(this, view);
  //how many of them come down, rather than lie on the ground
  this.coming = this.pieces.filter(function (p) {
    return !p.ground;
  }).length;

  plan(this);

  var self = this,
    script = new DemolitionScript(this);

  this.go.addComponent(script);
  root.game.logic.world.addGameObject(this.go);

  //every tile a heap of rubble till a bulldozer gets there - after the
  //dust has settled a little
  tiles.forEach(function (tile) {
    root.clearworks.hold(
      tile,
      function () {
        letGo(self, tile);
      },
      self.ends,
    );
  });

  //turned round, it is down at once: its pieces were the pictures of it
  //from where it was seen
  this.turned = Events.on(
    View,
    View.events.change,
    function () {
      self.pieces.forEach(function (p) {
        gone(self, p);
      });
      fall(self);
      for (var tile in self.rubble)
        if (self.rubble[tile] !== null) dress(self, +tile);
    },
    this,
  );
}

/**
 * What the building was drawn with, as pieces to come down one by one -
 * every picture of it, every part of a picture put together out of parts,
 * each up where it was laid (client/compoundbuilding tilePieces) - and its
 * concrete base on the ground, which stays till it is down.
 */
function piecesOf(self, view) {
  var sprites = self.root.sprites,
    out = [],
    at = [0, 0, 0];

  view.transform.children.forEach(function (child) {
    var renderer = child.gameObject.spriteRenderer,
      sprite = renderer ? renderer.sprite : null;

    if (!sprite) return;

    child.getLocalPosition(at);

    var parts = partsOf(sprites, sprite, renderer),
      ground = renderer.layer !== RenderLayer.buildingsLayer;

    parts.forEach(function (part) {
      var go = new engine.GameObject(),
        r = new engine.SpriteRenderer(),
        lift = part.lift * PER_PIXEL;

      r.layer = renderer.layer;
      r.setSprite(part.sprite);
      r.pivotX = part.pivotX;
      r.pivotY = part.pivotY;
      //lit at night as it was
      r.windows = renderer.windows;
      r.lights = renderer.lights;
      r.variant = renderer.variant;
      go.addComponent(r);
      self.go.transform.addChild(go.transform);
      go.transform.setLocalPosition(at[0], at[1] + lift, at[2]);

      out.push({
        go: go,
        x0: at[0],
        y0: at[1] + lift,
        z0: at[2],
        tall: part.sprite.height * PER_PIXEL,
        ground: ground,
        //where the tile it is on is, for which way it drifts
        tx: at[0],
        tz: at[2],
        start: 0,
        hit: false,
        gone: false,
      });
    });
  });

  return out;
}

/**
 * The parts a picture is put together out of (SpriteCache#getComposite),
 * each where it is in it: its sprite, its pivot, and how far up it is laid
 * on the ones under it, in pixels - the picture whole for one of one part,
 * or one put together some way that is not that.
 */
function partsOf(sprites, sprite, renderer) {
  var whole = [
      {
        sprite: sprite,
        pivotX: renderer.pivotX,
        pivotY: renderer.pivotY,
        lift: 0,
      },
    ],
    keys = typeof sprite.key === "string" ? sprite.key.split("+") : [];

  if (keys.length < 2) return whole;

  var out = [];

  for (var i = 0; i < keys.length; i++) {
    var m = /^(.*?)(?:@(-?\d+),(-?\d+))?$/.exec(keys[i]),
      name = m[1],
      frame = sprites.frame(name);

    if (frame === undefined) return whole;

    var x = +(m[2] || 0),
      y = +(m[3] || 0),
      //where its own middle is - a generated part's - the rest of its
      //place up the picture is how far it is laid up
      lift =
        frame.pivotY === undefined
          ? 0
          : Math.max(0, renderer.pivotY - y - frame.pivotY);

    out.push({
      sprite: sprites.getSprite(name),
      pivotX: renderer.pivotX - x,
      pivotY: renderer.pivotY - y - lift,
      lift: lift,
    });
  }

  return out;
}

/**
 * When each piece starts down - the higher, the sooner, each tile in a time
 * of its own - which way it drifts as it falls, and how far it sinks into
 * the ground going; and when the last of it is gone (ends), ms from now.
 */
function plan(self) {
  var tall = 0,
    seeds = {},
    ends = SHAKE_MS;

  self.pieces.forEach(function (p) {
    tall = Math.max(tall, p.y0);
  });

  self.pieces.forEach(function (p) {
    var key = Math.round(p.tx) + "," + Math.round(p.tz),
      seed = seeds[key] || (seeds[key] = Math.random() * JITTER_MS),
      out = outward(self, p),
      fall;

    p.start = SHAKE_MS + (tall > 0 ? (1 - p.y0 / tall) * STAGGER_MS : 0) + seed;
    p.sink = Math.max(SINK, p.tall * 0.5);
    p.vx = out[0] * DRIFT * (0.4 + 0.6 * (tall > 0 ? p.y0 / tall : 0.5));
    p.vz = out[1] * DRIFT * (0.4 + 0.6 * (tall > 0 ? p.y0 / tall : 0.5));

    fall = Math.sqrt((2 * (p.y0 + p.sink)) / FALL) * 1000;
    ends = Math.max(ends, p.start + fall);
  });

  self.ends = ends;
}

//which way out from the middle of the building a piece is, along x and z
function outward(self, p) {
  var cx = 0,
    cz = 0,
    n = 0;

  self.pieces.forEach(function (q) {
    cx += q.tx;
    cz += q.tz;
    n++;
  });

  var dx = p.tx - cx / n + (Math.random() - 0.5) * 6,
    dz = p.tz - cz / n + (Math.random() - 0.5) * 6,
    l = Math.hypot(dx, dz) || 1;

  return [dx / l, dz / l];
}

function DemolitionScript(demolition) {
  engine.Component.call(this);
  this.demolition = demolition;
}

DemolitionScript.prototype = Object.create(engine.Component.prototype);
DemolitionScript.prototype.profileName = "demolition";

DemolitionScript.prototype.tick = function (time) {
  var self = this.demolition,
    t = (self.age += time.dt),
    left = 0,
    hit = 0,
    falling = 0,
    //what still stands, where, and how high it reaches
    standing = [];

  self.pieces.forEach(function (p) {
    if (p.gone) return;

    //the concrete it stood on stays till it is down
    if (p.ground) {
      left++;
      return;
    }

    var shake = t < p.start ? (t / SHAKE_MS) * 0.9 : 0.4,
      x = p.x0 + (Math.random() - 0.5) * shake,
      z = p.z0 + (Math.random() - 0.5) * shake,
      y = p.y0;

    if (t > p.start) {
      var s = (t - p.start) / 1000;

      y = p.y0 - 0.5 * FALL * s * s;
      x += p.vx * s;
      z += p.vz * s;
      falling++;
    }

    //on the ground: in a cloud of its own, and into it
    if (y <= 0 && !p.hit) {
      p.hit = true;
      for (var k = 0; k < HIT_PUFFS; k++)
        debris(self, x, z, Math.random() * 6, 14 + Math.random() * 10);
    }

    if (p.hit) hit++;

    var below = Math.max(0, -y);

    if (below >= p.sink) {
      gone(self, p);
      return;
    }

    left++;
    if (y + p.tall > 0) standing.push([x, y + p.tall, z]);
    p.go.spriteRenderer.opacity = 1 - below / p.sink;
    p.go.transform.setLocalPosition(x, y, z);
  });

  //dust: at its foot as it shakes; and as it falls, a column of it where
  //it still stands, as high as each piece reaches - thickest low down -
  //and a skirt of it rolling out along the ground round its foot
  self.dusted += time.dt;
  while (self.dusted >= DUST_EVERY && !self.down) {
    self.dusted -= DUST_EVERY;

    var g = self.go.transform.getPosition([0, 0, 0]),
      on = self.tiles[Math.floor(Math.random() * self.tiles.length)],
      fx = (Terrain.extractX(on) + (Math.random() - 0.5) * 0.9) * TILE - g[0],
      fz = (Terrain.extractY(on) + (Math.random() - 0.5) * 0.9) * TILE - g[2];

    if (falling === 0 || standing.length === 0) {
      debris(self, fx, fz, Math.random() * 3, 8);
      continue;
    }

    var up = standing[Math.floor(Math.random() * standing.length)],
      u = Math.random();

    debris(
      self,
      up[0] + (Math.random() - 0.5) * TILE * 0.6,
      up[2] + (Math.random() - 0.5) * TILE * 0.6,
      u * u * up[1],
      3,
    );
    debris(self, fx, fz, 1, 16 + Math.random() * 12);
  }

  //most of it down: the rubble under the dust
  if (!self.down && hit * 5 >= self.coming * 3) fall(self);

  if (left === 0 || t > self.ends + 2000) end(self);
};

/**
 * Down: a heap of rubble on every tile, and the cloud rolling out over it
 * and round it.
 */
function fall(self) {
  if (self.down) return;

  self.down = true;

  var g = self.go.transform.getPosition([0, 0, 0]);

  self.tiles.forEach(function (tile) {
    var x = Terrain.extractX(tile),
      y = Terrain.extractY(tile);

    //gone already, a bulldozer there before it was down
    if (self.root.core.terrain.beingCleared(tile)) rubble(self, tile);

    for (var k = 0; k < DOWN_PUFFS; k++)
      debris(
        self,
        (x + (Math.random() - 0.5) * 0.9) * Config.tileSize - g[0],
        (y + (Math.random() - 0.5) * 0.9) * Config.tileSize - g[2],
        Math.random() * 10,
        30 + Math.random() * 20,
      );
  });

  //and the concrete it stood on with it
  self.pieces.forEach(function (p) {
    if (p.ground) gone(self, p);
  });
}

function gone(self, p) {
  if (p.gone) return;

  p.gone = true;
  if (p.go.world !== null) p.go.world.removeGameObject(p.go);
  changed();
}

//all of it down and gone: nothing left of it but its rubble
function end(self) {
  fall(self);
  self.pieces.forEach(function (p) {
    gone(self, p);
  });

  if (self.go.world !== null) self.go.world.removeGameObject(self.go);
  if (self.turned !== null) {
    Events.off(View, View.events.change, self.turned);
    self.turned = null;
  }
}

/**
 * A puff of grey dust x, z off where the building stood (world units), up
 * that high over the ground, thrown out from the middle of it - so many
 * puffs at the most.
 */
function debris(self, x, z, up, out) {
  if (self.puffs >= MOST_PUFFS) return;

  self.puffs++;

  var g = self.go.transform.getPosition([0, 0, 0]),
    wx = g[0] + x,
    wz = g[2] + z,
    dx = wx / Config.tileSize - self.mx,
    dz = wz / Config.tileSize - self.my,
    l = Math.hypot(dx, dz) || 1;

  SmokeSource.puff(
    self.root.game.logic.world,
    wx,
    g[1] + up,
    wz,
    SmokeScript.debris,
    (dx / l) * out,
    (dz / l) * out,
  );
}

/**
 * The heap of rubble on a tile, lying on the ground there the way stones do
 * (client/envman).
 */
function rubble(self, tile) {
  if (self.rubble[tile] !== undefined) return;

  var go = new engine.GameObject("rubble"),
    renderer = new engine.SpriteRenderer();

  renderer.layer = RenderLayer.buildingsLayer;
  go.addComponent(renderer);
  self.rubble[tile] = go;
  dress(self, tile);
  self.root.game.logic.world.addGameObject(go);
  changed();
}

//the rubble on a tile, as it is seen, where the ground is
function dress(self, tile) {
  var go = self.rubble[tile],
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    pick = hash(x, y),
    name = Trees.turned(
      RUBBLE[pick % RUBBLE.length],
      ((pick >>> 4) + View.turns()) & 3,
    ),
    renderer = go.spriteRenderer,
    sprites = self.root.sprites;

  if (View.top()) {
    var top = sprites.topOf(name);

    renderer.setSprite(top);
    renderer.pivotX = top.pivotX;
    renderer.pivotY = top.pivotY;
  } else {
    renderer.setSprite(sprites.getSprite(name));
    renderer.pivotX = RUBBLE_PIVOT_X;
    renderer.pivotY = RUBBLE_PIVOT_Y;
  }

  go.transform.setPosition(
    x * Config.tileSize,
    self.root.core.terrain.getHeight(x + 0.5, y + 0.5) * Config.tileZStep,
    y * Config.tileSize,
  );
}

//a bulldozer got to a tile: its rubble pushed away
function letGo(self, tile) {
  var go = self.rubble[tile];

  if (go === undefined) {
    //not down yet: nothing to leave there when it is
    self.rubble[tile] = null;
    return;
  }

  if (go === null) return;

  self.rubble[tile] = null;
  if (go.world !== null) go.world.removeGameObject(go);
  changed();
}

//a number for a tile, the same every time
function hash(x, y) {
  var h = Math.imul(x, 0x2c1b3c6d) ^ Math.imul(y, 0x297a2d39) ^ 0x68e31da4;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);

  return (h ^ (h >>> 13)) >>> 0;
}

export default { bringDown: bringDown };
