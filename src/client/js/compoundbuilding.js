//Draws a building put together out of parts - a block of flats out of the
//storeys and roofs shared/gen/flats paints (see data/flats) - and decides
//what each one looks like.
//
//The generator only paints parts; nobody else knows what any one block is
//made of. So this does: the first time a block is drawn, its colours and
//details are picked at random among the parts there are - a palette, which
//windows have balconies, a roof, the yards in front - and turned into the
//parts each of its tiles is built of, bottom first: its ground storey, a
//storey stacked on that for every storey more, and the roof. That list is
//its look, kept on the building - and with it in the save - so the block is
//the same block every time it is drawn, and no other one need be the same.
//
//Each tile is drawn as one picture: its parts, each upper storey a storey
//higher than the one under it and the roof on top, put together once on the
//canvas cache's pages (SpriteCache#getComposite) - and shared with every
//other block that has the same parts on a tile.

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
 * The look of a block in the catalogue, or about to be put down: the same
 * every time, for it is no block yet - only the kind of block it will be.
 * Its yards are the ones that look most like a yard, the playground first,
 * rather than a lawn that could be any grass.
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
 * Picks a look: the same palette and balconies all along the block, a roof
 * of its own for every section, and no yard the same as the one next to it.
 *
 * @param random {function(): number} 0..1
 * @param [showcase] {boolean} the yards in the order the generator lists
 *        them, best seen first, rather than any
 */
function pick(sprites, compound, random, showcase) {
  var meta = sprites.generated.flats;

  if (!meta) return null;

  function any(n) {
    return Math.floor(random() * n);
  }

  var palette = meta.palettes[any(meta.palettes.length)],
    balconies = "" + any(meta.balconies) + any(meta.balconies),
    yards = meta.yards.slice(),
    tiles = [],
    cells = compound.cells;

  for (var c = 0; c < cells; c++) {
    var ends = cells === 1 ? "both" : c === 0 ? "start" : "end",
      section = palette + "/" + ends + "/",
      parts = ["flats/ground/" + section + (compound.yard ? "yard" : "street")];

    for (var k = 1; k < compound.storeys; k++)
      parts.push("flats/upper/" + section + balconies);

    parts.push("flats/roof/" + section + any(meta.roofs));

    //the wall stands behind its yard
    tiles.push({ x: c, y: compound.yard ? 1 : 0, parts: parts });

    if (compound.yard) {
      var yard = yards.splice(showcase ? 0 : any(yards.length), 1)[0];

      tiles.push({
        x: c,
        y: 0,
        parts: ["flats/yard/" + yard + "/" + any(meta.yardVariants)],
      });
    }
  }

  return { tiles: tiles };
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
 *            sprite: CachedSprite}[]} x, z the tile in the block
 */
function pieces(sprites, look, compound, turns) {
  var storey = sprites.generated.flats.storey,
    //the footprint, not turned: sections along x, the yard in front
    sizeX = compound.cells,
    sizeY = compound.yard ? 2 : 1;

  return look.tiles.map(function (tile) {
    var level = 0,
      laid = tile.parts.map(function (part) {
        var name = spriteOf(part, turns),
          frame = sprites.frame(name),
          kind = part.split("/")[1],
          lift = 0;

        //the first storey up is painted where it stands, a roof where it
        //would on one storey; the rest stand a storey higher each
        if (kind === "ground") level = 1;
        else if (kind === "upper") lift = Math.max(level++ - 1, 0) * storey;
        else if (kind === "roof") lift = Math.max(level - 1, 0) * storey;

        return {
          name: name,
          left: -frame.pivotX,
          top: -frame.pivotY - lift,
        };
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
      sprite: sprites.getComposite(
        laid.map(function (p) {
          return { name: p.name, x: p.left - minX, y: p.top - minY };
        }),
      ),
    };
  });
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
  pieces: pieces,
  preview: preview,
};
