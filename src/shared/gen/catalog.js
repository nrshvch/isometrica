/**
 * Every picture the game paints for itself rather than loads - the ground,
 * the cars, the stones - and how to paint each one of them on its own.
 *
 * describe() tells, for one generator, what it will paint - every picture's
 * name and size - and what else the painting works out: a car's pivot, where
 * its smoke comes out, which slopes have a shore. It runs at build time
 * (tools/packsprites.js) without painting anything, and what it says is
 * written out as gfx/generated/<generator>.json. So the game knows every
 * generated sprite and its size before any of it is painted, and paints a
 * picture only when something is about to draw it: createPainter() does
 * that, one picture at a time, in the generator worker (client/generator).
 */
import * as Terrain from "./terrain.js";
import * as Vehicles from "./vehicles.js";
import * as Stones from "./stones.js";
import * as Flats from "./flats.js";
import * as Offices from "./offices.js";
import * as Sites from "./sites.js";
import * as Shops from "./shops.js";
import * as Houses from "./houses.js";
import * as Utilities from "./utilities.js";
import * as Parks from "./parks.js";
import * as Oldtown from "./oldtown.js";
import * as Roads from "./roads.js";
import * as Trees from "./trees.js";
import * as Foundations from "./foundations.js";
import { tileName, shoreName, gridName, diffuseName } from "./names.js";
import * as iso from "./isobox.js";

//the kinds of ground the terrain is drawn with: the land, the water its
//shore runs into, and the water further out, too deep to see the bottom of
var LAND = "grass",
  WATER = "water_shallow",
  DEEP = "water_deep";

//the edges and corners deep water spills over the shallows from, and how
//many of each there are (shared/gen/terrain DIRECTIONS, diffuseVariants)
var SPILLS = ["ne", "se", "sw", "nw", "n", "e", "s", "w"],
  SPILL_VARIANTS = 2;

export var GENERATORS = [
  "terrain",
  "vehicles",
  "stones",
  "flats",
  "offices",
  "sites",
  "shops",
  "houses",
  "utilities",
  "parks",
  "oldtown",
  "roads",
  "trees",
  "foundations",
];

//the generators of blocks put together out of parts (shared/gen/blocks)
//the generators of parts that buildings are put together out of: the blocks
//(shared/gen/blocks) and the building sites every building goes up on
var BLOCKS = {
  flats: Flats,
  offices: Offices,
  sites: Sites,
  shops: Shops,
  houses: Houses,
  utilities: Utilities,
  parks: Parks,
  oldtown: Oldtown,
  roads: Roads,
  trees: Trees,
  foundations: Foundations,
};

/**
 * The generators that can paint a picture of theirs the ways the light is
 * worked out from as it is drawn: its colours with no light on them and
 * which way every pixel of it looks, or what of it shines at night and how
 * high it stands (isobox setMode, shared/gen/looks) - those that paint out
 * of boxes, and the ground, the trees and the vehicles, which paint their
 * own - see createPainter. Only the stones, painted from pictures drawn by
 * hand, cannot.
 */
export var FACED = {};

Object.keys(BLOCKS).forEach(function (gen) {
  FACED[gen] = true;
});

//and those that paint their own (shared/gen/looks) - the ground, the trees
//and the vehicles - by the look they are handed
var OWN_LOOKS = { terrain: true, trees: true, vehicles: true };

FACED.terrain = FACED.vehicles = true;

//the hand-drawn pictures each generator paints from, by what their names
//start with
export var INPUTS = {
  //painted from nothing
  terrain: [],
  vehicles: [],
  flats: [],
  offices: [],
  sites: [],
  shops: [],
  houses: [],
  utilities: [],
  parks: [],
  oldtown: [],
  roads: [],
  trees: [],
  foundations: [],
  stones: ["scenery/stones/", "terrain/grass/2222.png"],
};

/**
 * The pictures under a prefix, by what they are called after it - "2222" for
 * "terrain/grass/2222.png".
 */
function under(pixels, prefix) {
  var out = {};

  Object.keys(pixels).forEach(function (name) {
    if (name.indexOf(prefix) === 0)
      out[name.slice(prefix.length).replace(/\.png$/, "")] = pixels[name];
  });

  return out;
}

/**
 * What one generator will paint, without painting it.
 *
 * @param gen {string} one of GENERATORS
 * @param pixels {Object} the hand-drawn pictures its INPUTS name, by sprite
 *        name, as {width, height, data}
 * @returns {{sprites: Object, data: Object}} sprites, every picture it
 *          paints by sprite name: {w, h, key} - its size and what the
 *          generator calls it, where that is not its name; data, what the game needs to know besides:
 *          for terrain, which tiles there are to draw a tile of each kind and
 *          slope with (see client/generated tileParts); for vehicles, every
 *          body type as shared/gen/vehicles describes it; for blocks -
 *          flats, offices - what parts there are to put a block together
 *          out of, and how high a storey is - and each of their sprites has
 *          pivotX/pivotY too, where the middle of its tile is in it
 */
export function describe(gen, pixels) {
  var sprites = {},
    data = null;

  function add(name, size, key) {
    sprites[name] = { w: size.w, h: size.h };

    //left out where it is the sprite's own name, as for most of them
    if (key !== name) sprites[name].key = key;

    //a part of something put together - where in it the tile it stands on is
    if (size.pivotX !== undefined) {
      sprites[name].pivotX = size.pivotX;
      sprites[name].pivotY = size.pivotY;
    }
  }

  if (gen === "terrain") {
    var terrain = Terrain.describe(null, {
        tilesets: [LAND, WATER, DEEP],
        diffuse: false,
      }),
      sets = terrain.manifest.tilesets;

    data = {
      land: LAND,
      water: WATER,
      deep: DEEP,
      variants: {},
      shores: {},
      //deep water spilling over the shallows next to it, on the flat
      spills: { dirs: SPILLS, variants: SPILL_VARIANTS },
      //the water's ripples: how many frames there are, and how long each is
      //shown, in ms - frame f of a tile is its name with @t<f> after it
      waves: { frames: Terrain.WAVE_FRAMES, ms: Terrain.WAVE_MS },
    };

    [LAND, WATER, DEEP].forEach(function (id) {
      Object.keys(sets[id].base).forEach(function (slope) {
        sets[id].base[slope].forEach(function (rel, v) {
          add(tileName(id, slope, v), terrain.sizes[rel], rel);
        });

        data.variants[id] = sets[id].base[slope].length;
      });
    });

    //only the shallows meet the land
    Object.keys(sets[WATER].shore).forEach(function (slope) {
      var rel = sets[WATER].shore[slope];

      add(shoreName(WATER, slope), terrain.sizes[rel], rel);
      data.shores[slope] = true;
    });

    //deep water spilling over the edge of the shallows next to it, dithered
    //as it thins out: the contour between the two
    SPILLS.forEach(function (dir) {
      for (var v = 0; v < SPILL_VARIANTS; v++)
        add(
          diffuseName(DEEP, Terrain.FLAT, dir, v),
          { w: Terrain.WIDTH, h: Terrain.HEIGHT },
          DEEP + "/diffuse/" + Terrain.FLAT + "_" + dir + "_" + v + ".png",
        );
    });

    //and the grid, over every tile of every slope
    terrain.manifest.slopes.forEach(function (slope) {
      add(
        gridName(slope),
        { w: Terrain.WIDTH, h: Terrain.HEIGHT },
        "grid/" + slope + ".png",
      );
    });
  } else if (gen === "vehicles") {
    var vehicles = Vehicles.describe();

    Object.keys(vehicles.sizes).forEach(function (name) {
      add(name, vehicles.sizes[name], name);
    });
    data = vehicles.types;
  } else if (gen === "stones") {
    var stones = Stones.describe(
      under(pixels, "scenery/stones/"),
      pixels["terrain/grass/2222.png"],
    );

    Object.keys(stones).forEach(function (name) {
      add("gen/scenery/" + name, stones[name], name);
    });
  } else if (BLOCKS[gen] !== undefined) {
    var block = BLOCKS[gen].describe();

    Object.keys(block.sizes).forEach(function (name) {
      add(name, block.sizes[name], name);
    });
    data = block.data;
  } else throw new Error("no such generator: " + gen);

  return { sprites: sprites, data: data };
}

/**
 * Paints one generated picture at a time.
 *
 * @param loadPixels {function(string[]): Promise<Object>} the hand-drawn
 *        pictures whose names start with any of the prefixes given, by
 *        sprite name, as {width, height, data} - asked for once for each
 *        generator, the first time it paints anything
 */
export function createPainter(loadPixels) {
  var painters = {};

  function painter(gen) {
    if (painters[gen] === undefined)
      painters[gen] = loadPixels(INPUTS[gen]).then(
        function (pixels) {
          if (gen === "terrain") return Terrain.createPainter(null);
          if (gen === "stones")
            return Stones.createPainter(
              under(pixels, "scenery/stones/"),
              pixels["terrain/grass/2222.png"],
            );
          if (BLOCKS[gen] !== undefined) return { paint: BLOCKS[gen].paint };
          return { paint: Vehicles.paint };
        },
        function (e) {
          //asked for again next time
          delete painters[gen];
          throw e;
        },
      );

    return painters[gen];
  }

  return {
    /**
     * @param spec {{gen: string, key: string, look: string}} the generator,
     *        and what it calls the picture - the key describe gives - and
     *        for one of the FACED, how it is to be painted, if not lit: as
     *        isobox setMode has it, "deferred" or "night"
     * @returns {Promise<{width, height, data}>}
     */
    paint: function (spec) {
      return painter(spec.gen).then(function (p) {
        if (!spec.look || FACED[spec.gen] !== true) return p.paint(spec.key);
        if (OWN_LOOKS[spec.gen]) return p.paint(spec.key, spec.look);

        iso.setMode(spec.look);
        try {
          return p.paint(spec.key);
        } finally {
          iso.setMode("lit");
        }
      });
    },
  };
}
