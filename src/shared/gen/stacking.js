/**
 * How a block is put together out of its parts, tile by tile - the rules both
 * the generators and the game go by.
 */

/**
 * How high each part laid on a tile goes - the one rule both the generators
 * (shared/gen/compose, putting a whole building together to check the parts
 * against) and the game (client/compoundbuilding, drawing the parts) go by.
 *
 * A part is painted standing where it would on a building one storey high:
 * the ground storey, and the ground of a building site, on the ground; a
 * storey - finished (upper), bare (frame), or of a crane's mast (mast) - as
 * the first one up; a roof, or the top of a crane, on top of one storey; a
 * yard on the ground. Laid on a tile, bottom first:
 *
 *   - ground: the ground storey, one storey;
 *   - site, lot: the ground of a building site, nothing on it yet;
 *   - upper, frame, mast: a storey on whatever is under it;
 *   - roof, cranetop: on top of whatever is under it;
 *   - fence: on the ground, whatever it is laid with;
 *   - anything else stays on the ground.
 *
 * A storey or a roof with nothing under it stays where it was painted, so a
 * part laid alone is the picture it is.
 *
 * @param kinds {string[]} what each part is, bottom first
 * @param storey {number} how high a storey is, in pixels
 * @returns {number[]} how much higher than it was painted each part goes
 */
export function lifts(kinds, storey) {
  //how many storeys stand under the next part: -1 for none laid yet
  var level = -1;

  return kinds.map(function (kind) {
    var lift = 0;

    if (kind === "ground") level = 1;
    else if (kind === "site" || kind === "lot") level = 0;
    else if (kind === "upper" || kind === "frame" || kind === "mast") {
      if (level < 0) level = 1;
      lift = (level++ - 1) * storey;
    } else if ((kind === "roof" || kind === "cranetop") && level >= 0)
      lift = (level - 1) * storey;

    return lift;
  });
}

/**
 * How many rows of yard a block has in front of it (data/flats, offices): as
 * many as it says, or one for a block that only says it has a yard.
 */
export function yardRows(compound) {
  if (compound.yardRows !== undefined) return compound.yardRows;

  return compound.yard ? 1 : 0;
}

/**
 * Where section c of a wall `cells` long stands in it, as its parts are
 * named: alone, at its start or end, or in the middle of it.
 */
export function endsOf(c, cells) {
  if (cells === 1) return "both";
  if (c === 0) return "start";

  return c === cells - 1 ? "end" : "mid";
}

/**
 * What a part is, by its name: "flats/upper/sand/start/01" is an upper.
 */
export function kindOf(part) {
  return part.split("/")[1];
}

//how far along a block has to be for its site to move on to the next stage:
//from the digging to the structure going up, and from that to the storeys
//being finished under the last of the structure
export var STAGES = [0.25, 0.5];

/**
 * Which stage of going up a block is at.
 *
 * @param progress {number} 0..1
 * @returns {number} 0: a building site like any other, nothing of the block
 *          on it yet; 1: the structure going up, half its storeys high; 2:
 *          past halfway, the lower half of it finished, the structure up to
 *          its full height over that
 */
export function stageOf(progress) {
  var stage = 0;

  while (stage < STAGES.length && progress >= STAGES[stage]) stage++;

  return stage;
}

//what a tile of a building site can have on it (shared/gen/sites LOTS): a
//site has one of each at most, in whatever order it was dealt - and where
//there are more tiles than that, materials and heaps of sand
var LOTS = ["dig", "haul", "pile", "cabin", "crane"],
  SPARE = ["materials", "pile"];

//how many storeys high a crane's mast is while there is nothing it has to
//reach over yet, and on the site of a building not put together out of parts
//- a house, a shop
var CRANE_LOW = 2,
  CRANE = 4;

/**
 * Numbers that look random, the same ones for the same seed every time.
 *
 * @param seed {number}
 */
function seeded(seed) {
  var s = Math.imul(seed | 0, 0x9e3779b1) | 0;

  return function () {
    s = (s + 0x6d2b79f5) | 0;

    var t = Math.imul(s ^ (s >>> 15), 1 | s);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * What stands on each of `count` tiles of a site, dealt out for the seed: a
 * digger, a lorry, a heap, the office, the crane, each once at most - the
 * office always, on a site of more than one tile. A small site (see
 * siteTiles) has no crane: there is nothing on it to lift that high.
 */
function deal(count, seed, small) {
  var rnd = seeded(seed),
    pool = LOTS.filter(function (lot) {
      return !small || lot !== "crane";
    }),
    out = [],
    i;

  for (i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(rnd() * (i + 1)),
      t = pool[i];

    pool[i] = pool[j];
    pool[j] = t;
  }

  if (count > 1 && pool.indexOf("cabin") >= count) {
    var at = Math.floor(rnd() * count);

    pool[pool.indexOf("cabin")] = pool[at];
    pool[at] = "cabin";
  }

  for (i = 0; i < count; i++)
    out.push(i < pool.length ? pool[i] : SPARE[Math.floor(rnd() * 2)]);

  return out;
}

/**
 * The parts of a tile with that on it - a crane with its mast so many
 * storeys high, and its top.
 */
function lot(what, masts) {
  if (what !== "crane") return ["sites/lot/" + what];

  return ["sites/lot/crane"].concat(repeat("sites/mast", masts), [
    "sites/cranetop",
  ]);
}

/**
 * The building site of a building that is not put together out of parts -
 * a house, a shop: every tile of its footprint, as it is turned, dealt
 * what stands on it.
 *
 * @param seed {number} the same for the same building every time - where it
 *        stands will do
 * @returns {Object[]} {x, y, parts} for every tile
 */
export function lotTiles(sizeX, sizeY, seed, small) {
  var dealt = deal(sizeX * sizeY, seed, small),
    tiles = [],
    x,
    y;

  for (y = 0; y < sizeY; y++)
    for (x = 0; x < sizeX; x++)
      tiles.push({ x: x, y: y, parts: lot(dealt[tiles.length], CRANE) });

  return fenced(tiles, small);
}

/**
 * The tiles of a site with the fence round it all: along every edge of a
 * tile that is an edge of the site, under what is on the tile at its back
 * and over it at its front (shared/gen/sites fence) - and a gate in the
 * middle of the front. Round a small site, a low timber rail rather than
 * the tarp (shared/gen/sites rail).
 */
function fenced(tiles, small) {
  var sizeX = 0,
    sizeY = 0;

  tiles.forEach(function (tile) {
    sizeX = Math.max(sizeX, tile.x + 1);
    sizeY = Math.max(sizeY, tile.y + 1);
  });

  var gate = Math.floor((sizeX - 1) / 2),
    fence = small ? "rail" : "fence";

  return tiles.map(function (tile) {
    var mask =
      (tile.x === 0 ? "1" : "0") +
      (tile.y === 0 ? (tile.x === gate ? "2" : "1") : "0") +
      (tile.x === sizeX - 1 ? "1" : "0") +
      (tile.y === sizeY - 1 ? "1" : "0");

    if (mask === "0000") return tile;

    return {
      x: tile.x,
      y: tile.y,
      parts: ["sites/" + fence + "/" + mask + "/back"].concat(tile.parts, [
        "sites/" + fence + "/" + mask + "/front",
      ]),
    };
  });
}

/**
 * What a block looks like while it goes up, tile by tile. To begin with it
 * is a building site like any other, its tiles dealt what stands on them;
 * then its structure goes up where the block will stand, and the crane
 * stands on the yard, if there is one, a couple of storeys over whatever
 * of the block is up - and the rest of the yard keeps what it had, less
 * the digger, which is done.
 *
 * @param tiles {Object[]} the finished block's tiles: {x, y, parts}, as
 *        client/compoundbuilding keeps them
 * @param stage {number} see stageOf
 * @param seed {number} the same for the same block every time
 * @param [small] {boolean} a small building's - a cottage, a farm, a park, a
 *        house or a shop of one storey on one tile: no crane, and a low
 *        timber rail round it rather than the tarp
 * @returns {Object[]} the tiles as they are at that stage
 */
export function siteTiles(tiles, stage, seed, small) {
  var gen = tiles[0].parts[0].split("/")[0];

  if (gen === "shops")
    return fenced(shopSite(tiles, stage, seed, small), small);
  if (
    gen === "houses" ||
    gen === "utilities" ||
    gen === "parks" ||
    gen === "oldtown"
  )
    return fenced(houseSite(tiles, stage, seed, small), small);

  var dealt = deal(tiles.length, seed, small),
    yards = [],
    storeys = 0;

  tiles.forEach(function (tile, i) {
    if (kindOf(tile.parts[0]) === "yard") yards.push(i);
    else
      storeys = Math.max(
        storeys,
        tile.parts.filter(function (part) {
          return kindOf(part) !== "roof";
        }).length,
      );
  });

  var half = Math.ceil(storeys / 2),
    crane = yards.length > 0 ? yards[Math.abs(seed) % yards.length] : -1;

  return fenced(
    tiles.map(function (tile, i) {
      var first = tile.parts[0],
        parts;

      if (stage === 0) parts = lot(dealt[i], CRANE_LOW);
      else if (kindOf(first) === "yard") {
        var what =
          dealt[i] === "dig" || dealt[i] === "crane" ? "materials" : dealt[i];

        parts =
          i === crane
            ? lot("crane", (stage === 1 ? half : storeys) + 2)
            : lot(what);
      } else {
        var gen = first.split("/")[0],
          ends = first.split("/")[3],
          built = tile.parts.filter(function (part) {
            return kindOf(part) !== "roof";
          }).length,
          up = Math.ceil(built / 2),
          frame = gen + "/frame/" + ends;

        if (stage === 1)
          parts = [gen + "/site/" + ends + "/build"].concat(repeat(frame, up));
        else parts = tile.parts.slice(0, up).concat(repeat(frame, built - up));
      }

      return { x: tile.x, y: tile.y, parts: parts };
    }),
  );
}

/**
 * What a shop looks like while it goes up: a building site like any other to
 * begin with; then the steel frame of the building where it will stand
 * (shared/gen/shops frame), and a crane on its car park if it has one, a
 * couple of storeys over it - and the rest of the car park keeps what it had,
 * less the digger.
 */
function shopSite(tiles, stage, seed, small) {
  var dealt = deal(tiles.length, seed, small),
    parks = [];

  tiles.forEach(function (tile, i) {
    if (kindOf(tile.parts[0]) === "parking") parks.push(i);
  });

  var crane =
    parks.length > 0 && !small ? parks[Math.abs(seed) % parks.length] : -1;

  return tiles.map(function (tile, i) {
    var p = tile.parts[0].split("/"),
      parts;

    if (stage === 0) parts = lot(dealt[i], CRANE_LOW);
    else if (p[1] === "parking")
      parts =
        i === crane
          ? lot("crane", CRANE_LOW + 1)
          : lot(
              dealt[i] === "dig" || dealt[i] === "crane"
                ? "materials"
                : dealt[i],
            );
    else
      parts = [
        "shops/frame/" + p[1] + "/" + p[p.length - 2] + "/" + p[p.length - 1],
      ];

    return { x: tile.x, y: tile.y, parts: parts };
  });
}

/**
 * What a house looks like while it goes up: a building site like any other to
 * begin with; then its walls going up on their slab, as high as its windows,
 * and then to the eaves (shared/gen/houses site) - a part of them for every
 * tile, by the design of the house and where its buildings stand. A water
 * tower (shared/gen/utilities) goes up the same way: its shaft, then its
 * tank; and a park (shared/gen/parks): its ground graded and its walks laid
 * out, then grassed and paved, and then planted.
 */
function houseSite(tiles, stage, seed, small) {
  var dealt = deal(tiles.length, seed, small);

  return tiles.map(function (tile, i) {
    var p = tile.parts[0].split("/");

    return {
      x: tile.x,
      y: tile.y,
      parts:
        stage === 0
          ? lot(dealt[i], CRANE_LOW)
          : [
              [
                p[0] + "/frame",
                p[1],
                p[2],
                stage,
                p[p.length - 2],
                p[p.length - 1],
              ].join("/"),
            ],
    };
  });
}

function repeat(part, n) {
  var out = [];

  for (var i = 0; i < n; i++) out.push(part);

  return out;
}
