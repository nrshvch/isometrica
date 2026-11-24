/**
 * Smoke, worked out, not kept: a puff is a function of its source, its seed
 * and the time - where it has drifted with the wind, how big and how see-
 * through it is - written a frame at a time into one draw list of particles
 * and drawn in one batch after the buildings (client/lighting particles).
 * Chimneys are rows found by region with their reach; a puff let out once (a
 * car, a fire, a blast, a bulldozer) is a row of where and when, gone when
 * its life is. Skill rendering, smoke.md.
 */
import engine from "engine";
import Config from "./config";
import RenderLayer from "./renderlayer";
import Wind from "./wind";
import { DrawList, Pictures, Visible } from "shared/draw";
import { Integral } from "shared/integral";
import { toss } from "shared/random";
import { GridIndex } from "shared/spatial";
import { NumMap, Store } from "shared/typed";

var Stats = engine.Stats,
  SECTION = Stats.section("smoke"),
  SOURCES = Stats.counter("smoke sources"),
  PUFFS = Stats.counter("puffs"),
  ON_SCREEN = Stats.counter("puffs on screen"),
  DRAWN = Stats.counter("puffs drawn");

//the pictures a puff grows through, one after another, by what it is
function frames(kind) {
  var out = [];

  for (var f = 0; f < 6; f++) out.push("gen/smoke/" + kind + f);

  return out;
}

/*
 * The kinds of smoke: their pictures (shared/gen/smoke), how long a puff
 * lasts (ttl, ms), how fast it rises as it comes out (world units a
 * second), how much of that it has lost at the end of its life (cools, 0.65
 * unless said), how far up its life it is at its thickest (peak) and how
 * thick that is (thick, 0..1) - or, too thick to see through (solid), how
 * far up its life it stays so - and up high, how hard the wind has it at
 * the least (aloft, world units a second).
 */
var Smoke = {
  //white, out of a chimney: lazy, slow, and see-through
  steam: {
    looks: frames("steam"),
    ttl: 6500,
    rise: 5.5,
    peak: 0.12,
    thick: 0.8,
  },
  //black, out of an engine on fire: quicker and thicker
  soot: {
    looks: frames("soot"),
    ttl: 3000,
    rise: 16,
    peak: 0.06,
    thick: 1,
    solid: 0.5,
  },
  //grey, a building coming down (client/demolition): thick, slow to settle
  debris: {
    looks: frames("debris"),
    ttl: 6000,
    rise: 3.5,
    peak: 0.06,
    thick: 1,
  },
  //brown, off ground being cleared (client/clearworks): low, lingering
  dust: { looks: frames("dust"), ttl: 3600, rise: 2.5, peak: 0.1, thick: 0.9 },
  //black off a building on fire (client/fires): up fast and high, levelling
  //off and streaming away on the wind up there
  plume: {
    looks: frames("plume"),
    ttl: 42000,
    rise: 14,
    cools: 0.9,
    peak: 0.04,
    thick: 1,
    solid: 0.6,
    aloft: 12,
  },
  //the dust a building blown up raises (client/explosion, collapse)
  cloud: {
    looks: frames("cloud"),
    ttl: 20000,
    rise: 1.6,
    cools: 0.6,
    peak: 0.05,
    thick: 0.96,
  },
  //a fireball (client/explosion): out and gone in a moment
  fire: { looks: frames("fire"), ttl: 1100, rise: 18, peak: 0.04, thick: 1 },
};

//how often a chimney with a fire going lets a puff out, ms, and how far
//either way of its turn each comes, as a share of that
var PUFF_EVERY = 800,
  JITTER = 0.125;

//how often a house makes up its mind about its fire, ms, give or take half
//that again; how often whether anybody lives there is looked at again
var RETHINK = 180000,
  LOOK_AGAIN = 2000;

//what a toss of smoke's is salted with, so it is nothing else's
var SEED = 0x5e0c;

//how many houses have a fire going, by the hour
function lit(hour) {
  if (hour >= 6 && hour < 9) return 0.7;
  if (hour >= 17 && hour < 23) return 0.6;
  if (hour >= 9 && hour < 17) return 0.22;
  return 0.18;
}

/* --- The kinds, as columns ---------------------------------------------- */

var kinds = {
    count: 0,
    ttl: new Float64Array(16),
    rise: new Float64Array(16),
    cools: new Float64Array(16),
    peak: new Float64Array(16),
    thick: new Float64Array(16),
    solid: new Float64Array(16),
    aloft: new Float64Array(16),
    first: new Uint32Array(16),
    frames: new Uint32Array(16),
  },
  kindIds = new WeakMap(),
  //every picture of every kind, by number: its name, the sprite it is
  pictureNames = [],
  pictures = Pictures(64),
  sprites = [];

//the number of a kind - any object shaped as those above, a fire's own plume
//(client/fires plumeOf) as well
function kindOf(def) {
  var id = kindIds.get(def);

  if (id !== undefined) return id;

  id = kinds.count++;
  if (id >= kinds.ttl.length)
    Object.keys(kinds).forEach(function (k) {
      if (k === "count") return;

      var more = new kinds[k].constructor(kinds[k].length * 2);

      more.set(kinds[k]);
      kinds[k] = more;
    });

  kinds.ttl[id] = def.ttl;
  kinds.rise[id] = def.rise;
  kinds.cools[id] = def.cools === undefined ? 0.65 : def.cools;
  kinds.peak[id] = def.peak;
  kinds.thick[id] = def.thick;
  kinds.solid[id] = def.solid === undefined ? -1 : def.solid;
  kinds.aloft[id] = def.aloft || 0;
  kinds.first[id] = pictureNames.length;
  kinds.frames[id] = def.looks.length;
  def.looks.forEach(function (name) {
    pictureNames.push(name);
    pictures.add(0, 0, 0, 0);
    sprites.push(null);
  });
  kindIds.set(def, id);

  return id;
}

/* --- The wind, integrated ----------------------------------------------- */

//the wind over a puff's life: along x and z, and how much it leaves of the
//rise (1 - 0.55 of how hard it blows) - held 100 ms at a time, two minutes
//of it kept (shared/integral); and up high, as hard as aloft at the least
var STEP = 100,
  KEPT = 120000,
  blowing = [0, 0];

var low = Integral(3, STEP, KEPT, function (t, out) {
    var w = Wind(t, blowing);

    out[0] = w[0];
    out[1] = w[1];
    out[2] = 1 - 0.55 * Wind.strength(w);
  }),
  high = new Map();

function aloftOf(aloft) {
  var I = high.get(aloft);

  if (I === undefined) {
    I = Integral(2, STEP, KEPT, function (t, out) {
      var w = Wind(t, blowing),
        m = Math.hypot(w[0], w[1]) || 1,
        k = Math.max(aloft, m * 3) / m;

      out[0] = w[0] * k;
      out[1] = w[1] * k;
    });
    high.set(aloft, I);
  }

  return I;
}

var m = new Float64Array(9),
  ma = new Float64Array(6);

/**
 * Where a puff of kind k let out at x, y, z at born, thrown out vx, vz
 * (world units a second, slowing to nothing), is at now, into out[0..2]:
 * rising slower and slower as it cools, and the less the harder it blows;
 * drifting with the wind the more the longer it has been out (up high,
 * straight up first and then over) - the integral of what the puff used to
 * do a frame at a time, worked out in one go from the wind's.
 */
function place(k, born, x, y, z, vx, vz, now, out) {
  var ttl = kinds.ttl[k],
    u = (now - born) / ttl,
    aloft = kinds.aloft[k],
    left = 1 - u,
    thrown = (ttl * (1 - left * left * left)) / 3000,
    dx,
    dz;

  low.over(born, now, m);

  if (aloft > 0) {
    aloftOf(aloft).over(born, now, ma);
    dx = (0.1 * ma[0] + (1.8 * ma[2]) / (ttl * ttl)) / 1000;
    dz = (0.1 * ma[3] + (1.8 * ma[5]) / (ttl * ttl)) / 1000;
  } else {
    dx = (0.3 * m[0] + m[1] / ttl) / 1000;
    dz = (0.3 * m[3] + m[4] / ttl) / 1000;
  }

  out[0] = x + dx + vx * thrown;
  out[1] = y + (kinds.rise[k] * (m[6] - (kinds.cools[k] * m[7]) / ttl)) / 1000;
  out[2] = z + dz + vz * thrown;

  return out;
}

//how thick a puff of kind k is u of the way through its life: thickening
//as it comes out, thinning to nothing after - or solid till it thins away
function alphaOf(k, u) {
  var solid = kinds.solid[k];

  if (solid >= 0)
    return u < solid ? 1 : 1 - Math.pow((u - solid) / (1 - solid), 0.8);

  var peak = kinds.peak[k];

  return (
    kinds.thick[k] *
    (u < peak ? u / peak : 1 - Math.pow((u - peak) / (1 - peak), 1.6))
  );
}

/* --- Sources and puffs -------------------------------------------------- */

//chimneys: where their tops are in the world, the ground under them, the
//house's tile and which of its chimneys (its seed), when its puffs come
//(phase), and whether anybody lives there to light a fire, as last looked
var sources = Store(
    {
      x: Float64Array,
      y: Float64Array,
      z: Float64Array,
      ground: Float64Array,
      tile: Float64Array,
      k: Uint16Array,
      phase: Float64Array,
      lookedAt: Float64Array,
      lived: Uint8Array,
    },
    256,
  ),
  //the house of each, by slot (city.missing), and the handles of each owner
  houses = [],
  owners = new Map(),
  //chimneys by region: a cell a chunk across
  byRegion = GridIndex(Config.chunkSize * Config.tileSize, 256);

//puffs let out once: where, when, what, and which way thrown
var puffs = Store(
  {
    x: Float64Array,
    y: Float64Array,
    z: Float64Array,
    ground: Float64Array,
    born: Float64Array,
    kind: Uint16Array,
    vx: Float32Array,
    vz: Float32Array,
  },
  256,
);

/**
 * How high the ground is under x, z in the world - world units, the way a
 * puff's height is - for how high over it a puff is (lit where it is in the
 * air, not as the ground it is drawn over).
 */
function groundUnder(x, z) {
  var terrain = vkaria.core.terrain,
    gx = x / Config.tileSize + 0.5,
    gy = z / Config.tileSize + 0.5,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    fx = gx - x0,
    fy = gy - y0,
    a = terrain.getGridPointHeight(x0, y0),
    b = terrain.getGridPointHeight(x0 + 1, y0),
    c = terrain.getGridPointHeight(x0, y0 + 1),
    d = terrain.getGridPointHeight(x0 + 1, y0 + 1);

  return (
    ((a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy) *
    Config.tileZStep
  );
}

/**
 * The chimneys of a house as owner draws it (client/buildingview): [x, y,
 * z] in the world for each - in place of any it had.
 *
 * @param house {Object} the core building: a house nobody has moved into,
 *        for want of a street or of water, has no fire going
 */
Smoke.chimneys = function (owner, house, tops) {
  Smoke.release(owner);
  if (tops.length === 0) return;

  var handles = [];

  tops.forEach(function (top, k) {
    var h = sources.add(),
      s = sources.slot(h),
      c = sources.cols,
      tile = house && house.tile !== undefined ? house.tile : 0;

    c.x[s] = top[0];
    c.y[s] = top[1];
    c.z[s] = top[2];
    c.ground[s] = groundUnder(top[0], top[2]);
    c.tile[s] = tile;
    c.k[s] = k;
    c.phase[s] = toss(SEED, tile, k, 0, 1);
    c.lookedAt[s] = -Infinity;
    houses[s] = house || null;
    byRegion.set(s, top[0], top[2]);
    handles.push(h);
  });
  owners.set(owner, handles);
};

//owner's chimneys gone: its house drawn again, or let go of
Smoke.release = function (owner) {
  var handles = owners.get(owner);

  if (handles === undefined) return;

  handles.forEach(function (h) {
    if (!sources.alive(h)) return;

    var s = sources.slot(h);

    byRegion.remove(s);
    houses[s] = null;
    sources.remove(h);
  });
  owners.delete(owner);
};

/**
 * Lets out one puff at that point in the world, to rise and fade there - for
 * whatever smokes on its own schedule, like a car.
 *
 * @param [kind] {Object} Smoke.steam, the default, soot, dust, debris...
 * @param [vx] {number} thrown out that way as it comes out, world units a
 *        second along x, slowing to nothing
 * @param [vz] {number} and along z
 */
Smoke.puff = function (world, x, y, z, kind, vx, vz) {
  var h = puffs.add(),
    s = puffs.slot(h),
    c = puffs.cols;

  c.x[s] = x;
  c.y[s] = y;
  c.z[s] = z;
  c.ground[s] = groundUnder(x, z);
  c.born[s] = world.logic.time.now;
  c.kind[s] = kindOf(kind || Smoke.steam);
  c.vx[s] = vx || 0;
  c.vz[s] = vz || 0;
};

/* --- A frame's puffs ---------------------------------------------------- */

//the house's fire for a while of its own, from which house and chimney and
//the while: the same whenever asked
function burning(tile, k, t, share) {
  if (share <= 0) return false;

  var shift = toss(SEED, tile, k, 0, 2) * RETHINK,
    slot = Math.floor((t + shift) / RETHINK);

  return toss(SEED, tile, k, slot, 3) < share;
}

//whether anybody lives in the house of chimney s to light a fire, looked at
//again now and then
function lived(s, now) {
  var c = sources.cols;

  if (now - c.lookedAt[s] < LOOK_AGAIN) return c.lived[s] === 1;

  var house = houses[s],
    city = house ? house.getCity() : null,
    yes = house === null || (city !== null && city.missing(house) === null);

  c.lookedAt[s] = now;
  c.lived[s] = yes ? 1 : 0;

  return yes;
}

/*
 * How many houses have a fire going at t, as the hour was when t came: noted
 * a while (SHARE_EVERY ms of the world's clock) at a time as it goes by, so
 * that a puff let out before the hour turned stays out after, and the same t
 * gives the same puffs whenever asked; a while not seen go by takes the hour
 * now.
 */
var SHARE_EVERY = 1000,
  shares = NumMap(256),
  old = [];

function shareAt(t, now, hourShare) {
  var b = Math.floor(t / SHARE_EVERY),
    v = shares.get(b, -1);

  if (v >= 0) return v;
  if (b === Math.floor(now / SHARE_EVERY)) {
    shares.set(b, hourShare);
    //and forgotten, every so often, once no puff can be that old
    if (b % 256 === 0) {
      old.length = 0;
      shares.forEach(function (key) {
        if (key < b - (2 * KEPT) / SHARE_EVERY) old.push(key);
      });
      old.forEach(function (key) {
        shares.delete(key);
      });
    }
  }

  return hourShare;
}

//the hour of the game's day
function hourNow() {
  var core = typeof vkaria !== "undefined" ? vkaria.core : null;

  return core && core.time ? core.time.hour : 12;
}

//how far a chimney's puffs can be from it on the ground and on the screen,
//world units: drifting as far as the hardest wind takes them in a life,
//rising, and the houses' own height
function reach() {
  var ttl = Smoke.steam.ttl / 1000,
    hardest = 10 * Math.max(1, Wind.factor);

  return ttl * hardest * 1.3 + ttl * Smoke.steam.rise * 2 + 6 * Config.tileSize;
}

var list = DrawList(512),
  seen = Visible(512),
  found = new Int32Array(256),
  at = new Float64Array(3),
  //the floats each picture is drawn from this frame (glQuad), and whether
  //it is ready
  src = new Float32Array(64 * 16),
  ready = new Int8Array(64),
  scratch = new Float32Array(24),
  //what glQuad is told it is drawing for: no night pictures has smoke
  NOBODY = {};

//a puff of kind k let out at born, as it is at now, into the list
function row(k, born, x, y, z, ground, vx, vz, now, tag) {
  var ttl = kinds.ttl[k],
    u = (now - born) / ttl;

  if (u < 0 || u >= 1) return;

  place(k, born, x, y, z, vx, vz, now, at);

  var n = kinds.frames[k],
    f = Math.min(n - 1, Math.floor(u * n)),
    r = list.add(at[0], at[1], at[2], kinds.first[k] + f, 0, tag);

  list.alpha[r] = alphaOf(k, u);
  over[r] = Math.max(0, at[1] - ground);
}

//how high each row of the list is over the ground under where it came out,
//for the light (Lighting particle)
var over = new Float64Array(512);

/**
 * Every puff alive at now, of the chimneys whose reach takes in the box
 * (x, z in the world) and of every puff let out: into the list, x, y, z,
 * picture, alpha, and the tag - a chimney's slot, or -1 - with how high
 * each is over its ground (over).
 */
function collect(now, box) {
  list.clear();
  if (over.length < puffs.count + 64)
    over = new Float64Array(puffs.count * 2 + 64);

  var steam = kindOf(Smoke.steam),
    ttl = kinds.ttl[steam],
    r = reach(),
    hourShare = lit(hourNow()),
    n = byRegion.query(box[0] - r, box[1] - r, box[2] + r, box[3] + r, found);

  if (n > found.length) {
    found = new Int32Array(n * 2);
    n = byRegion.query(box[0] - r, box[1] - r, box[2] + r, box[3] + r, found);
  }

  var c = sources.cols,
    xs = c.x,
    ys = c.y,
    zs = c.z,
    grounds = c.ground,
    tiles = c.tile,
    ks = c.k,
    phases = c.phase,
    i,
    s;

  Stats.count(SOURCES, n);

  for (i = 0; i < n; i++) {
    s = found[i];

    //the turns of its puffs that may be alive now: each its own way
    //either side of its turn
    var tile = tiles[s],
      k = ks[s],
      phase = phases[s],
      j0 = Math.floor((now - ttl) / PUFF_EVERY - phase - JITTER),
      j1 = Math.floor(now / PUFF_EVERY - phase + JITTER),
      any = false;

    for (var j = j0; j <= j1; j++) {
      var born =
        (j + phase + (toss(SEED, tile, k, j, 4) * 2 - 1) * JITTER) * PUFF_EVERY;

      if (born > now || now - born >= ttl) continue;
      if (!burning(tile, k, born, shareAt(born, now, hourShare))) continue;
      if (!any) {
        if (!lived(s, now)) break;
        any = true;
      }
      if (list.count >= over.length) over = grow(over);
      row(steam, born, xs[s], ys[s], zs[s], grounds[s], 0, 0, now, s);
    }
  }

  //and the puffs let out once: gone when their life is
  var p = puffs.cols;

  for (i = puffs.count - 1; i >= 0; i--) {
    s = puffs.live[i];

    var kind = p.kind[s];

    if (now - p.born[s] >= kinds.ttl[kind]) {
      puffs.remove(puffs.handle(s));
      continue;
    }
    if (list.count >= over.length) over = grow(over);
    row(
      kind,
      p.born[s],
      p.x[s],
      p.y[s],
      p.z[s],
      p.ground[s],
      p.vx[s],
      p.vz[s],
      now,
      -1,
    );
  }

  Stats.count(PUFFS, list.count);
}

function grow(a) {
  var more = new Float64Array(a.length * 2);

  more.set(a);

  return more;
}

//every picture the list uses sized and found on its page, this frame
function prepare(lighting) {
  var pics = list.picture,
    count = list.count,
    np = pictureNames.length,
    i;

  if (ready.length < np) {
    ready = new Int8Array(np * 2);
    src = new Float32Array(np * 2 * 16);
  }
  for (i = 0; i < np; i++) ready[i] = -1;

  for (i = 0; i < count; i++) {
    var p = pics[i];

    if (ready[p] !== -1) continue;

    var sprite = vkaria.sprites.getSprite(pictureNames[p]),
      ok =
        sprite.width > 0 &&
        sprite.glQuad !== undefined &&
        sprite.glQuad(
          NOBODY,
          lighting.flat,
          lighting.lit,
          lighting.lit && lighting.night,
          scratch,
          8,
        );

    sprites[p] = sprite;
    //held by its middle
    pictures.set(
      p,
      sprite.width,
      sprite.height,
      sprite.width >> 1,
      sprite.height >> 1,
    );
    ready[p] = ok ? 1 : 0;
    if (ok) src.set(scratch.subarray(8, 24), p * 16);
  }
}

/**
 * Draws the puffs on the screen this frame through lighting (Lighting
 * particles): worked out from their sources and the time, culled, and put
 * on the screen as the engine would a sprite.
 */
Smoke.draw = function (lighting) {
  var world = vkaria.game.logic.world,
    now = world.logic.time.now;

  Stats.begin(SECTION);
  collect(now, vkaria.tilesman.seen);
  prepare(lighting);

  seen.clear();
  seen.cull(
    list,
    pictures,
    lighting.M,
    lighting.width,
    lighting.height,
    engine.Config.cullMargin || 0,
  );

  var rows = seen.rows,
    sxs = seen.sx,
    sys = seen.sy,
    pics = list.picture,
    alphas = list.alpha,
    ys = list.y,
    drawn = 0;

  for (var i = 0; i < seen.count; i++) {
    var r = rows[i],
      p = pics[r];

    if (ready[p] !== 1) continue;
    lighting.particle(
      sxs[i],
      sys[i],
      pictures.width[p],
      pictures.height[p],
      alphas[r],
      ys[r],
      over[r],
      src,
      p * 16,
    );
    drawn++;
  }

  Stats.count(ON_SCREEN, seen.count);
  Stats.count(DRAWN, drawn);
  Stats.end(SECTION);
};

//drawn among the buildings, after them
Smoke.layer = RenderLayer.buildingsLayer;

/**
 * The chimneys' puffs there are at t round where the camera looks, eight
 * numbers a puff (x, y, z, picture, alpha, how high over its ground, the
 * house's tile, which chimney) - the same for the same t whenever asked, in
 * the order the chimneys are found (tools/world/smoke).
 */
Smoke.sample = function (t) {
  collect(t, vkaria.tilesman.seen);

  var out = [];

  for (var i = 0; i < list.count; i++) {
    if (list.tag[i] < 0) continue;
    out.push(
      list.x[i],
      list.y[i],
      list.z[i],
      list.picture[i],
      list.alpha[i],
      over[i],
      sources.cols.tile[list.tag[i]],
      sources.cols.k[list.tag[i]],
    );
  }

  return out;
};

Smoke.sources = sources;
Smoke.puffs = puffs;
Smoke.place = place;
Smoke.kindOf = kindOf;

export default Smoke;
