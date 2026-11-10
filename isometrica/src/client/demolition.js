import engine from "engine";
import Events from "events";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import BuildingView from "./buildingview";
import BuildingState from "../core/buildingstate";
import Trees from "../data/trees";
import SmokeSource from "./components/smokesource";
import SmokeScript from "./components/smokeScript";
import { changed } from "./looks";

var Terrain = Core.Terrain;

/**
 * A building coming down. Demolished (core/city clearTile), it is fenced off
 * with blue tarp - every tile of it, till the last of it is down - and stays
 * standing, in the world as well, till a bulldozer comes up to a tile of it
 * (client/clearworks hold, knock): then that tile of it comes down, the
 * bulldozer waiting for it, and leaves a heap of rubble for it to push away,
 * the ground bare there - the world told it is down (core/city tileDown).
 * What is down stays down: after a reload it stands as far down as it had
 * come, fenced off still, the bulldozers to be sent again for the rest
 * (client/buildman demolitionOf).
 *
 * How it comes down is a thing of its own (Demolition), told when each tile
 * of it is to come down and when its rubble is pushed away by whoever has
 * it - the bulldozers, in the game; a button, on a bench (lab/buildings) -
 * and drawn with no more than the pictures, the world they are drawn in
 * and the ground under it.
 *
 * Fenced off, it stands as it stood - every tile of it the one picture it
 * was drawn as (client/buildingview), in the order things are drawn in and
 * with the shadow it had - only with all of its lights out. Every tile of it
 * is the parts it is put together out of - its ground storey, a storey on
 * that for every one more, its roof (client/compoundbuilding) - or painted
 * whole, a house; and once a tile is to come down it is taken apart into its
 * floors (slice), each still drawn where its tile is in the order things are
 * drawn in, however high up it is (seat): the parts, or for a picture
 * painted whole, bands of it a storey high cut out of it
 * (SpriteCache#getComposite clip), its foot - the bottom of it, round the
 * middle of its tile and in front - staying put on the ground. It shakes a
 * moment; then a floor some way up gives, and everything over it drops onto
 * the floor under it, which gives in turn as it comes down on it - and so on
 * down, every floor crushed, to the ground, where the floors that fell crush
 * one by one onto their foot; nothing of it goes down into the ground. A
 * floor crushed bursts into pieces of itself - bits of the picture of it,
 * flung out and up - that fall round the building, bounce, lie a while and
 * go; and goes in a puff of grey dust, dithered away. The dust goes up as it
 * shakes, wherever a floor gives, and rolls out over the heap of rubble it
 * leaves once it is down, the rubble coming up under it as its foot goes.
 *
 * Turned round, what is coming down is down at once, and what still stands
 * stands as it is seen from the new side. None of it is kept.
 */

//how far up the world a pixel up the screen is (a step of the ground is
//eight); and a tile across
var PER_PIXEL = Config.tileZStep / 8,
  TILE = Config.tileSize;

//a picture painted whole: how tall a floor of it is, pixels, at the most -
//less for a low one, for it to have floors enough, but no less than the
//least; how far up from the middle of its tile its foot reaches; and how
//high it stands at the most for it to be all foot, flat on the ground (a
//yard, a car park) - as far as how high it stands is known yet
//(CachedSprite top), and how far over the back corner of its tile it may
//reach otherwise
var BAND = 13,
  LEAST_BAND = 6,
  FLOORS = 3,
  FOOT = 5,
  LOW = 8,
  BACK = 16;

//a picture of parts: no taller than this, the part at the bottom is its
//foot, flat on the ground
var FLAT = 44;

//how long a tile of it shakes before it gives, ms; how much of its floors
//are over the one that gives first; how fast what falls falls faster,
//pixels a second each second; how much of its speed what falls keeps for
//every floor it crushes; how far into a floor it gets before that gives,
//of the floor's height; and how long a floor takes to go, crushed, ms
var SHAKE_MS = 650,
  FAILS = 0.4,
  FALL = 100,
  KEEP = 0.3,
  BITE = 0.35,
  CRUSH_MS = 320;

//the pieces a floor bursts into: how many at most, how big, pixels; how fast
//they are flung out and up, world units a second, at the least and the
//most; how fast they fall faster; how long they lie, and take to go, ms;
//and how many there are of a building at most
var CHUNKS = 10,
  CELL = 8,
  THROW = [14, 56],
  TOSS = [14, 52],
  DROP = 300,
  LIE_MS = [700, 1800],
  GO_MS = 500,
  MOST_CHUNKS = 240;

//its dust: how many puffs where a floor gives, and where it first gives;
//how many over a tile once it is down; how many of a building at most
var CRUSH_PUFFS = 2,
  FAIL_PUFFS = 5,
  DOWN_PUFFS = 6,
  MOST_PUFFS = 320;

//how fast the dust a tile comes down in is thrown out from the middle of
//it, world units a second, at the least and at the most - over the tiles
//round it, not off down the street
var DOWN_OUT = [8, 18];

//how long the rubble takes to come up under the dust, and the foot to go,
//ms
var SETTLE_MS = 450;

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

//how far back and forward of the middle of its tile, as it is seen, the
//stretches of fence at the back and at the front of a tile are put, tiles
//along both ways of the ground: behind what stands on the tile and in front
//of it in the order things are drawn in, and short of the tiles next to
//it; and how far up the screen a tile along both ways at once is, pixels
var FENCE_SHIFT = 14 / 32,
  TILE_PX = 32;

/**
 * A building coming down, from where it stands: what it looks like taken
 * off its view - which whoever has it lets go of then - and stood up in
 * its place, fenced off, every tile of it standing till it is told to come
 * down (knock), and its rubble lying there till it is told it is pushed
 * away (letGo); gone once all of it is (over).
 *
 * @param root {Vkaria} what it is drawn with: the pictures (sprites), the
 *        world it is drawn in (game.logic.world) and the ground under it
 *        (core.terrain)
 * @param building {{view: BuildingView, staticData: Object, data: Object}}
 *        the client's building (client/building), or anything drawn the
 *        same way, its view up still
 * @param tiles {number[]} every tile it stands on
 * @param [options] {{fence: boolean, rubble: boolean, down: number[]}}
 *        fence and rubble false for no fence round it, and no heaps of
 *        rubble of its own where it comes down - a building burnt down,
 *        what is left of it its own (client/fires); down the tiles of it
 *        down already, a demolition under way (core/building down): nothing
 *        of it there - and fenced off all the same
 */
function Demolition(root, building, tiles, options) {
  var self = this,
    down = options && options.down ? options.down : null;

  this.fenced = !options || options.fence !== false;
  this.rubbles = !options || options.rubble !== false;
  //what it is burnt as, all of it still standing (burn) - or null
  this.words = null;

  this.root = root;
  this.building = building;
  //the building as its view last drew it, to draw what stands of it
  //(stand) - its own view draws nothing of it while it is being demolished
  //(client/buildingview) - and again from another side (turn)
  this.standIn = {
    data: asDrawn(building.data, building.view ? building.view.drawnAs : null),
    staticData: building.staticData,
  };
  this.puffs = 0;
  //its windows flickering, the wires to them torn (flicker) - and how long
  //it has been at it, ms
  this.flickers = [];
  this.since = 0;
  this.chunks = [];
  this.chunked = 0;
  //every tile of it, by the tile: what stands there, coming down, or down
  this.columns = {};
  //the middle of it, in the world
  this.mx = 0;
  this.mz = 0;

  tiles.forEach(function (tile) {
    self.mx += (Terrain.extractX(tile) * TILE) / tiles.length;
    self.mz += (Terrain.extractY(tile) * TILE) / tiles.length;
    self.columns[tile] = column(tile);
    //down already: gone, but for its stretch of the fence
    if (down && down.indexOf(tile) !== -1) self.columns[tile].state = "gone";
  });

  //what stands of it: the pictures its view has up - charred, say, by a
  //fire (client/fires) - or, its view drawing nothing of it, being
  //demolished, drawn afresh as it is
  var live =
      building.view &&
      building.view.gameObject &&
      building.view.gameObject.transform.children.length > 0,
    view = live ? building.view : new BuildingView(),
    at;

  if (!live) {
    view.setBuilding(this.standIn);
    view.update();
  }
  at = view.gameObject.transform.getPosition([0, 0, 0]);

  this.go = new engine.GameObject("demolition");
  this.go.transform.setPosition(at[0], at[1], at[2]);
  this.go.addComponent(new DemolitionScript(this));
  root.game.logic.world.addGameObject(this.go);

  stand(this, view.gameObject, at);
  if (!live) view.dispose();
  ahead(this);

  //fenced off the moment it is to come down - every tile of it, till the
  //last of it is down and pushed away (end)
  this.fences = {};
  if (this.fenced) fence(this);

  //turned round: what is coming down is down, and what stands stands as it
  //is seen from the new side
  this.turned = Events.on(
    View,
    View.events.change,
    function () {
      turn(self);
    },
    this,
  );
}

/**
 * A building's own as drawn - up, or so far along going up - whatever it is
 * now: where it stands, turned which way, looking which way, the rest of
 * it as it is.
 */
function asDrawn(data, drawn) {
  var out = Object.create(data),
    state = drawn ? drawn.state : BuildingState.ready,
    progress = drawn ? drawn.progress : 1;

  //whole, as it stood: what of it is down, or coming down, is the
  //demolition's to show
  out.demolishing = false;
  out.down = null;

  out.getState = function () {
    return state;
  };
  out.getProgress = function () {
    return progress;
  };

  return out;
}

/**
 * Has a tile of it come down: shaking, its floors giving one onto the
 * other, bursting into pieces in its dust, into its rubble.
 *
 * @param tile {number}
 * @returns {number} how long till it is down, ms
 */
Demolition.prototype.knock = function (tile) {
  return knock(this, tile);
};

/**
 * Has a tile's rubble pushed away, and its stretch of the fence with it -
 * down at once first, if it was not yet.
 *
 * @param tile {number}
 */
Demolition.prototype.letGo = function (tile) {
  letGo(this, tile);
};

/**
 * All of it gone there and then, with nothing shown of it going - for
 * whoever puts back up what came down (a bench).
 */
Demolition.prototype.stop = function () {
  for (var tile in this.columns) {
    var col = this.columns[tile];

    col.floors.concat(col.feet, col.whole).forEach(gone);
    col.whole = [];
    col.cuts = [];
    if (col.rubble !== null && col.rubble.world !== null)
      col.rubble.world.removeGameObject(col.rubble);
    col.rubble = null;
    col.state = "gone";
  }

  this.chunks.forEach(function (c) {
    if (c.go.world !== null) c.go.world.removeGameObject(c.go);
  });
  this.chunks = [];

  end(this);
};

/**
 * Whether all of it is gone: every tile of it down and its rubble pushed
 * away, and every piece of it gone.
 */
Demolition.prototype.over = function () {
  return this.go.world === null;
};

//a tile of it: standing, shaking, falling, down - or gone, its rubble
//pushed away
function column(tile) {
  return {
    tile: tile,
    state: "standing",
    t: 0,
    //its floors, the lowest first, and its foot; how far the floors that
    //fall have fallen, pixels, and how fast; and the lowest of them
    floors: [],
    feet: [],
    drop: 0,
    v: 0,
    k: 0,
    rubble: null,
    //what stands of it whole, till it is to come down - and what it is to
    //be taken apart from then (slice)
    whole: [],
    cuts: [],
    //what it was last seen to be doing, and the sides of it opened up where
    //a tile of it in front has fallen (open) - and still to be, once they
    //are painted
    was: "standing",
    open: 0,
    opening: 0,
  };
}

/**
 * Puts up what still stands of it as the pictures of view's children - x,
 * y, z where view is drawn from - each tile's on that tile: its floors and
 * its foot.
 */
function stand(self, view, at) {
  var g = self.go.transform.getPosition([0, 0, 0]),
    local = [0, 0, 0];

  view.transform.children.forEach(function (child) {
    var renderer = child.gameObject.spriteRenderer,
      sprite = renderer ? renderer.sprite : null;

    if (!sprite) return;

    child.getLocalPosition(local);

    var wx = at[0] + local[0],
      wy = at[1] + local[1],
      wz = at[2] + local[2],
      tile = Terrain.convertToIndex(
        Math.round(wx / TILE),
        Math.round(wz / TILE),
      ),
      col = self.columns[tile];

    if (col === undefined || col.state !== "standing") return;

    var where = [wx - g[0], wy - g[1], wz - g[2]];

    //its concrete base: on the ground, its foot
    if (renderer.layer !== RenderLayer.buildingsLayer) {
      col.feet.push(piece(self, where, renderer, whole(sprite, renderer)));
      return;
    }

    //the rest of it whole, the picture it was, till it is to come down -
    //what of its view it is taken apart by kept, the view let go of
    var kept = {
      layer: renderer.layer,
      pivotX: renderer.pivotX,
      pivotY: renderer.pivotY,
      lights: renderer.lights,
      windows: renderer.windows,
      variant: renderer.variant,
    };

    col.whole.push(piece(self, where, kept, whole(sprite, kept)));
    //come down by itself, blown up, burnt: lit still as it stands - for a
    //moment, flickering (what an explosion tears off it is not lit)
    if (self.flickers !== undefined && !self.fenced)
      flicker(self, col.whole[col.whole.length - 1], kept);
    col.cuts.push({ where: where, renderer: kept, sprite: sprite });
  });
}

/**
 * A tile that is to come down taken apart into its floors (floorsOf), the
 * lowest first, each drawn after the ones under it - where it stood whole
 * till now.
 */
function slice(self, col) {
  col.whole.forEach(gone);
  col.whole = [];

  col.cuts.forEach(function (c) {
    floorsOf(self, col, c.where, c.renderer, c.sprite);
  });
  col.cuts = [];

  col.floors.sort(function (a, b) {
    return a.base - b.base;
  });
  col.floors.forEach(function (f, i) {
    f.order = i + 1;
    seat(f, f.x, f.y, f.z);
  });
}

//a picture as it is, whole
function whole(sprite, renderer) {
  return {
    sprite: sprite,
    name: null,
    pivotX: renderer.pivotX,
    pivotY: renderer.pivotY,
    clip: null,
    lift: 0,
  };
}

/**
 * The floors of a tile's picture: the parts it is put together out of, each
 * up where it is laid - the bottom one its foot if it is flat on the ground
 * - or for one painted whole, bands of it a storey high, from its foot up.
 */
function floorsOf(self, col, where, renderer, sprite) {
  var parts = partsOf(self.root.sprites, sprite, renderer);

  if (parts.length > 1) {
    parts.forEach(function (part, i) {
      var next = parts[i + 1],
        flat = i === 0 && part.frame.h <= FLAT;

      if (flat) {
        col.feet.push(piece(self, where, renderer, part));
        return;
      }

      floor(
        self,
        col,
        piece(self, where, renderer, part),
        part.lift,
        next ? Math.max(4, next.lift - part.lift) : BAND,
        part,
      );
    });
    return;
  }

  var one = parts[0];

  //nothing to cut it out of: it comes down whole
  if (one.name === null) {
    floor(self, col, piece(self, where, renderer, one), 0, BAND, null);
    return;
  }

  var f = one.frame,
    foot = Math.min(f.h, Math.max(0, one.pivotY - FOOT)),
    step = Math.max(LEAST_BAND, Math.min(BAND, Math.floor(foot / FLOORS)));

  //flat on the ground, all of it
  if (sprite.top ? sprite.top.h < LOW : one.pivotY - BACK < LEAST_BAND) {
    col.feet.push(piece(self, where, renderer, one));
    return;
  }

  if (foot < f.h)
    col.feet.push(
      piece(self, where, renderer, cut(one, 0, foot, f.w, f.h - foot)),
    );

  for (var y1 = foot; y1 > 0;) {
    var y0 = Math.max(0, y1 - step);

    //no sliver of a floor left over at the top
    if (y0 < 5) y0 = 0;

    var band = cut(one, 0, y0, f.w, y1 - y0);

    floor(
      self,
      col,
      piece(self, where, renderer, band),
      one.pivotY - y1,
      y1 - y0,
      band,
    );
    y1 = y0;
  }
}

//so much of a picture of one part, from x, y in it
function cut(part, x, y, w, h) {
  return {
    sprite: null,
    name: part.name,
    frame: part.frame,
    pivotX: part.pivotX,
    pivotY: part.pivotY,
    clip: { x: x, y: y, w: w, h: h },
    lift: part.lift,
  };
}

/**
 * The parts a picture is put together out of (SpriteCache#getComposite),
 * each where it is in it: its name and frame, where the middle of its tile
 * is in its own picture, and how far up it is laid on the ones under it, in
 * pixels - the picture whole for one put together some way that is not that
 * (from straight above), its name null then.
 */
function partsOf(sprites, sprite, renderer) {
  var keys = typeof sprite.key === "string" ? sprite.key.split("+") : [],
    out = [];

  for (var i = 0; i < keys.length; i++) {
    var m = /^([^@#~!]*)(?:@(-?[\d.]+),(-?[\d.]+))?(?:~(.*))?$/.exec(keys[i]),
      frame = m ? sprites.frame(m[1]) : undefined;

    if (frame === undefined) return [whole(sprite, renderer)];

    //burnt as the whole was
    var burnt = m[4] || "",
      x = +(m[2] || 0),
      y = +(m[3] || 0),
      //where its own middle is - a generated part's - the rest of its place
      //up the picture is how far it is laid up
      pivotY = frame.pivotY === undefined ? renderer.pivotY - y : frame.pivotY,
      lift = Math.max(0, renderer.pivotY - y - pivotY);

    out.push({
      sprite:
        keys.length === 1
          ? sprite
          : burnt
            ? sprites.getComposite([{ name: m[1], burnt: burnt }])
            : sprites.getSprite(m[1]),
      name: m[1],
      burnt: burnt || undefined,
      frame: frame,
      pivotX: renderer.pivotX - x,
      pivotY: renderer.pivotY - y - lift,
      clip: null,
      lift: lift,
    });
  }

  return out.length > 0 ? out : [whole(sprite, renderer)];
}

/**
 * A picture of what stands - a part, so much of one - drawn where it was,
 * up as high as it is laid: {go, y0, x0, z0, ...}.
 */
function piece(self, where, renderer, part) {
  var go = new engine.GameObject(),
    r = new engine.SpriteRenderer(),
    c = part.clip,
    sprite =
      c !== null
        ? self.root.sprites.getComposite([
            { name: part.name, clip: c, burnt: part.burnt },
          ])
        : part.sprite,
    y = where[1] + part.lift * PER_PIXEL;

  r.layer = renderer.layer;
  r.setSprite(sprite);
  r.pivotX = part.pivotX - (c ? c.x : 0);
  //fenced off to come down: nothing of it lit, not its windows, not the
  //warning light on its top (client/lighting dark)
  r.lights = renderer.lights;
  r.variant = renderer.variant;
  r.dark = true;
  go.addComponent(r);
  self.go.transform.addChild(go.transform);

  var p = {
    go: go,
    x0: where[0],
    y0: y,
    z0: where[2],
    part: part,
    fade: -1,
    //where its tile's ground is, how high it is drawn from over that, and
    //after how many of the tile's others it is drawn (seat)
    ground: where[1],
    pivotY: part.pivotY - (c ? c.y : 0),
    order: 0,
  };

  seat(p, p.x0, p.y0, p.z0);

  return p;
}

//how much nearer each floor of a tile is drawn from, in the order things
//are drawn in, than the one under it, world units - for it to be drawn
//after it: enough to tell them apart there, the keys of that order kept to
//16 bits over all that is in sight (engine Canvas2dRenderer depthSort),
//and the ones that share a key drawn the last put in first - and far short
//of the tile next to it
var ORDER = 1;

/**
 * Puts a piece where it is drawn - x, y, z off where the building is drawn
 * from - and records it there (x, y, z). Drawn from as high as it is, it is
 * lit as high as it is; but higher up is later in the order things are
 * drawn in (CameraComponent#depthAxes: away along the ground, less how
 * high), and a floor up high would be drawn over what stands in front of
 * its tile - so it is drawn from half as far back again, along the ground
 * away from the camera, as it is high over its tile's ground: where its
 * tile is in the order things are drawn in, after the ones under it - and
 * where it was on the screen, by its pivot.
 */
function seat(p, x, y, z) {
  var back = (y - p.ground) / 2 - p.order * ORDER,
    away = View.unvector(1, 1);

  p.x = x;
  p.y = y;
  p.z = z;
  p.go.transform.setLocalPosition(x + away[0] * back, y, z + away[1] * back);
  p.go.spriteRenderer.pivotY = p.pivotY - (back / TILE) * TILE_PX;
}

//a floor of a tile: its piece, how high its foot is over the ground, and how
//tall it is, pixels
function floor(self, col, p, base, h, part) {
  p.base = base;
  p.h = h;
  p.crushed = false;
  p.cuttable = part !== null && part.name !== null;
  col.floors.push(p);
}

/**
 * A bulldozer has come to a tile: what stands there comes down - how long
 * till it is down, ms, for the bulldozer to wait.
 */
function knock(self, tile) {
  var col = self.columns[tile];

  if (col === undefined || col.state !== "standing") return 0;

  slice(self, col);
  col.state = "shaking";
  col.t = 0;

  //nothing standing there: down at once
  if (col.floors.length === 0) {
    down(self, col);
    return SETTLE_MS;
  }

  return SHAKE_MS + falls(col) + CRUSH_MS + SETTLE_MS;
}

//where a tile's floors first give: the lowest of those that fall
function failsAt(col) {
  var n = col.floors.length;

  return n < 2 ? 0 : Math.max(1, Math.min(n - 1, Math.round(n * (1 - FAILS))));
}

/**
 * How long a tile's floors take to come down once they fall, ms - worked
 * out the way they do, without them.
 */
function falls(col) {
  var floors = col.floors.map(function (f) {
      return { base: f.base, h: f.h, crushed: false };
    }),
    s = { drop: 0, v: 0, k: failsAt(col) },
    t = 0,
    dt = 1 / 60;

  while (s.k < floors.length && t < 30) {
    t += dt;
    fallBy(s, floors, ground(col), dt, null);
  }

  return t * 1000;
}

//how high a tile's ground is, pixels over the middle of it: the top of its
//foot, cut out of a picture painted whole
function ground(col) {
  return col.feet.some(function (f) {
    return f.part.clip !== null;
  })
    ? FOOT
    : 0;
}

/**
 * Has what falls of a tile fall dt seconds on: faster and faster, the floor
 * under it giving as it gets far enough into it, slowing it - or at the
 * ground, the lowest of what falls giving - crush(floor) told of each.
 */
function fallBy(s, floors, ground, dt, crush) {
  s.v += FALL * dt;
  s.drop += s.v * dt;

  for (;;) {
    var bottom = floors[s.k];

    if (bottom === undefined) return;

    var edge = bottom.base - s.drop,
      below = null;

    for (var j = s.k - 1; j >= 0; j--)
      if (!floors[j].crushed) {
        below = floors[j];
        break;
      }

    if (below !== null) {
      if (edge > below.base + below.h * (1 - BITE)) return;

      below.crushed = true;
      if (crush) crush(below);
    } else {
      if (edge > ground) return;

      s.drop = bottom.base - ground;
      bottom.crushed = true;
      if (crush) crush(bottom);
      s.k++;
    }

    s.v *= KEEP;
  }
}

//how long the lights of what comes down by itself flicker before they go
//out for good, ms, at the least and at the most; and how long each flicker
//is, on or off, at the most
var FLICKER = [250, 750],
  FLICKER_EACH = 110;

/**
 * The lights of a tile of it coming down by itself - blown up, hit by a
 * blast, fallen in as it burnt (no fence round it, the people still in it)
 * - on as they were, its windows lit as its view had them (client/lighting
 * windowsOn), then flickering as the wires to them are torn, and out a
 * moment on. What falls of it is dark (slice).
 */
function flicker(self, p, kept) {
  var r = p.go.spriteRenderer;

  if (kept.windows === undefined || kept.lights === undefined) return;

  r.windows = kept.windows;
  r.dark = false;
  self.flickers.push({
    r: r,
    out: self.since + FLICKER[0] + Math.random() * (FLICKER[1] - FLICKER[0]),
    next: self.since + Math.random() * FLICKER_EACH,
  });
}

function flickering(self) {
  self.flickers = self.flickers.filter(function (f) {
    if (self.since >= f.out || f.r.gameObject.world === null) {
      f.r.dark = true;
      return false;
    }

    if (self.since >= f.next) {
      //off more and more of the time, as it goes
      f.r.dark = !f.r.dark;
      f.next =
        self.since + (f.r.dark ? 1.5 : 0.6) * Math.random() * FLICKER_EACH + 15;
    }

    return true;
  });
}

function DemolitionScript(demolition) {
  engine.Component.call(this);
  this.demolition = demolition;
}

DemolitionScript.prototype = Object.create(engine.Component.prototype);
DemolitionScript.prototype.profileName = "demolition";

DemolitionScript.prototype.tick = function (time) {
  var self = this.demolition,
    dt = time.dt,
    busy = false,
    fell = false;

  self.since += dt;
  if (self.flickers.length > 0) flickering(self);

  for (var tile in self.columns) {
    var col = self.columns[tile];

    if (col.state !== col.was) {
      if (col.state === "falling") fell = true;
      col.was = col.state;
    }

    if (col.opening > 0 && col.state === "standing") opening(self, col);

    if (col.state === "shaking") shake(self, col, dt);
    else if (col.state === "falling") fallOn(self, col, dt);
    else if (col.state === "down") settle(self, col, dt);

    if (col.state !== "gone") busy = true;
  }

  flyOn(self, dt);

  if (fell) open(self);

  if (!busy && self.chunks.length === 0) end(self);
};

/**
 * Every tile of it still standing whole, open on its sides where a tile of
 * it in front of it there has fallen away: its storeys painted open there
 * (SpriteCache opened, shared/gen/isobox setOpen) - empty rooms, their
 * floors and walls, where the wall between them was - and what it is to
 * come down in too, so it comes down open. Only the sides to the front, as
 * it is seen: what is behind it leaves nothing of it to be seen. Put in
 * the place of what it was as soon as they are painted (opening), shut
 * meanwhile, never not there.
 */
function open(self) {
  if (View.top()) return;

  for (var tile in self.columns) {
    var col = self.columns[tile];

    if (col.state !== "standing" || col.whole.length === 0) continue;

    var sides = frontSides(self, +tile, function (o) {
      return o.state !== "standing" && o.state !== "shaking";
    });

    if (sides !== (col.open || 0)) {
      col.open = sides;
      col.opening = sides;
    }
  }
}

//the sides of tile, as it is seen, that a tile of it which is - as which
//says - is in front of: 1 to the -x of it, 2 to the -y
function frontSides(self, tile, which) {
  var sides = 0,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile);

  for (var other in self.columns) {
    if (!which(self.columns[other])) continue;

    var seen = View.vector(
      Terrain.extractX(+other) - x,
      Terrain.extractY(+other) - y,
    );

    if (seen[0] === -1 && seen[1] === 0) sides |= 1;
    else if (seen[0] === 0 && seen[1] === -1) sides |= 2;
  }

  return sides;
}

//a tile of it to be opened up (open), once what it is opened up as is
//painted, every part of it, as it is drawn - lit, and at night
function opening(self, col) {
  var sprites = self.root.sprites,
    gl = engine.Config.gl,
    sides = col.opening,
    ready = true,
    whole = col.whole.map(function (p) {
      var s = sprites.opened(p.go.spriteRenderer.sprite, sides);

      if (!painted(s, gl)) ready = false;
      return s;
    });

  if (!ready) return;

  col.whole.forEach(function (p, k) {
    p.go.spriteRenderer.setSprite(whole[k]);
  });
  col.cuts.forEach(function (c) {
    c.sprite = sprites.opened(c.sprite, sides);
  });
  col.opening = 0;
  changed();
}

//whether a picture is painted, as it is drawn - asked for, if not
function painted(sprite, gl) {
  var ready = sprite.ready ? sprite.ready() : true;

  if (sprite.entries)
    sprite.entries(!!gl, true).forEach(function (e) {
      if (e !== sprite && e.ready && !e.ready()) ready = false;
    });

  return ready;
}

/**
 * Every side of every tile of it that may be opened up, as it comes down -
 * where there is a tile of it in front of it - painted ahead (open), so
 * that it is ready by the time it is.
 */
function ahead(self) {
  var sprites = self.root.sprites,
    gl = engine.Config.gl;

  if (View.top()) return;

  for (var tile in self.columns) {
    var col = self.columns[tile],
      sides = frontSides(self, +tile, function () {
        return true;
      });

    if (sides === 0) continue;

    col.whole.forEach(function (p) {
      [sides & 1, sides & 2, sides].forEach(function (s, k) {
        if (s > 0 && (k < 2 || sides === 3))
          painted(sprites.opened(p.go.spriteRenderer.sprite, s), gl);
      });
    });
  }
}

/**
 * Every tile of it still standing burnt as words say (client/burnt) -
 * charred, a building blown up: what stands of it, and what it will come
 * down in.
 *
 * @param words {string}
 */
Demolition.prototype.burn = function (words) {
  var sprites = this.root.sprites;

  this.words = words;

  for (var tile in this.columns) {
    var col = this.columns[tile];

    col.whole.forEach(function (p) {
      var r = p.go.spriteRenderer;

      r.setSprite(sprites.burnt(r.sprite, words));
    });
    col.cuts.forEach(function (c) {
      c.sprite = sprites.burnt(c.sprite, words);
    });
  }
};

//a tile shaking, before it gives - dust going up where it will
function shake(self, col, dt) {
  col.t += dt;

  var k = Math.min(1, col.t / SHAKE_MS) * 0.7;

  col.floors.forEach(function (f) {
    seat(
      f,
      f.x0 + (Math.random() - 0.5) * k,
      f.y0,
      f.z0 + (Math.random() - 0.5) * k,
    );
  });

  if (Math.random() < dt / 90) {
    var at = col.floors[failsAt(col)] || col.floors[0];

    debris(self, at.x0, at.z0, Math.random() * 4, 8);
  }

  if (col.t < SHAKE_MS) return;

  //it gives: a burst where it does, and what is over it falls
  col.state = "falling";
  col.t = 0;
  col.k = failsAt(col);

  var gives = col.floors[col.k - 1] || col.floors[col.k];

  for (var i = 0; i < FAIL_PUFFS; i++)
    debris(
      self,
      gives.x0 + (Math.random() - 0.5) * TILE * 0.5,
      gives.z0 + (Math.random() - 0.5) * TILE * 0.5,
      bottomOf(gives, gives.y0) + Math.random() * 6,
      12 + Math.random() * 12,
    );
  //where it gives, it bursts as much again
  burst(self, col, gives);
  burst(self, col, gives);
}

//a tile falling: the floors that fall where they have got to, and every
//floor going that was crushed
function fallOn(self, col, dt) {
  var g = ground(col);

  fallBy(col, col.floors, g, dt / 1000, function (f) {
    crush(self, col, f);
  });

  col.floors.forEach(function (f, i) {
    //what was crushed, where it was; what falls, where it has got to; what
    //is under that, where it stands
    var y =
      f.at !== undefined
        ? f.at
        : i >= col.k
          ? f.y0 - col.drop * PER_PIXEL
          : f.y0;

    if (f.fade >= 0) {
      f.fade += dt;
      f.go.spriteRenderer.opacity = Math.max(0, 1 - f.fade / CRUSH_MS);
      if (f.fade >= CRUSH_MS) gone(f);
    }

    seat(f, f.x0, y, f.z0);
  });

  if (
    col.k >= col.floors.length &&
    col.floors.every(function (f) {
      return f.fade < 0 || f.fade >= CRUSH_MS;
    })
  )
    down(self, col);
}

//how high the foot of a floor is, its piece drawn y up - off where the
//building is drawn from
function bottomOf(f, y) {
  return y + (f.base - f.part.lift) * PER_PIXEL;
}

/**
 * A floor crushed: it goes, dithered away where it was crushed, in a puff of
 * dust, bursting into pieces.
 */
function crush(self, col, f) {
  f.at = f.y;
  f.fade = 0;
  f.go.spriteRenderer.dither = true;

  var up = bottomOf(f, f.at) + f.h * 0.5 * PER_PIXEL;

  for (var i = 0; i < CRUSH_PUFFS; i++)
    debris(
      self,
      f.x0 + (Math.random() - 0.5) * TILE * 0.6,
      f.z0 + (Math.random() - 0.5) * TILE * 0.6,
      Math.max(0, up) + Math.random() * 4,
      10 + Math.random() * 14,
    );

  burst(self, col, f);
}

/**
 * A floor bursting into pieces of itself: bits of its picture - none of
 * them nothing to see - flung out from the middle of the building and up,
 * from where they are in it: CHUNKS of them, as far and as high as a floor
 * crushed throws them - or as fling says (client/explosion).
 *
 * @param [fling] {{n: number, out: number[], up: number[], lie: number[],
 *        around: boolean}} how many pieces, and how fast out and up, world
 *        units a second, and how long they lie, ms - each from the first to
 *        the second - and whether they go any way at all, all round, rather
 *        than out from the middle of the building
 */
function burst(self, col, f, fling) {
  if (!f.cuttable) return;

  var part = f.part,
    c = part.clip || { x: 0, y: 0, w: part.frame.w, h: part.frame.h },
    sprites = self.root.sprites,
    cells = [];

  for (var y = 0; y + 3 <= c.h; y += CELL)
    for (var x = 0; x + 3 <= c.w; x += CELL)
      if (seen(sprites, part, c.x + x, c.y + y, CELL))
        cells.push({
          x: c.x + x,
          y: c.y + y,
          w: Math.min(CELL, c.w - x),
          h: Math.min(CELL, c.h - y),
        });

  var most = fling ? fling.n : CHUNKS;

  for (var n = 0; n < most && cells.length > 0; n++) {
    if (self.chunked >= (self.most || MOST_CHUNKS)) return;

    var cell = cells.splice(Math.floor(Math.random() * cells.length), 1)[0];

    chunk(self, f, cell, fling);
  }
}

//whether anything of a part's picture is there in a square of it, size
//across from x, y - in its colours to be lit, which are what is drawn, or
//as it is painted; as far as its pixels are in to tell, a guess otherwise
function seen(sprites, part, x, y, size) {
  var frame = part.frame,
    sheet = sprites.sheets ? sprites.sheets[frame.sheet] : null,
    lit = sheet ? sprites.lookSheet(sheet, "deferred") : null,
    image = lit && lit.image ? lit.image : sheet ? sheet.image : null,
    //the colours to be lit are the first of its pictures, at its corner
    x0 = lit && lit.image ? 0 : frame.x,
    y0 = lit && lit.image ? 0 : frame.y;

  if (!image || !image.data) return Math.random() < 0.5;

  for (var j = 0; j < size; j += 2)
    for (var i = 0; i < size; i += 2) {
      if (x + i >= frame.w || y + j >= frame.h) continue;

      var px = x0 + x + i,
        py = y0 + y + j;

      if (image.data[(py * image.width + px) * 4 + 3] > 0) return true;
    }

  return false;
}

/**
 * A piece of a floor flung off it: its bit of the picture, its foot where
 * the bit's foot is, flung out and up.
 */
function chunk(self, f, cell, fling) {
  var throws = fling ? fling.out : THROW,
    tosses = fling ? fling.up : TOSS,
    lies = fling ? fling.lie : LIE_MS,
    part = f.part,
    go = new engine.GameObject("debris"),
    r = new engine.SpriteRenderer(),
    p = [f.x, f.y, f.z],
    //how far up its foot is over where the floor is drawn from
    up = (part.pivotY - (cell.y + cell.h)) * PER_PIXEL,
    wx = self.go.transform.getPosition([0, 0, 0]),
    //out from the middle of the building, more or less - or for one blown
    //up, any way at all, all round it (fling around)
    any = fling && fling.around ? Math.random() * 2 * Math.PI : null,
    ox =
      any !== null
        ? Math.cos(any)
        : wx[0] + p[0] - self.mx + (Math.random() - 0.5) * TILE,
    oz =
      any !== null
        ? Math.sin(any)
        : wx[2] + p[2] - self.mz + (Math.random() - 0.5) * TILE,
    l = Math.hypot(ox, oz) || 1,
    out = throws[0] + Math.random() * (throws[1] - throws[0]);

  r.layer = RenderLayer.buildingsLayer;
  //drawn as it is painted: lit as it is drawn, it would stand as high as
  //it did in the building, and throw its shadow so
  r.setSprite(
    self.root.sprites.getComposite([
      { name: part.name, clip: cell, plain: true },
    ]),
  );
  r.pivotX = part.pivotX - cell.x;
  r.pivotY = cell.h;
  r.dither = true;
  go.addComponent(r);
  self.go.transform.addChild(go.transform);
  go.transform.setLocalPosition(p[0], p[1] + up, p[2]);

  self.chunked++;
  self.chunks.push({
    go: go,
    x: p[0],
    y: p[1] + up,
    z: p[2],
    vx: (ox / l) * out,
    vz: (oz / l) * out,
    vy: tosses[0] + Math.random() * (tosses[1] - tosses[0]),
    bounced: 0,
    lie: lies[0] + Math.random() * (lies[1] - lies[0]),
    t: -1,
  });
}

//the pieces flying, landing, bouncing, lying and going
function flyOn(self, dt) {
  var s = dt / 1000,
    g = self.go.transform.getPosition([0, 0, 0]);

  self.chunks = self.chunks.filter(function (c) {
    if (c.t >= 0) {
      c.t += dt;

      if (c.t > c.lie) {
        var k = (c.t - c.lie) / GO_MS;

        if (k >= 1) {
          if (c.go.world !== null) c.go.world.removeGameObject(c.go);
          return false;
        }

        c.go.spriteRenderer.opacity = 1 - k;
      }

      return true;
    }

    c.vy -= DROP * s;
    c.x += c.vx * s;
    c.y += c.vy * s;
    c.z += c.vz * s;

    var under = groundAt(self, g[0] + c.x, g[2] + c.z) - g[1];

    if (c.y <= under) {
      c.y = under;

      //a bounce or two, lower each time, then it lies there
      if (c.bounced++ < 2 && c.vy < -12) {
        c.vy = -c.vy * 0.3;
        c.vx *= 0.5;
        c.vz *= 0.5;
      } else c.t = 0;
    }

    c.go.transform.setLocalPosition(c.x, c.y, c.z);

    return true;
  });
}

//how high the ground is at x, z in the world, world units
function groundAt(self, x, z) {
  return (
    self.root.core.terrain.getHeight(x / TILE + 0.5, z / TILE + 0.5) *
    Config.tileZStep
  );
}

/**
 * A tile down: its rubble coming up under the dust rolling out over it, its
 * foot going.
 */
function down(self, col) {
  col.state = "down";
  col.t = 0;

  col.whole.forEach(gone);
  col.whole = [];
  col.cuts = [];
  col.floors.forEach(gone);
  col.feet.forEach(function (f) {
    f.go.spriteRenderer.dither = true;
  });

  var x = Terrain.extractX(col.tile),
    y = Terrain.extractY(col.tile),
    g = self.go.transform.getPosition([0, 0, 0]);

  for (var k = 0; k < DOWN_PUFFS; k++)
    debris(
      self,
      (x + (Math.random() - 0.5) * 0.9) * TILE - g[0],
      (y + (Math.random() - 0.5) * 0.9) * TILE - g[2],
      Math.random() * 8,
      DOWN_OUT[0] + Math.random() * (DOWN_OUT[1] - DOWN_OUT[0]),
    );

  if (self.rubbles) rubble(self, col);
}

//a tile's rubble coming up, its foot going, as it settles
function settle(self, col, dt) {
  if (col.t >= SETTLE_MS) return;

  col.t += dt;

  var k = Math.min(1, col.t / SETTLE_MS);

  if (col.rubble !== null) col.rubble.spriteRenderer.opacity = k;
  col.feet.forEach(function (f) {
    f.go.spriteRenderer.opacity = 1 - k;
    if (k >= 1) gone(f);
  });
}

function gone(p) {
  if (p.gone) return;

  p.gone = true;
  if (p.go.world !== null) p.go.world.removeGameObject(p.go);
  changed();
}

/**
 * A tile's rubble pushed away - by the bulldozer that got there - and what
 * else was left there: down at once, if it was not yet.
 */
function letGo(self, tile) {
  var col = self.columns[tile];

  if (col === undefined || col.state === "gone") return;

  if (col.state !== "down") down(self, col);

  col.feet.forEach(gone);
  if (col.rubble !== null && col.rubble.world !== null)
    col.rubble.world.removeGameObject(col.rubble);
  col.rubble = null;
  col.state = "gone";
  changed();
}

/**
 * The fence round it, as a building site has (shared/gen/sites fence - for
 * a small one its low rail; shared/gen/stacking fenced): along every edge
 * of a tile of it that is an edge of it, with a gate in the middle of its
 * front, the way it is seen now - on every tile not pushed away yet. The
 * stretches at the back of a tile are drawn just behind what stands on it
 * and the ones at its front just in front of it, so that the building is
 * between them, as it would be within them.
 */
function fence(self) {
  var x0 = Infinity,
    x1 = -Infinity,
    y0 = Infinity,
    tile;

  for (tile in self.columns) {
    x0 = Math.min(x0, Terrain.extractX(+tile));
    x1 = Math.max(x1, Terrain.extractX(+tile));
    y0 = Math.min(y0, Terrain.extractY(+tile));
  }

  var gate = x0 + Math.floor((x1 - x0) / 2);

  for (tile in self.columns) {
    var t = +tile,
      x = Terrain.extractX(t),
      y = Terrain.extractY(t),
      mask =
        (self.columns[t - 1] ? "0" : "1") +
        (self.columns[t - Terrain.dy]
          ? "0"
          : y === y0 && x === gate
            ? "2"
            : "1") +
        (self.columns[t + 1] ? "0" : "1") +
        (self.columns[t + Terrain.dy] ? "0" : "1");

    unfence(self, t);
    if (mask !== "0000") self.fences[t] = stretches(self, t, mask);
  }
}

//a tile's stretches of the fence along the edges mask says (shared/gen/sites
//PARTS), at its back and at its front, as they are seen
function stretches(self, tile, mask) {
  var sprites = self.root.sprites,
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    ground =
      self.root.core.terrain.getHeight(x + 0.5, y + 0.5) * Config.tileZStep,
    away = View.unvector(FENCE_SHIFT, FENCE_SHIFT),
    out = [];

  ["back", "front"].forEach(function (side) {
    var name = "gen/sites/fence/" + mask + "/" + side + "/r" + View.turns(),
      frame = sprites.frame(name);

    //none of it on this side of the tile, as it is seen
    if (frame === undefined || frame.w === 0) return;

    var go = new engine.GameObject("fence"),
      renderer = new engine.SpriteRenderer(),
      //back or forward as it is seen, but where it was on the screen
      by = View.top() ? 0 : side === "back" ? 1 : -1;

    renderer.layer = RenderLayer.buildingsLayer;
    go.addComponent(renderer);

    if (View.top()) {
      var top = sprites.topOf(name);

      renderer.setSprite(top);
      renderer.pivotX = top.pivotX;
      renderer.pivotY = top.pivotY;
    } else {
      renderer.setSprite(sprites.getSprite(name));
      renderer.pivotX = frame.pivotX;
      renderer.pivotY = frame.pivotY - by * FENCE_SHIFT * TILE_PX;
    }

    go.transform.setPosition(
      (x + by * away[0]) * TILE,
      ground,
      (y + by * away[1]) * TILE,
    );
    self.root.game.logic.world.addGameObject(go);
    out.push(go);
  });

  changed();

  return out;
}

//a tile's stretches of the fence gone
function unfence(self, tile) {
  var gos = self.fences[tile];

  if (gos === undefined) return;

  gos.forEach(function (go) {
    if (go.world !== null) go.world.removeGameObject(go);
  });
  delete self.fences[tile];
  changed();
}

/**
 * Turned round: what is coming down is down, and what still stands is put
 * up again as it is seen now - the building drawn again from the new side
 * for it (client/buildingview), as it was drawn when it was cleared away,
 * whatever the world has made of it since (standIn).
 */
function turn(self) {
  var standing = false;

  //the fence as it is seen from the new side
  if (self.fenced) fence(self);

  self.chunks.forEach(function (c) {
    if (c.go.world !== null) c.go.world.removeGameObject(c.go);
  });
  self.chunks = [];

  for (var tile in self.columns) {
    var col = self.columns[tile];

    if (col.state === "shaking" || col.state === "falling") down(self, col);
    if (col.state === "down") {
      col.t = SETTLE_MS;
      col.feet.forEach(gone);
      if (col.rubble !== null) {
        col.rubble.spriteRenderer.opacity = 1;
        dress(self, col);
      }
    }
    if (col.state === "standing") {
      col.floors.concat(col.feet, col.whole).forEach(gone);
      col.floors = [];
      col.feet = [];
      col.whole = [];
      col.cuts = [];
      standing = true;
    }
  }

  if (!standing) return;

  var view = new BuildingView();

  view.setBuilding(self.standIn);
  view.update();
  stand(
    self,
    view.gameObject,
    view.gameObject.transform.getPosition([0, 0, 0]),
  );
  view.dispose();

  //burnt as it was, and open where it was, from the new side
  if (self.words !== null) self.burn(self.words);
  for (tile in self.columns) self.columns[tile].open = 0;
  ahead(self);
  open(self);
}

//all of it down, and pushed away, and every piece of it gone
function end(self) {
  for (var tile in self.fences) unfence(self, +tile);
  if (self.go.world !== null) self.go.world.removeGameObject(self.go);
  if (self.turned !== null) {
    Events.off(View, View.events.change, self.turned);
    self.turned = null;
  }
}

/**
 * A puff of grey dust x, z off where the building is drawn from (world
 * units), up that high over the ground there, thrown out from the middle of
 * it - so many puffs at the most.
 */
function debris(self, x, z, up, out) {
  if (self.puffs >= MOST_PUFFS) return;

  self.puffs++;

  var g = self.go.transform.getPosition([0, 0, 0]),
    wx = g[0] + x,
    wz = g[2] + z,
    dx = wx - self.mx,
    dz = wz - self.mz,
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
 * The heap of rubble on a tile, coming up as it settles, lying on the ground
 * there the way stones do (client/envman).
 */
function rubble(self, col) {
  if (col.rubble !== null) return;

  var go = new engine.GameObject("rubble"),
    renderer = new engine.SpriteRenderer();

  renderer.layer = RenderLayer.buildingsLayer;
  go.addComponent(renderer);
  renderer.dither = true;
  renderer.opacity = 0;
  col.rubble = go;
  dress(self, col);
  self.root.game.logic.world.addGameObject(go);
  changed();
}

//the rubble on a tile, as it is seen, where the ground is
function dress(self, col) {
  var go = col.rubble,
    x = Terrain.extractX(col.tile),
    y = Terrain.extractY(col.tile),
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
    x * TILE,
    self.root.core.terrain.getHeight(x + 0.5, y + 0.5) * Config.tileZStep,
    y * TILE,
  );
}

//a number for a tile, the same every time
function hash(x, y) {
  var h = Math.imul(x, 0x2c1b3c6d) ^ Math.imul(y, 0x297a2d39) ^ 0x68e31da4;

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);

  return (h ^ (h >>> 13)) >>> 0;
}

/**
 * What a building coming down is taken apart and thrown about with, for
 * whatever else brings one down (client/explosion) - each working on
 * anything shaped like a Demolition: {root, go, columns, chunks, chunked,
 * puffs, mx, mz} and, at the most, so many pieces (most).
 */
var pieces = {
  partsOf: partsOf,
  column: column,
  stand: stand,
  slice: slice,
  seat: seat,
  burst: burst,
  flyOn: flyOn,
  debris: debris,
  gone: gone,
  bottomOf: bottomOf,
};

export default { Demolition: Demolition, pieces: pieces };
