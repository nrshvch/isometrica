/**
 * Every picture the game paints for itself: describe() says what a generator
 * will paint, with sizes, at build time; createPainter() paints them.
 * See isometrica/.claude/skills/generators/SKILL.md (Pipeline).
 */
import * as Terrain from "./terrain.js";
import * as Vehicles from "./vehicles.js";
import * as Stones from "./stones.js";
import * as Smoke from "./smoke.js";
import * as Flats from "./flats.js";
import * as Offices from "./offices.js";
import * as Sites from "./sites.js";
import * as Shops from "./shops.js";
import * as Houses from "./houses.js";
import * as Utilities from "./utilities.js";
import * as Parks from "./parks.js";
import * as Civic from "./civic.js";
import * as Oldtown from "./oldtown.js";
import * as Roads from "./roads.js";
import * as Trees from "./trees.js";
import * as Foundations from "./foundations.js";
import { tileName, shoreName, diffuseName } from "./names.js";
import * as iso from "./isobox.js";
import Climate from "../../core/climate.js";

//the kinds of ground the terrain is drawn with: the land, the water its
//shore runs into, and the water further out, too deep to see the bottom of
var LAND = "grass",
  WATER = "water_shallow",
  DEEP = "water_deep";

//and the land cleared down to the earth (client/clearworks) - spilling over
//the edges and corners of the land round it - and growing back over
//(client/terrain), the grass round it spilling over its edges and corners;
//on every slope, and how many of each there are
var EARTH = "earth",
  REGROWING = "earth_regrowing",
  EDGE_VARIANTS = 2;

//the edges and corners deep water spills over the shallows from, and how
//many of each there are (shared/gen/terrain DIRECTIONS, diffuseVariants)
var SPILLS = ["ne", "se", "sw", "nw", "n", "e", "s", "w"],
  SPILL_VARIANTS = 2;

//the ground of every zone of the climate (core/climate ZONES) - the desert's
//sand, the green's grass, the snow - lowest first, as shared/gen/terrain
//PRECEDENCE has them: where two meet, the later one spills over the edges of
//the earlier one; and what their water freezes to, where it does - the ice,
//which closes over open water the same way
var GROUNDS = [],
  FROZEN = [];

Climate.ZONES.forEach(function (zone) {
  if (GROUNDS.indexOf(zone.ground) === -1) GROUNDS.push(zone.ground);
  if (zone.water !== null && FROZEN.indexOf(zone.water) === -1)
    FROZEN.push(zone.water);
});
GROUNDS.sort(function (a, b) {
  return Terrain.PRECEDENCE.indexOf(a) - Terrain.PRECEDENCE.indexOf(b);
});

//every tileset the ground is drawn with
var TILESETS = [LAND, WATER, DEEP, EARTH, REGROWING]
  .concat(GROUNDS, FROZEN)
  .filter(function (id, i, all) {
    return all.indexOf(id) === i;
  });

export var GENERATORS = [
  "terrain",
  "vehicles",
  "stones",
  "smoke",
  "flats",
  "offices",
  "sites",
  "shops",
  "houses",
  "utilities",
  "parks",
  "civic",
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
  civic: Civic,
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
 * own - see createPainter. The stones and the smoke are painted lit, as they
 * are.
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
//start with - none: everything is painted from nothing
export var INPUTS = {
  terrain: [],
  stones: [],
  smoke: [],
  vehicles: [],
  flats: [],
  offices: [],
  sites: [],
  shops: [],
  houses: [],
  utilities: [],
  parks: [],
  civic: [],
  oldtown: [],
  roads: [],
  trees: [],
  foundations: [],
};

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
 *          pivotX/pivotY too, where the middle of its tile is in it; top,
 *          how big each of its pictures seen from straight above is - every
 *          one alike - and where in it the point it is drawn from is: {w, h,
 *          pivotX, pivotY}, or null where nothing of it is seen from above
 * @param [o] {Object} all: everything the generator can paint, for the lab
 *        to look at - what the game has, and what it does not: every kind of
 *        ground the terrain painter has, with all its edges and shores, and
 *        the trees nothing grows (shared/gen/trees lab) - each of those with
 *        lab: true. The game is told of what it has only
 */
export function describe(gen, pixels, o) {
  var out = describeSide(gen, pixels, o);

  out.top = TOP[gen] !== undefined ? TOP[gen]() : TILE_TOP;

  //what the game is not told of
  if (o && o.all) {
    var game = describeSide(gen, pixels).sprites;

    Object.keys(out.sprites).forEach(function (name) {
      if (game[name] === undefined) out.sprites[name].lab = true;
    });
  }

  return out;
}

//a part of something standing on a tile, the ground, a road, seen from
//straight above: the tile's square, drawn from the tile's middle
var TILE_TOP = { w: 64, h: 64, pivotX: 32, pivotY: 32 };

//those seen from above some other way - or not at all: the stones and the
//smoke are drawn as they are seen from the side
var TOP = {
  trees: function () {
    return Trees.TOP_FRAME;
  },
  vehicles: function () {
    return Vehicles.topFrame();
  },
  stones: function () {
    return null;
  },
  smoke: function () {
    return null;
  },
};

function describeSide(gen, pixels, o) {
  var all = !!(o && o.all),
    sprites = {},
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
        tilesets: TILESETS,
        diffuse: false,
      }),
      sets = terrain.manifest.tilesets;

    data = {
      land: LAND,
      water: WATER,
      deep: DEEP,
      earth: EARTH,
      regrowing: REGROWING,
      //the ground of the climate's zones, lowest first - each spills over
      //the edges and corners of those before it, on any slope - and what
      //water freezes to, which spills over open water's, on the flat
      grounds: GROUNDS,
      frozen: FROZEN,
      variants: {},
      //the slopes every water has a shore on, by water: the shallows', and
      //the ice's
      shores: {},
      //deep water spilling over the shallows next to it, on the flat
      spills: { dirs: SPILLS, variants: SPILL_VARIANTS },
      //the water's ripples: how many frames there are, and how long each is
      //shown, in ms - frame f of a tile is its name with @t<f> after it
      waves: { frames: Terrain.WAVE_FRAMES, ms: Terrain.WAVE_MS },
      //the earth spilling over the land round it, and the grass over the
      //earth growing back over
      edges: { variants: EDGE_VARIANTS },
    };

    TILESETS.forEach(function (id) {
      Object.keys(sets[id].base).forEach(function (slope) {
        sets[id].base[slope].forEach(function (rel, v) {
          add(tileName(id, slope, v), terrain.sizes[rel], rel);
        });

        data.variants[id] = sets[id].base[slope].length;
      });
    });

    //the shallows meet the land, and so does the ice where the water is
    //frozen over
    [WATER].concat(FROZEN).forEach(function (id) {
      data.shores[id] = {};

      Object.keys(sets[id].shore).forEach(function (slope) {
        var rel = sets[id].shore[slope];

        add(shoreName(id, slope), terrain.sizes[rel], rel);
        data.shores[id][slope] = true;
      });
    });

    //deep water spilling over the edge of the shallows next to it, dithered
    //as it thins out: the contour between the two - and the ice over the
    //edge of open water next to it
    [DEEP].concat(FROZEN).forEach(function (id) {
      SPILLS.forEach(function (dir) {
        for (var v = 0; v < SPILL_VARIANTS; v++)
          add(
            diffuseName(id, Terrain.FLAT, dir, v),
            { w: Terrain.WIDTH, h: Terrain.HEIGHT },
            id + "/diffuse/" + Terrain.FLAT + "_" + dir + "_" + v + ".png",
          );
      });
    });

    //the earth spilling over the land next to it, the grass over the earth
    //growing back over, and the ground of each zone over that of the one
    //next to it, on any slope
    [EARTH]
      .concat(GROUNDS)
      .filter(function (id, i, all) {
        return all.indexOf(id) === i;
      })
      .forEach(function (id) {
        Object.keys(sets[id].base).forEach(function (slope) {
          SPILLS.forEach(function (dir) {
            for (var v = 0; v < EDGE_VARIANTS; v++)
              add(
                diffuseName(id, slope, dir, v),
                { w: Terrain.WIDTH, h: Terrain.HEIGHT },
                id + "/diffuse/" + slope + "_" + dir + "_" + v + ".png",
              );
          });
        });
      });

    //and for the lab, every kind of ground the painter has - the rock of
    //the mountains, the grass of the tropics and of the north, the
    //savannah, all of them - with every edge and corner of it spilling over
    //another, and every water's shore, whether the game draws it or not
    if (all) {
      var every = Terrain.describe(null, {}),
        sizes = every.sizes;

      Object.keys(every.manifest.tilesets).forEach(function (id) {
        var set = every.manifest.tilesets[id];

        Object.keys(set.base).forEach(function (slope) {
          set.base[slope].forEach(function (rel, v) {
            add(tileName(id, slope, v), sizes[rel], rel);
          });
        });
        Object.keys(set.diffuse).forEach(function (slope) {
          Object.keys(set.diffuse[slope]).forEach(function (dir) {
            set.diffuse[slope][dir].forEach(function (rel, v) {
              add(diffuseName(id, slope, dir, v), sizes[rel], rel);
            });
          });
        });
        Object.keys(set.shore || {}).forEach(function (slope) {
          var rel = set.shore[slope];

          add(shoreName(id, slope), sizes[rel], rel);
        });
      });
    }
  } else if (gen === "vehicles") {
    var vehicles = Vehicles.describe();

    Object.keys(vehicles.sizes).forEach(function (name) {
      add(name, vehicles.sizes[name], name);
    });
    data = vehicles.types;
  } else if (gen === "stones") {
    var stones = Stones.describe();

    Object.keys(stones).forEach(function (name) {
      add("gen/scenery/" + name, stones[name], name);
    });
  } else if (gen === "smoke") {
    var smoke = Smoke.describe();

    Object.keys(smoke).forEach(function (name) {
      add("gen/smoke/" + name, smoke[name], name);
    });
    data = { frames: Smoke.FRAMES };
  } else if (BLOCKS[gen] !== undefined) {
    var block = BLOCKS[gen].describe(o);

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
        function () {
          if (gen === "terrain") return Terrain.createPainter(null);
          if (gen === "stones") return { paint: Stones.paint };
          if (gen === "smoke") return { paint: Smoke.paint };
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
     * @param spec {{gen: string, key: string, look: string, view: string}}
     *        the generator, and what it calls the picture - the key describe
     *        gives, and for a part of a building open on a side of its tile
     *        "@o" and its sides after it (isobox setOpen, client/spritecache
     *        openName) - and for one of the FACED, how it is to be painted, if
     *        not lit: as isobox setMode has it, "deferred" or "night"; and
     *        "top" for it seen from straight above (describe top), as the
     *        game sees it otherwise
     * @returns {Promise<{width, height, data}>}
     */
    paint: function (spec) {
      return painter(spec.gen).then(function (p) {
        var look = spec.look && FACED[spec.gen] === true ? spec.look : null;

        if (OWN_LOOKS[spec.gen] || spec.gen === "terrain")
          return p.paint(spec.key, look || undefined, spec.view);

        //a part of a building open on a side of its tile, its rooms
        //showing - "@o" and which sides after its key (isobox setOpen) -
        //or run down, "@w" and how (isobox setWorn)
        var variant = /@([owsbck])(\d+)$/.exec(spec.key),
          key = variant ? spec.key.slice(0, variant.index) : spec.key;

        iso.setView(spec.view);
        if (look !== null) iso.setMode(look);
        if (variant && variant[1] === "o") iso.setOpen(+variant[2]);
        if (variant && variant[1] === "w") iso.setWorn(+variant[2]);
        //or a ruin of itself: "@k" gutted, its roof on, "@s" burnt out,
        //"@b" burnt and fallen in, "@c" fallen in - and how many storeys
        //came down onto it
        if (variant && "sbck".indexOf(variant[1]) >= 0)
          iso.setRuin(variant[1], +variant[2]);
        try {
          return p.paint(key);
        } finally {
          iso.setMode("lit");
          iso.setView("iso");
          iso.setOpen(0);
          iso.setWorn(0);
          iso.setRuin(null);
        }
      });
    },
  };
}
