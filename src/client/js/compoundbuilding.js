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
import {
  lifts,
  kindOf,
  siteTiles,
  lotTiles,
  yardRows,
  endsOf,
} from "shared/gen/stacking";
import BuildingClassCode from "data/classcode";
import Core from "core/main";

var Terrain = Core.Terrain;

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
  return pick(sprites, compound, seeded(kindKey(compound)), true);
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

  if (compound.footprint !== undefined)
    return pickDesign(meta.footprints[compound.footprint], random);

  function any(n) {
    return Math.floor(random() * n);
  }

  //the kind's own yards, or any the generator paints
  var choices = compound.yards || meta.yards,
    palette = meta.palettes[any(meta.palettes.length)],
    detail = meta.details[any(meta.details.length)],
    rows = yardRows(compound),
    yards = [],
    tiles = [],
    cells = compound.cells;

  for (var c = 0; c < cells; c++) {
    var section = palette + "/" + endsOf(c, cells) + "/",
      parts = [gen + "/ground/" + section + (rows > 0 ? "yard" : "street")];

    for (var k = 1; k < compound.storeys; k++)
      parts.push(gen + "/upper/" + section + detail);

    parts.push(gen + "/roof/" + section + any(meta.roofs));

    //the wall stands behind its yards
    tiles.push({ x: c, y: rows, parts: parts });

    for (var y = rows - 1; y >= 0; y--) {
      if (yards.length === 0) yards = choices.slice();

      var yard = yards.splice(showcase ? 0 : any(yards.length), 1)[0];

      tiles.push({
        x: c,
        y: y,
        parts: [gen + "/yard/" + yard + "/" + any(meta.yardVariants)],
      });
    }
  }

  return { tiles: tiles };
}

/**
 * What names a kind of building put together out of parts, for its picture
 * in the catalogue.
 */
function kindKey(compound) {
  return compound.footprint !== undefined
    ? compound.gen + compound.footprint
    : compound.layout + compound.storeys;
}

/**
 * Picks a look for a shop (shared/gen/shops describe footprints): one of the
 * designs there are for its footprint, as likely as its weight, and every
 * option of it at random - and the parts of its tiles with them filled in.
 */
function pickDesign(designs, random) {
  if (!designs || designs.length === 0) return null;

  var total = 0,
    roll,
    d,
    i;

  designs.forEach(function (x) {
    total += x.weight;
  });

  roll = random() * total;
  for (i = 0; i < designs.length - 1 && roll >= designs[i].weight; i++)
    roll -= designs[i].weight;
  d = designs[i];

  var options = {};

  Object.keys(d.axes).forEach(function (axis) {
    options[axis] = d.axes[axis][Math.floor(random() * d.axes[axis].length)];
  });

  //twice over, for an option that names another: "bigbox-{style}"
  function fill(template) {
    for (var pass = 0; pass < 2; pass++)
      template = template.replace(/\{(\w+)\}/g, function (m, axis) {
        return options[axis];
      });

    return template;
  }

  return {
    tiles: d.tiles.map(function (t) {
      return { x: t.x, y: t.y, parts: t.parts.map(fill) };
    }),
  };
}

/**
 * The look of a block going up: what is on each of its tiles at this stage
 * of it - see shared/gen/stacking.
 *
 * @param look {{tiles: Object[]}} the finished block's
 * @param stage {number} shared/gen/stacking stageOf
 * @param seed {number} the same for the same block every time - where it
 *        stands
 * @param [small] {boolean} a small building's site (smallSite)
 */
function siteLook(look, stage, seed, small) {
  return { tiles: siteTiles(look.tiles, stage, seed, small) };
}

/**
 * Whether what goes up goes up on a small site - no crane, and a timber rail
 * round it rather than the tarp (shared/gen/stacking siteTiles): a park, a
 * cottage or a farm of the village, the old town, and any house or shop on
 * one tile, which is a storey high.
 *
 * @param staticData {Object} what it is, data/buildings
 */
function smallSite(staticData) {
  var compound = staticData.compound,
    gen = compound ? compound.gen : null,
    one = staticData.sizeX * staticData.sizeY === 1;

  if (gen === "parks" || gen === "oldtown") return true;
  if (gen === "houses" && /^village-/.test(compound.footprint)) return true;

  return (
    one &&
    (gen === "houses" ||
      gen === "shops" ||
      (!compound &&
        (staticData.classCode === BuildingClassCode.house ||
          staticData.classCode === BuildingClassCode.commerce)))
  );
}

/**
 * What every tile of the building site of a building drawn by hand is drawn
 * with - a house, a shop - its footprint sizeX by sizeY as it is turned:
 * the same parts the blocks go up on to begin with (shared/gen/sites), and
 * the same pieces as pieces gives.
 *
 * @param seed {number} the same for the same building every time
 * @param [small] {boolean} a small building's site (smallSite)
 * @returns {Object[]|null} null while the sites are not described yet
 */
function lotPieces(sprites, sizeX, sizeY, seed, small) {
  if (!sprites.generated.sites) return null;

  return tilePieces(
    sprites,
    lotTiles(sizeX, sizeY, seed, small),
    sizeX,
    sizeY,
    0,
    seed,
  );
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
 * @param [seed] {number} the same for the same building every time - where it
 *        stands: which cars are parked in its car park
 * @returns {{x: number, z: number, pivotX: number, pivotY: number,
 *            sprite: CachedSprite, overlays: Object[]}[]} x, z the tile in
 *          the block; overlays, what is drawn over it (overlaysOf)
 */
function pieces(sprites, look, compound, turns, seed) {
  var size = footprint(compound);

  return tilePieces(sprites, look.tiles, size[0], size[1], turns, seed);
}

/**
 * How many tiles across and deep a kind of building is, not turned: as it
 * says, or for a block, its sections along x and its yard in front.
 */
function footprint(compound) {
  if (compound.sizeX !== undefined) return [compound.sizeX, compound.sizeY];

  return [compound.cells, 1 + yardRows(compound)];
}

/**
 * What every tile of something put together out of parts is drawn with: its
 * tiles, {x, y, parts}, on a footprint sizeX by sizeY, turned - its parts
 * of whichever generator.
 */
function tilePieces(sprites, tiles, sizeX, sizeY, turns, seed) {
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
      overlays: overlaysOf(
        sprites,
        tile.parts,
        up,
        turns,
        ((seed | 0) * 31 + tile.x * 7 + tile.y) | 0,
      ),
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
 * moves - the jib with its frames; and in the bays of a car park whatever
 * cars the seed has parked there, the vehicle generator's own - and over
 * them, for a drive by a house, a frame of its own: what of the house stands
 * in front of them (shared/gen/houses cover). Each with its pivot taken from
 * where the tile's middle is.
 *
 * @param up {number[]} how far each part is laid higher than it was painted
 * @param seed {number} the same for the same tile of the same building
 */
function overlaysOf(sprites, parts, up, turns, seed) {
  var vehicles = sprites.generated.vehicles,
    random = seeded("bays" + seed),
    out = [],
    //the jib swings high over everything else on the tile
    high = [];

  parts.forEach(function (part, i) {
    var meta = sprites.generated[part.split("/")[0]],
      listed = meta && meta.overlays && meta.overlays[part + "/r" + turns];

    if (!listed) return;

    listed.forEach(function (o) {
      if (o.bays !== undefined) {
        //those at the back first, the ones in front drawn over them
        o.bays
          .slice()
          .sort(function (a, b) {
            return a.y - b.y;
          })
          .forEach(function (bay) {
            var car = parkedCar(vehicles, random);

            if (car === null) return;

            var look =
              car.looks[
                bay.headings[Math.floor(random() * bay.headings.length)]
              ];

            out.push({
              vehicle: car.type,
              looks: [
                {
                  sprite: sprites.getSprite(look.sprite),
                  pivotX: look.pivotX - bay.x,
                  pivotY: look.pivotY - bay.y + up[i],
                },
              ],
              move: null,
            });
          });
        return;
      }

      if (o.frames !== undefined) {
        //what of the tile stands in front of what is drawn over it, drawn
        //again over that - only for something under it
        if (o.cover && out.length === 0) return;

        (o.cover ? out : high).push({
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

  return out.concat(high);
}

//the cars that park at home and at the shops - no lorries or buses
var PARKED = ["sedan", "hatchback", "pickup", "van"];

/**
 * What is parked in a bay, if anything: a quarter of them empty, the rest a
 * car of the vehicle generator's, each type as often as it turns up on the
 * roads, in any of its colours.
 *
 * @returns {{type: string, looks: Object}|null} looks, the pictures of it
 *          by the way it faces
 */
function parkedCar(vehicles, random) {
  if (!vehicles || random() < 0.25) return null;

  var types = PARKED.filter(function (t) {
      return vehicles[t] !== undefined;
    }),
    total = 0,
    roll,
    i;

  types.forEach(function (t) {
    total += vehicles[t].weight;
  });

  if (types.length === 0) return null;

  roll = random() * total;
  for (i = 0; i < types.length - 1 && roll >= vehicles[types[i]].weight; i++)
    roll -= vehicles[types[i]].weight;

  var colors = Object.keys(vehicles[types[i]].colors);

  return {
    type: types[i],
    looks:
      vehicles[types[i]].colors[colors[Math.floor(random() * colors.length)]],
  };
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

/**
 * Where the smoke comes out of a building put together out of parts - the
 * tops of its chimneys (shared/gen/houses describe smoke), turned with it -
 * the way a building drawn by hand has its smokeSource: in tiles across and
 * deep from the middle of its first tile, and how high, in steps of the
 * ground.
 *
 * @returns {number[][]} [x, height, z] for every chimney - none for a
 *          building with none
 */
function chimneys(sprites, look, compound, turns) {
  var size = footprint(compound),
    X = size[0] * 32,
    Y = size[1] * 32,
    seen = {},
    out = [];

  //every house in it once - a hamlet of cottages has a house to each of its
  //tiles, each as it would stand on its own, moved over to where it is
  look.tiles.forEach(function (tile) {
    var first = tile.parts[0],
      meta = first && sprites.generated[first.split("/")[0]];

    if (!meta || !meta.smoke) return;

    var p = first.split("/"),
      id = p.slice(0, -2).join("/"),
      dx = (tile.x - +p[p.length - 2]) * 32,
      dy = (tile.y - +p[p.length - 1]) * 32,
      key = id + "@" + dx + "," + dy;

    if (!meta.smoke[id] || seen[key]) return;
    seen[key] = true;

    meta.smoke[id].forEach(function (t) {
      var x = t[0] + dx,
        y = t[1] + dy,
        at = [
          [x, y],
          [y, X - x],
          [X - x, Y - y],
          [Y - y, x],
        ][turns];

      //a pixel up is a step of the ground for every eight - the camera
      //looks down at thirty degrees (see client/config tileZStep)
      out.push([at[0] / 32 - 0.5, t[2] / 8, at[1] / 32 - 0.5]);
    });
  });

  return out;
}

/**
 * An old town with its wall round it (shared/gen/oldtown wall): for every
 * tile of it, along every edge with no old town beyond it, a stretch of
 * wall - a gatehouse where a road comes up to it (not one going past), and
 * in the middle of its front - and in a corner where the town turns inwards, the bit that joins
 * the walls of the towns on either side; a tower where two of its walls meet.
 * Old town next to old town has no wall between them: one wall goes round
 * all of it, whatever it is made of. What it is, as a look the same as the
 * town's but for the wall laid under and over each tile's parts.
 *
 * @param building {Object} the core building
 * @param world {{get: function(number): Object|null}} the buildings by
 *        tile (core BuildingService)
 */
function walled(look, compound, building, world) {
  var W = compound.sizeX,
    D = compound.sizeY,
    turns = building.rotation & 3,
    X = Terrain.extractX(building.tile),
    Y = Terrain.extractY(building.tile),
    //the way in, in the middle of its front
    gate = Math.floor((W - 1) / 2);

  //what stands a step dx, dy off tile x, y of the town - both as the town
  //is painted - in the world, where the town is turned so many times
  function beyond(x, y, dx, dy) {
    var at = turn(x, y, W, D, turns),
      step = [dx, dy];

    for (var t = 0; t < turns; t++) step = [step[1], -step[0]];

    return world.get(
      Terrain.convertToIndex(X + at[0] + step[0], Y + at[1] + step[1]),
    );
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < W && y < D;
  }

  //whether the road beyond the edge d of a tile comes up to the wall there -
  //going on away from it, or ending there - rather than running along it, past
  //the town: there is a gate where it does
  function comesUp(tile, d) {
    var side = [d[1], d[0]],
      out = road(beyond(tile.x, tile.y, 2 * d[0], 2 * d[1])),
      left = road(beyond(tile.x, tile.y, d[0] + side[0], d[1] + side[1])),
      right = road(beyond(tile.x, tile.y, d[0] - side[0], d[1] - side[1]));

    return out || (!left && !right);
  }

  function town(b) {
    return (
      b !== null &&
      b.data.compound !== undefined &&
      b.data.compound.gen === "oldtown"
    );
  }

  function road(b) {
    return b !== null && b.data.classCode === BuildingClassCode.road;
  }

  return {
    tiles: look.tiles.map(function (tile) {
      var e = WALL_EDGES.map(function (d, i) {
          if (inside(tile.x + d[0], tile.y + d[1])) return 0;

          var other = beyond(tile.x, tile.y, d[0], d[1]);

          if (town(other)) return 0;
          if (road(other) && comesUp(tile, d)) return 2;

          return i === 1 && tile.y === 0 && tile.x === gate ? 2 : 1;
        }),
        c = WALL_CORNERS.map(function (pair) {
          var dx = WALL_EDGES[pair[0]][0] + WALL_EDGES[pair[1]][0],
            dy = WALL_EDGES[pair[0]][1] + WALL_EDGES[pair[1]][1];

          if (e[pair[0]] || e[pair[1]] || inside(tile.x + dx, tile.y + dy))
            return 0;

          return town(beyond(tile.x, tile.y, dx, dy)) ? 0 : 1;
        }),
        mask = e.join("") + c.join("");

      if (mask === "00000000") return tile;

      return {
        x: tile.x,
        y: tile.y,
        parts: ["oldtown/wall/" + mask + "/back"].concat(tile.parts, [
          "oldtown/wall/" + mask + "/front",
        ]),
      };
    }),
  };
}

//a tile's edges in the order a wall's mask has them - x0, y0, x1, y1 - by
//the step across each; and its corners, x0y0, x1y0, x1y1, x0y1, by the
//edges that meet there
var WALL_EDGES = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ],
  WALL_CORNERS = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
  ];

/**
 * The old towns next to the tiles - whose wall may run otherwise now that
 * what is on them has changed - each once.
 *
 * @param tiles {number[]}
 * @returns {Object[]} the core buildings
 */
function townsAround(world, tiles) {
  var seen = Object.create(null),
    out = [];

  tiles.forEach(function (tile) {
    for (var dx = -1; dx <= 1; dx++)
      for (var dy = -1; dy <= 1; dy++) {
        var b = world.get(tile + dx * Terrain.dx + dy * Terrain.dy);

        if (
          b === null ||
          seen[b.tile] === true ||
          b.data.compound === undefined ||
          b.data.compound.gen !== "oldtown"
        )
          continue;

        seen[b.tile] = true;
        out.push(b);
      }
  });

  return out;
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
  var key = kindKey(compound);

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

  var list = pieces(sprites, look, compound, 0, 1),
    loads = [];

  //what stands still over a tile is in the picture too - the cars parked,
  //and what of the tile stands in front of them over them
  function still(piece) {
    return piece.overlays
      .filter(function (o) {
        return (
          o.looks !== undefined ||
          (o.frames !== undefined && o.frames.length === 1)
        );
      })
      .map(function (o) {
        return o.looks !== undefined ? o.looks[0] : o.frames[0];
      });
  }

  list.forEach(function (piece) {
    piece.sprite.parts.forEach(function (part) {
      loads.push(sprites.loadSheet(part.sheet));
    });
    still(piece).forEach(function (look) {
      loads.push(sprites.loadSheet(look.sprite.parts[0].sheet));
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
      still(piece).forEach(function (look) {
        if (look.sprite.parts[0].sheet.image === null) missing = true;
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

        //from where the tile's middle is
        still(piece).forEach(function (look) {
          var part = look.sprite.parts[0],
            f = part.frame;

          ctx.drawImage(
            part.sheet.image,
            f.x,
            f.y,
            f.w,
            f.h,
            piece.left + piece.pivotX - look.pivotX - minX,
            piece.top + piece.pivotY - look.pivotY - minY,
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
  walled: walled,
  townsAround: townsAround,
  chimneys: chimneys,
  lookOf: lookOf,
  sampleLook: sampleLook,
  pickLook: pickLook,
  siteLook: siteLook,
  smallSite: smallSite,
  lotPieces: lotPieces,
  pieces: pieces,
  preview: preview,
};
