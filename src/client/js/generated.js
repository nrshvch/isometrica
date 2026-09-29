import SpriteCache from "./spritecache";
import Cache from "./generatedcache";
import { layout } from "shared/gen/pack";
import * as Terrain from "shared/gen/terrain";
import * as Vehicles from "shared/gen/vehicles";
import * as Stones from "shared/gen/stones";

//Everything the game paints for itself instead of loading it: the ground, the
//cars and the stones. It is painted as the game starts - mostly out of
//pictures drawn by hand, the grass, the shore and the painted stones - onto
//sheets of its own, one for each kind, laid out like the ones loaded from
//gfx/, and from then on drawn by name like any other sprite.
//
//What was painted is kept in the browser (generatedcache) and loaded instead
//the next time, as long as it was painted by the same painting out of the
//same pictures. The pictures tell for themselves - their hashes are part of
//what it is kept under. The painting cannot, so it has VERSION: bump it
//whenever a change under shared/gen, or here, changes what comes out, and
//every browser holding the old paint throws it away and paints anew.
export var VERSION = 3;

//the kinds of ground the terrain is drawn with: the land, the water its shore
//runs into, and the water further out, too deep to see the bottom of
var LAND = "grass",
  WATER = "water_shallow",
  DEEP = "water_deep";

var SOURCES = {
  grass: "terrain/grass/",
  water: "terrain/water/",
  shore: "terrain/shore/",
  stones: "scenery/stones/",
};

/**
 * Loads what was painted last time, or paints it, and hands every picture to
 * sprites.
 *
 * @param sprites {SpriteCache} with gfx/manifest.json loaded
 * @returns {Promise<Object>} what the painting worked out besides the
 *          pictures: terrain, which sprite a tile of each kind and slope is
 *          drawn with (see tileParts), and vehicles, every body type as
 *          shared/gen/vehicles describes it
 */
function prepare(sprites) {
  var inputs = [],
    key;

  Object.keys(SOURCES).forEach(function (kind) {
    inputs.push.apply(inputs, sprites.names(SOURCES[kind]));
  });

  key = [VERSION]
    .concat(
      inputs.map(function (name) {
        return sprites.version(name);
      }),
    )
    .filter(function (v, i, all) {
      return all.indexOf(v) === i;
    })
    .join(":");

  return Cache.read(key).then(function (record) {
    if (record === null) return paint(sprites, inputs, key);

    return restore(sprites, record).catch(function (e) {
      console.warn("Generated sprites painted again: " + e);
      return paint(sprites, inputs, key);
    });
  });
}

function restore(sprites, record) {
  return Promise.all(
    record.sheets.map(function (sheet) {
      return createImageBitmap(sheet.blob).then(function (image) {
        return { name: sheet.name, image: image, frames: sheet.frames };
      });
    }),
  ).then(function (sheets) {
    //all or nothing: a sheet that failed leaves the rest unused
    sheets.forEach(function (sheet) {
      sprites.addSheet(sheet.name, sheet.image, sheet.frames);
    });

    return record.data;
  });
}

function paint(sprites, inputs, key) {
  return sprites.readPixels(inputs).then(function (pixels) {
    var started = performance.now(),
      terrain = paintTerrain(pixels),
      vehicles = Vehicles.generate(),
      stones = paintStones(pixels),
      sheets = [
        pack("gen/terrain", terrain.images),
        pack("gen/vehicles", vehicles.images),
        pack("gen/stones", stones),
      ],
      data = { terrain: terrain.data, vehicles: vehicles.types };

    sheets.forEach(function (sheet) {
      sprites.addSheet(sheet.name, sheet.canvas, sheet.frames);
    });

    console.log(
      "Painted the generated sprites in " +
        Math.round(performance.now() - started) +
        "ms",
    );

    //kept for next time while the game goes on starting
    Promise.all(
      sheets.map(function (sheet) {
        return toBlob(sheet.canvas).then(function (blob) {
          return { name: sheet.name, blob: blob, frames: sheet.frames };
        });
      }),
    ).then(function (kept) {
      return Cache.write({ key: key, sheets: kept, data: data });
    });

    return data;
  });
}

/**
 * The hand-drawn pictures of one kind, by what they are called within it -
 * "2222" for "terrain/grass/2222.png".
 */
function source(pixels, kind) {
  var out = {},
    prefix = SOURCES[kind];

  Object.keys(pixels).forEach(function (name) {
    if (name.indexOf(prefix) === 0)
      out[name.slice(prefix.length).replace(/\.png$/, "")] = pixels[name];
  });

  return out;
}

/**
 * The land's tiles, the water's, and the shore of the water, which is laid
 * over a tile of land - by the tile, which puts the two together (see
 * tileParts).
 */
function paintTerrain(pixels) {
  var painted = Terrain.generate(
      {
        grass: source(pixels, "grass"),
        water: source(pixels, "water"),
        shore: source(pixels, "shore"),
      },
      { tilesets: [LAND, WATER, DEEP], diffuse: false },
    ),
    sets = painted.manifest.tilesets,
    images = {},
    data = {
      land: LAND,
      water: WATER,
      deep: DEEP,
      variants: {},
      shores: {},
    };

  [LAND, WATER, DEEP].forEach(function (id) {
    var base = sets[id].base;

    Object.keys(base).forEach(function (slope) {
      base[slope].forEach(function (file, v) {
        images[tileName(id, slope, v)] = painted.images[file];
      });

      data.variants[id] = base[slope].length;
    });
  });

  Object.keys(sets[WATER].shore).forEach(function (slope) {
    images[shoreName(WATER, slope)] = painted.images[sets[WATER].shore[slope]];
    data.shores[slope] = true;
  });

  return { images: images, data: data };
}

function tileName(set, slope, variant) {
  return "gen/terrain/" + set + "/" + slope + "_" + variant;
}

function shoreName(water, slope) {
  return "gen/terrain/" + water + "/shore/" + slope;
}

/**
 * What a tile is drawn with: the sprites laid over one another, bottom
 * first, for SpriteCache#getComposite.
 *
 * @param terrain {Object} what prepare worked out for it
 * @param kind {string} "land", "shore", "water" - the shallows along the
 *        land - or "deep", the water further out
 * @param slope {string|number} the tile's slope code
 * @param x {number} where the tile is, which picks one of the variants
 * @param y {number}
 */
function tileParts(terrain, kind, slope, x, y) {
  var set =
      kind === "water"
        ? terrain.water
        : kind === "deep"
          ? terrain.deep
          : terrain.land,
    n = terrain.variants[set],
    base = tileName(set, slope, n > 1 ? scatter(x, y) % n : 0);

  //the land with the water's shore over it - a flat shore has no water
  //painted on it
  if (kind === "shore" && terrain.shores[slope] === true)
    return [base, shoreName(terrain.water, slope)];

  return [base];
}

/**
 * A number for a spot that looks random but is always the same there - its
 * low bits as mixed as its high ones, so that neighbours do not fall into a
 * pattern.
 */
function scatter(x, y) {
  var h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b);

  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);

  return (h ^ (h >>> 15)) >>> 0;
}

function paintStones(pixels) {
  var painted = Stones.generate(
      source(pixels, "stones"),
      pixels[SOURCES.grass + "2222.png"],
    ),
    out = {};

  Object.keys(painted).forEach(function (name) {
    out["gen/scenery/" + name] = painted[name];
  });

  return out;
}

/**
 * The pictures on one sheet, as sprites.addSheet takes it.
 */
function pack(name, images) {
  var at = layout(
      Object.keys(images).map(function (sprite) {
        return {
          name: sprite,
          width: images[sprite].width,
          height: images[sprite].height,
        };
      }),
    ),
    canvas = SpriteCache.canvas(at.width, at.height),
    ctx = canvas.getContext("2d");

  Object.keys(images).forEach(function (sprite) {
    var image = images[sprite],
      f = at.frames[sprite];

    ctx.putImageData(
      new ImageData(
        new Uint8ClampedArray(image.data),
        image.width,
        image.height,
      ),
      f.x,
      f.y,
    );
  });

  return { name: name, canvas: canvas, frames: at.frames };
}

function toBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: "image/png" });

  return new Promise(function (resolve) {
    canvas.toBlob(resolve, "image/png");
  });
}

export default { prepare: prepare, tileParts: tileParts, VERSION: VERSION };
