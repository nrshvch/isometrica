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
import { tileName, shoreName } from "./names.js";

//the kinds of ground the terrain is drawn with: the land, the water its
//shore runs into, and the water further out, too deep to see the bottom of
var LAND = "grass",
  WATER = "water_shallow",
  DEEP = "water_deep";

export var GENERATORS = ["terrain", "vehicles", "stones"];

//the hand-drawn pictures each generator paints from, by what their names
//start with
export var INPUTS = {
  terrain: ["terrain/grass/", "terrain/water/", "terrain/shore/"],
  vehicles: [],
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

function terrainSources(pixels) {
  return {
    grass: under(pixels, "terrain/grass/"),
    water: under(pixels, "terrain/water/"),
    shore: under(pixels, "terrain/shore/"),
  };
}

/**
 * What one generator will paint, without painting it.
 *
 * @param gen {string} one of GENERATORS
 * @param pixels {Object} the hand-drawn pictures its INPUTS name, by sprite
 *        name, as {width, height, data}
 * @returns {{sprites: Object, data: Object}} sprites, every picture it
 *          paints by sprite name: {w, h, key} - its size and what the
 *          generator calls it; data, what the game needs to know besides:
 *          for terrain, which tiles there are to draw a tile of each kind and
 *          slope with (see client/generated tileParts); for vehicles, every
 *          body type as shared/gen/vehicles describes it
 */
export function describe(gen, pixels) {
  var sprites = {},
    data = null;

  function add(name, size, key) {
    sprites[name] = { w: size.w, h: size.h, key: key };
  }

  if (gen === "terrain") {
    var terrain = Terrain.describe(terrainSources(pixels), {
        tilesets: [LAND, WATER, DEEP],
        diffuse: false,
      }),
      sets = terrain.manifest.tilesets;

    data = { land: LAND, water: WATER, deep: DEEP, variants: {}, shores: {} };

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
          if (gen === "terrain")
            return Terrain.createPainter(terrainSources(pixels));
          if (gen === "stones")
            return Stones.createPainter(
              under(pixels, "scenery/stones/"),
              pixels["terrain/grass/2222.png"],
            );
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
     * @param spec {{gen: string, key: string}} the generator, and what it
     *        calls the picture - the key describe gives
     * @returns {Promise<{width, height, data}>}
     */
    paint: function (spec) {
      return painter(spec.gen).then(function (p) {
        return p.paint(spec.key);
      });
    },
  };
}
