/**
 * How a block is put together out of its parts, tile by tile - the rules both
 * the generators and the game go by.
 */

/**
 * How high each part laid on a tile of a block goes - the one rule both the
 * generators (shared/gen/blocks, putting a whole block together to check
 * the parts against) and the game (client/compoundbuilding, drawing the
 * parts) go by.
 *
 * A part is painted standing where it would on a block one storey high: the
 * ground storey and a building site on the ground, a storey - finished
 * (upper) or bare (frame) - as the first one up, a roof on top of one
 * storey, a yard on the ground. Laid on a tile, bottom first:
 *
 *   - ground: the ground storey, one storey;
 *   - site: the ground of a building site, nothing on it yet;
 *   - upper, frame: a storey on whatever is under it;
 *   - roof: on top of whatever is under it;
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
    else if (kind === "site") level = 0;
    else if (kind === "upper" || kind === "frame") {
      if (level < 0) level = 1;
      lift = (level++ - 1) * storey;
    } else if (kind === "roof" && level >= 0) lift = (level - 1) * storey;

    return lift;
  });
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
 * @returns {number} 0: dug, the plinth poured, a digger or a lorry at it;
 *          1: the structure going up, half its storeys high; 2: past
 *          halfway, the lower half of it finished, the structure up to its
 *          full height over that
 */
export function stageOf(progress) {
  var stage = 0;

  while (stage < STAGES.length && progress >= STAGES[stage]) stage++;

  return stage;
}

/**
 * What a block looks like while it goes up, tile by tile: the same shape as
 * the finished one, out of the parts of a building site.
 *
 * @param tiles {Object[]} the finished block's tiles: {x, y, parts}, as
 *        client/compoundbuilding keeps them
 * @param stage {number} see stageOf
 * @returns {Object[]} the tiles as they are at that stage
 */
export function siteTiles(tiles, stage) {
  var cranes = 0;

  return tiles.map(function (tile) {
    var first = tile.parts[0],
      gen = first.split("/")[0],
      parts;

    if (kindOf(first) === "yard") {
      //trucks while it is dug; then a crane, and the materials by it
      parts = [
        gen +
          "/siteyard/" +
          (stage === 0 ? "trucks" : cranes++ === 0 ? "crane" : "materials"),
      ];
    } else {
      var ends = first.split("/")[3],
        storeys = tile.parts.filter(function (part) {
          return kindOf(part) !== "roof";
        }).length,
        half = Math.ceil(storeys / 2),
        frame = gen + "/frame/" + ends;

      //a digger at work on every other section, a lorry carting the earth
      //away from the ones between
      if (stage === 0)
        parts = [gen + "/site/" + ends + (tile.x % 2 ? "/haul" : "/dig")];
      else if (stage === 1)
        parts = [gen + "/site/" + ends + "/build"].concat(repeat(frame, half));
      else
        parts = tile.parts.slice(0, half).concat(repeat(frame, storeys - half));
    }

    return { x: tile.x, y: tile.y, parts: parts };
  });
}

function repeat(part, n) {
  var out = [];

  for (var i = 0; i < n; i++) out.push(part);

  return out;
}
