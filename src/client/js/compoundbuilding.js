//Draws a building put together out of parts - a block of flats or offices
//out of the storeys and roofs shared/gen/flats and shared/gen/offices paint
//(see data/flats, data/offices) - and decides what each one looks like.
//
//The generators only paint parts; nobody else knows what any one block is
//made of. So this does: the first time a block is drawn, its colours and
//details are picked at random among the parts there are - a palette, what
//its storeys are like, a roof, the yards in front - and turned into the
//parts each of its tiles is built of, bottom first: its ground storey, a
//storey stacked on that for every storey more, and the roof. That list is
//its look, kept on the building - and with it in the save - so the block is
//the same block every time it is drawn, and no other one need be the same.
//
//While it goes up it is drawn as the building site it is at the time - the
//diggers, then the structure, then the storeys finished under the last of it
//(shared/gen/stacking siteTiles) - the same shape as the finished block, out
//of its look: nothing more is kept for it.
//
//Each tile is drawn as one picture: its parts, each laid on the one under it
//(shared/gen/stacking lifts), put together once on the canvas cache's pages
//(SpriteCache#getComposite) - and shared with every other block that has the
//same parts on a tile.
import { lifts, kindOf, siteTiles, lotTiles } from "shared/gen/stacking";

/**
 * What a block of the kind looks like - its look, kept as it is, or picked
 * now and kept on the building when it has none, or none that can be drawn.
 *
 * @param sprites {SpriteCache}
 * @param building {Object} the core building, which keeps it
 * @param compound {Object} the building data's compound, see data/flats
 * @returns {{tiles: Object[]}|null} null while there are no parts to pick
 */
function lookOf(sprites, building, compound) {
  if (building.look && drawable(sprites, building.look)) return building.look;

  var look = pick(sprites, compound, Math.random);

  if (look !== null) building.look = look;

  return look;
}

/**
 * A look for a block about to be put down - one of its own, at random, the
 * one it will keep once it goes up (Buildman hands it to the build).
 *
 * @returns {{tiles: Object[]}|null} null while there are no parts to pick
 */
function pickLook(sprites, compound) {
  return pick(sprites, compound, Math.random);
}

/**
 * The look of a block in the catalogue: the same every time, for it is no
 * block - only the kind of block it is.
 * Its yards are taken in order - the kind's own, or the ones that look most
 * like a yard, the playground first, rather than a lawn that could be any
 * grass.
 */
function sampleLook(sprites, compound) {
  return pick(
    sprites,
    compound,
    seeded(compound.layout + compound.storeys),
    true,
  );
}

/**
 * Numbers that look random, the same ones for the same seed every time.
 */
function seeded(seed) {
  var s = 0;

  for (var i = 0; i < seed.length; i++)
    s = Math.imul(s ^ seed.charCodeAt(i), 0x9e3779b1);

  return function () {
    s = (s + 0x6d2b79f5) | 0;

    var t = Math.imul(s ^ (s >>> 15), 1 | s);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Picks a look: the same palette and storeys all along the block - for
 * flats, which windows have balconies; for offices, how the glass is hung -
 * a roof of its own for every section, and no yard the same as the one next
 * to it while there are others to pick.
 *
 * @param random {function(): number} 0..1
 * @param [showcase] {boolean} the yards in order, best seen first, rather
 *        than any
 */
function pick(sprites, compound, random, showcase) {
  var gen = compound.gen,
    meta = sprites.generated[gen];

  if (!meta) return null;

  function any(n) {
    return Math.floor(random() * n);
  }

  //the kind's own yards, or any the generator paints
  var choices = compound.yards || meta.yards,
    palette = meta.palettes[any(meta.palettes.length)],
    detail = meta.details[any(meta.details.length)],
    yards = [],
    tiles = [],
    cells = compound.cells;

  for (var c = 0; c < cells; c++) {
    var ends = cells === 1 ? "both" : c === 0 ? "start" : "end",
      section = palette + "/" + ends + "/",
      parts = [
        gen + "/ground/" + section + (compound.yard ? "yard" : "street"),
      ];

    for (var k = 1; k < compound.storeys; k++)
      parts.push(gen + "/upper/" + section + detail);

    parts.push(gen + "/roof/" + section + any(meta.roofs));

    //the wall stands behind its yard
    tiles.push({ x: c, y: compound.yard ? 1 : 0, parts: parts });

    if (compound.yard) {
      if (yards.length === 0) yards = choices.slice();

      var yard = yards.splice(showcase ? 0 : any(yards.length), 1)[0];

      tiles.push({
        x: c,
        y: 0,
        parts: [gen + "/yard/" + yard + "/" + any(meta.yardVariants)],
      });
    }
  }

  return { tiles: tiles };
}

/**
 * The look of a block going up: what is on each of its tiles at this stage
 * of it - see shared/gen/stacking.
 *
 * @param look {{tiles: Object[]}} the finished block's
 * @param stage {number} shared/gen/stacking stageOf
 * @param seed {number} the same for the same block every time - where it
 *        stands
 */
function siteLook(look, stage, seed) {
  return { tiles: siteTiles(look.tiles, stage, seed) };
}

/**
 * What every tile of the building site of a building drawn by hand is drawn
 * with - a house, a shop - its footprint sizeX by sizeY as it is turned:
 * the same parts the blocks go up on to begin with (shared/gen/sites), and
 * the same pieces as pieces gives.
 *
 * @param seed {number} the same for the same building every time
 * @returns {Object[]|null} null while the sites are not described yet
 */
function lotPieces(sprites, sizeX, sizeY, seed) {
  if (!sprites.generated.sites) return null;

  return tilePieces(sprites, lotTiles(sizeX, sizeY, seed), sizeX, sizeY, 0);
}

/**
 * Whether every part of a look is one there is - a look kept in a save from
 * before the parts were painted otherwise is picked again.
 */
function drawable(sprites, look) {
  return (
    Array.isArray(look.tiles) &&
    look.tiles.every(function (tile) {
      return tile.parts.every(function (part) {
        return sprites.has(spriteOf(part, 0));
      });
    })
  );
}

function spriteOf(part, turns) {
  return "gen/" + part + "/r" + turns;
}

/**
 * What every tile of a block is drawn with, where it stands in the block -
 * each tile's parts painted from the side the block is turned to, and the
 * tiles moved round with it the way shared/gen/isobox turns a building.
 *
 * @param look {{tiles: Object[]}}
 * @param compound {Object}
 * @param turns {number} quarter turns, 0..3
 * @returns {{x: number, z: number, pivotX: number, pivotY: number,
 *            sprite: CachedSprite, overlays: Object[]}[]} x, z the tile in
 *          the block; overlays, what is drawn over it (overlaysOf)
 */
function pieces(sprites, look, compound, turns) {
  //the footprint, not turned: sections along x, the yard in front
  return tilePieces(
    sprites,
    look.tiles,
    compound.cells,
    compound.yard ? 2 : 1,
    turns,
  );
}

/**
 * What every tile of something put together out of parts is drawn with: its
 * tiles, {x, y, parts}, on a footprint sizeX by sizeY, turned - its parts
 * of whichever generator.
 */
function tilePieces(sprites, tiles, sizeX, sizeY, turns) {
  return tiles.map(function (tile) {
    var storey = sprites.generated[tile.parts[0].split("/")[0]].storey;
    var up = lifts(tile.parts.map(kindOf), storey),
      laid = tile.parts
        .map(function (part, i) {
          var name = spriteOf(part, turns),
            frame = sprites.frame(name);

          return {
            name: name,
            empty: frame.w === 0,
            left: -frame.pivotX,
            top: -frame.pivotY - up[i],
          };
        })
        //a stretch of a site's fence with nothing of it on this side
        .filter(function (p) {
          return !p.empty;
        }),
      minX = Infinity,
      minY = Infinity;

    laid.forEach(function (p) {
      minX = Math.min(minX, p.left);
      minY = Math.min(minY, p.top);
    });

    var at = turn(tile.x, tile.y, sizeX, sizeY, turns);

    return {
      x: at[0],
      z: at[1],
      pivotX: -minX,
      pivotY: -minY,
      overlays: overlaysOf(sprites, tile.parts, up, turns),
      sprite: sprites.getComposite(
        laid.map(function (p) {
          return { name: p.name, x: p.left - minX, y: p.top - minY };
        }),
      ),
    };
  });
}

/**
 * What is drawn over a tile with these parts (shared/gen/sites overlays),
 * ready for client/siterenderer: a machine with the vehicle generator's
 * pictures of it - the way it faces, and the way it turns to, for one that
 * moves - the jib with its frames; each with its pivot taken from where the
 * tile's middle is.
 *
 * @param up {number[]} how far each part is laid higher than it was painted
 */
function overlaysOf(sprites, parts, up, turns) {
  var vehicles = sprites.generated.vehicles,
    out = [];

  parts.forEach(function (part, i) {
    var meta = sprites.generated[part.split("/")[0]],
      listed = meta && meta.overlays && meta.overlays[part + "/r" + turns];

    if (!listed) return;

    listed.forEach(function (o) {
      if (o.frames !== undefined) {
        out.push({
          frames: o.frames.map(function (name) {
            var f = sprites.frame(name);

            return {
              sprite: sprites.getSprite(name),
              pivotX: f.pivotX,
              pivotY: f.pivotY + up[i],
            };
          }),
        });
        return;
      }

      var colors =
          vehicles && vehicles[o.vehicle] && vehicles[o.vehicle].colors,
        looks = colors && colors[o.color];

      if (!looks || !looks[o.heading]) return;

      function at(heading) {
        var look = looks[heading];

        return {
          sprite: sprites.getSprite(look.sprite),
          pivotX: look.pivotX - o.x,
          pivotY: look.pivotY - o.y + up[i],
        };
      }

      out.push({
        vehicle: o.vehicle,
        looks:
          o.turn !== undefined && looks[o.turn]
            ? [at(o.heading), at(o.turn)]
            : [at(o.heading)],
        move: o.move || null,
      });
    });
  });

  return out;
}

/**
 * Where the tile at x, y of a footprint sizeX by sizeY is, turned - a
 * quarter turn takes what faced -y to face -x.
 */
function turn(x, y, sizeX, sizeY, turns) {
  switch (turns) {
    case 1:
      return [y, sizeX - 1 - x];
    case 2:
      return [sizeX - 1 - x, sizeY - 1 - y];
    case 3:
      return [sizeY - 1 - y, x];
    default:
      return [x, y];
  }
}

//the catalogue's pictures, by kind of building, once drawn
var previews = {};

/**
 * A picture of the kind of building, for the catalogue: its look as
 * sampleLook has it, every tile put together the way the game draws it, at
 * the size it is drawn in - as an object URL.
 *
 * @returns {Promise<string>}
 */
function preview(sprites, compound) {
  var key = compound.layout + compound.storeys;

  if (previews[key] === undefined)
    previews[key] = drawPreview(sprites, compound, 2).catch(function (e) {
      delete previews[key];
      throw e;
    });

  return previews[key];
}

function drawPreview(sprites, compound, tries) {
  var look = sampleLook(sprites, compound);

  if (look === null) return Promise.reject(new Error("no parts to draw"));

  var list = pieces(sprites, look, compound, 0),
    loads = [];

  list.forEach(function (piece) {
    piece.sprite.parts.forEach(function (part) {
      loads.push(sprites.loadSheet(part.sheet));
    });
  });

  return Promise.all(loads).then(function () {
    var minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity,
      missing = false;

    //where each tile's picture goes: its middle where the tile's is
    list.forEach(function (piece) {
      piece.left = (piece.x - piece.z) * 32 - piece.pivotX;
      piece.top = -(piece.x + piece.z) * 16 - piece.pivotY;
      minX = Math.min(minX, piece.left);
      minY = Math.min(minY, piece.top);
      maxX = Math.max(maxX, piece.left + piece.sprite.width);
      maxY = Math.max(maxY, piece.top + piece.sprite.height);

      piece.sprite.parts.forEach(function (part) {
        if (part.sheet.image === null) missing = true;
      });
    });

    //let go of while the rest came in: asked for again
    if (missing) {
      if (tries > 0) return drawPreview(sprites, compound, tries - 1);
      throw new Error("parts not kept long enough to draw");
    }

    var canvas = document.createElement("canvas"),
      ctx;

    canvas.width = maxX - minX;
    canvas.height = maxY - minY;
    ctx = canvas.getContext("2d");

    //the tiles at the back first, the way the game sorts them
    list
      .slice()
      .sort(function (a, b) {
        return b.x + b.z - (a.x + a.z);
      })
      .forEach(function (piece) {
        piece.sprite.parts.forEach(function (part) {
          var f = part.frame;

          ctx.drawImage(
            part.sheet.image,
            f.x,
            f.y,
            f.w,
            f.h,
            piece.left - minX + part.x,
            piece.top - minY + part.y,
            f.w,
            f.h,
          );
        });
      });

    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob === null) reject(new Error("no picture"));
        else resolve(URL.createObjectURL(blob));
      });
    });
  });
}

export default {
  lookOf: lookOf,
  sampleLook: sampleLook,
  pickLook: pickLook,
  siteLook: siteLook,
  lotPieces: lotPieces,
  pieces: pieces,
  preview: preview,
};
