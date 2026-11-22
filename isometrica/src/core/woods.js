/**
 * Where the world's trees grow, and which (core/ambient): not every kind
 * everywhere, but woods of their own - spruce forest, pine woods, birch
 * groves, broadleaf woods of beech, oak and ash, alder by the water, and
 * open meadow with an oak standing here and there.
 *
 * Every wood has a noise field of its own, and where its field is the
 * highest that wood grows. Where two are about as high they shade into each
 * other over a good few tiles, the trees of both standing among each other,
 * rather than meeting along a line. Spruce likes it high up, alder down on
 * the wet ground by the water; the others do not mind.
 *
 * Inside a wood its trees stand thicker in places and thinner in others,
 * with glades now and then, and each of its kinds in clumps of its own.
 *
 * The woods go on whatever the climate (core/climate), so a forest runs on
 * into the cold or the heat, and only what grows in it changes (FLORA): out
 * in the cold, the spruce and the pine snowed over, the broadleaf trees
 * mostly gone, and further out fewer and fewer trees, and fewer of them
 * alive, till there is only the dead wood left in the snow; in the desert,
 * hardly anything, and that dead and dried out.
 */
import Simplex from "simplex-noise";
import Trees from "../data/trees";
import Climate from "./climate";

//the woods: how thickly their trees stand, and which kinds grow in them,
//how many of each to the others - a dead one still standing, a stump or
//a fallen trunk among them now and then; and how much likelier the wood is high up
//(per step of height over UPLAND), down by the water (WET and below), and
//towards the shore (the most just above the water, less and less up to
//COAST steps of height)
var WOODS = [
  {
    name: "meadow",
    density: 0.04,
    trees: { oak: 6, ash: 1, stump: 0.2, snag: 0.05, log: 0.1 },
    likely: 0.25,
  },
  {
    name: "spruce forest",
    density: 0.85,
    trees: {
      spruce: 14,
      pine: 1,
      birch: 1,
      snag: 0.3,
      stump: 0.2,
      log: 0.2,
      logs: 0.1,
    },
    likely: 0,
    upland: 0.12,
  },
  {
    name: "pine wood",
    density: 0.5,
    trees: {
      pine: 14,
      birch: 1,
      spruce: 1,
      snag: 0.25,
      stump: 0.3,
      log: 0.2,
      logs: 0.05,
    },
    likely: 0,
    coast: 0.25,
  },
  {
    name: "broadleaf wood",
    density: 0.7,
    trees: {
      beech: 4,
      oak: 3,
      ash: 2,
      snag: 0.15,
      stump: 0.1,
      log: 0.15,
      logs: 0.05,
    },
    likely: 0,
  },
  {
    name: "alder by the water",
    density: 0.6,
    trees: {
      alder: 6,
      ash: 1,
      birch: 1,
      snag: 0.15,
      stump: 0.05,
      log: 0.1,
      logs: 0.05,
    },
    likely: -0.35,
    wet: 0.3,
  },
  {
    name: "birch grove",
    density: 0.55,
    trees: {
      birch: 14,
      pine: 1,
      alder: 1,
      snag: 0.25,
      stump: 0.1,
      log: 0.2,
      logs: 0.05,
    },
    likely: 0,
  },
];

//how many tiles across a wood is, about; over how many its edge is bent
//out of straight; and how sharply one gives way to the next - the higher,
//the narrower the stretch where they stand among each other
var SIZE = 110,
  BEND = 8,
  SHARP = 6;

//glades and thickets inside a wood, how many tiles across; and clumps of
//one kind in it
var GLADE = 6,
  CLUMP = 4;

var UPLAND = 3,
  WET = 1,
  COAST = 3;

/**
 * What grows in the zones of the climate that are not green, by the zone's
 * id (core/climate ZONES) - one with none grows the woods as they are:
 *
 *  - kinds: what each kind of the woods is there - one kind, or a few to pick
 *    from, as likely as each other; one that is not there, nothing;
 *  - die: the kinds still alive at the edge of the zone, which die off going
 *    further in, all of them dead dieOver degrees in - as one of dead;
 *  - density: how many of the trees the woods would have there are at the
 *    edge of the zone, and thin: how many fewer still, thinOver degrees
 *    further in.
 */
var FLORA = {
  cold: {
    kinds: {
      spruce: "snowspruce",
      pine: "snowpine",
      //the broadleaf trees die in the cold, and only now and then one
      //stands dead
      oak: [null, null, null, null, "snowsnag"],
      beech: [null, null, null, null, "snowsnag"],
      ash: [null, null, null, null, "snowsnag"],
      alder: [null, null, null, null, "snowsnag"],
      birch: [null, null, null, "snowsnag"],
      snag: "snowsnag",
      stump: "snowstump",
      log: "snowlog",
      logs: "snowlogs",
    },
    die: { snowspruce: true, snowpine: true },
    dead: ["snowsnag", "snowsnag", "snowlog", "snowstump"],
    dieOver: 9,
    density: 1,
    thin: 0.8,
    thinOver: 12,
  },
  hot: {
    kinds: {
      oak: "drysnag",
      beech: "drysnag",
      ash: "drysnag",
      alder: "drystump",
      birch: "drystump",
      pine: "drysnag",
      spruce: "drysnag",
      snag: "drysnag",
      stump: "drystump",
      log: "drylog",
      logs: "drylogs",
    },
    density: 0.08,
    thin: 0.7,
    thinOver: 8,
  },
};

var simplex = new Simplex("woods");

var CODES = Trees.codesByKind();

WOODS.forEach(function (wood, w) {
  wood.kinds = Object.keys(wood.trees);
  //every wood's field and every kind's clumps somewhere else in the noise
  wood.at = [w * 97.3 + 11.1, w * -61.7 + 5.3];
});

/**
 * A number in [0, 1) for every tile, as good as random and nothing like the
 * one next to it. Every salt gives another one.
 */
function hash(x, y, salt) {
  var h =
    Math.imul(x, 0x27d4eb2d) ^
    Math.imul(y, 0x165667b1) ^
    Math.imul(salt, 0x9e3779b1);

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Which wood the tile at x, y is in, as an index into WOODS: where two shade
 * into each other, now one and now the other.
 *
 * @param low {number} the height of the lowest corner of the tile
 */
function woodAt(x, y, low) {
  var bx = simplex.noise2D(x / BEND + 401.3, y / BEND - 77.9) * 0.18,
    by = simplex.noise2D(x / BEND - 233.1, y / BEND + 512.7) * 0.18,
    weights = [],
    sum = 0,
    w;

  for (w = 0; w < WOODS.length; w++) {
    var wood = WOODS[w],
      field =
        simplex.noise2D(
          x / SIZE + bx + wood.at[0],
          y / SIZE + by + wood.at[1],
        ) + wood.likely;

    if (wood.upland !== undefined)
      field += wood.upland * Math.max(0, low - UPLAND);
    if (wood.wet !== undefined && low <= WET) field += wood.wet;
    if (wood.coast !== undefined)
      field += (wood.coast * Math.max(0, COAST + 1 - low)) / COAST;

    weights[w] = Math.exp(SHARP * field);
    sum += weights[w];
  }

  var pick = hash(x, y, 21) * sum;

  for (w = 0; w < WOODS.length - 1; w++) {
    pick -= weights[w];
    if (pick < 0) return w;
  }

  return w;
}

function smoothstep(lo, hi, v) {
  var t = clamp01((v - lo) / (hi - lo));
  return t * t * (3 - 2 * t);
}

/**
 * Whether a tree grows on the tile at x, y of the wood w - it stands
 * thicker in places, and in a glade none do; and where the climate has it,
 * only so many of them (FLORA density).
 */
function grows(x, y, w, density) {
  var thick = clamp01(
    0.8 + 0.7 * simplex.noise2D(x / GLADE + 71.9, y / GLADE - 301.3),
  );

  return hash(x, y, 22) < WOODS[w].density * thick * density;
}

/**
 * What a kind of tree of the woods is in a zone of the climate (FLORA), on
 * the tile at x, y, that far into it - or null for nothing.
 */
function climateKind(flora, kind, x, y, depth) {
  var k = flora.kinds[kind];

  if (k === undefined) return null;
  if (Array.isArray(k)) k = k[Math.floor(hash(x, y, 25) * k.length)];
  if (k === null) return null;

  //the further in, the more of the living ones are dead
  if (
    flora.die !== undefined &&
    flora.die[k] === true &&
    hash(x, y, 26) < smoothstep(0, flora.dieOver, depth)
  )
    k = flora.dead[Math.floor(hash(x, y, 27) * flora.dead.length)];

  return k;
}

/**
 * Which kind of tree of the wood w grows on the tile at x, y: each kind as
 * likely as the wood has it, overall, but in clumps of its own.
 */
function kindAt(x, y, w) {
  var wood = WOODS[w],
    scores = [],
    sum = 0,
    k;

  for (k = 0; k < wood.kinds.length; k++) {
    var clump = simplex.noise2D(
      x / CLUMP + wood.at[0] + k * 37.1,
      y / CLUMP + wood.at[1] - k * 53.9,
    );

    scores[k] = wood.trees[wood.kinds[k]] * Math.exp(1.6 * clump);
    sum += scores[k];
  }

  var pick = hash(x, y, 23) * sum;

  for (k = 0; k < wood.kinds.length - 1; k++) {
    pick -= scores[k];
    if (pick < 0) break;
  }

  return wood.kinds[k];
}

/**
 * The tree that grows on the tile at x, y, as its building code, or null
 * where none does - the same every time it is asked.
 *
 * @param low {number} the height of the lowest corner of the tile
 */
function treeAt(x, y, low) {
  var w = woodAt(x, y, low),
    flora = FLORA[Climate.zoneAt(x, y).id],
    density = 1,
    depth = 0,
    kind;

  if (flora !== undefined) {
    depth = Math.max(0, Climate.depth(x, y, Climate.zoneAt(x, y).id));
    density =
      flora.density * (1 - flora.thin * smoothstep(0, flora.thinOver, depth));
  }

  if (!grows(x, y, w, density)) return null;

  kind = kindAt(x, y, w);

  if (flora !== undefined) kind = climateKind(flora, kind, x, y, depth);
  if (kind === null) return null;

  var codes = CODES[kind];

  return codes[Math.floor(hash(x, y, 24) * codes.length)];
}

export default {
  WOODS: WOODS,
  FLORA: FLORA,
  woodAt: woodAt,
  treeAt: treeAt,
};
