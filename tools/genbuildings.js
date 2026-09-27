/**
 * Paints buildings out of sections, the way tools/genvehicles.js paints cars
 * out of boxes: flat colours, one light for everything, no noise.
 *
 * A building is put together like toy bricks, from pieces that each take one
 * tile, the same pieces for every block whatever its size:
 *
 *   - storeys: a ground storey with the way in, and upper storeys stacked on
 *     it. Each is a tile wide along the wall, so the next section carries
 *     straight on, but less than a tile deep, which leaves room in front for
 *     the entrance and balconies inside the tile. A section at either end of
 *     the wall stops a little short of the tile's edge, its end wall blank;
 *   - roofs: the same, on top. The parapet runs round the edge of the whole
 *     roof - along the front and back of every section, across the end only
 *     on the end ones - so no seam shows where two sections meet;
 *   - yards: a tile of ground in front of the wall - a playground, a lawn
 *     with trees, a car park with the same cars in it that drive the roads
 *     (tools/vehiclemodels.js).
 *
 * A 1x1 tower is one section with both ends, a two tile wall two sections.
 *
 * The wall runs along x with its front looking towards -y, the yard in front
 * of it. Every side of it is painted, and every building is painted four
 * times, turned a quarter turn further each time so its front looks towards
 * -y, -x, +y and +x - turned rather than flipped, so the light still comes
 * from the same side as everywhere else and the back is really its back.
 *
 * Units as in the vehicles: a tile is 32 along the ground each way, heights in
 * pixels. Colours are kept to 16 bits.
 *
 * Usage:
 *   node tools/genbuildings.js [--preview <file.png>]
 *
 * Writes src/public/gfx/buildings/generated/<name>/<name>-r<turns>-<x>-<y>.png,
 * one picture per tile of each turn, and src/data/genbuildings.js with the
 * sprites entries for each turn, paths relative to src/public/gfx.
 * data/genbuildingcode gives each of them a building code and data/buildings
 * works out what it costs and houses, so a block is in the game as soon as it
 * is painted - run tools/genbuildingthumbs.js after this to give the catalogue
 * its picture of it. --preview also writes every building standing on grass
 * into one picture, to look at.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var iso = require("./isobox");
var vehicles = require("./vehiclemodels");

var box = iso.box,
    darker = iso.darker,
    lighter = iso.lighter,
    TILE = iso.TILE;

var ROOT = path.resolve(__dirname, "..");
var GFX = path.join(ROOT, "src/public/gfx");
var OUT_DIR = "buildings/generated";
var OUT_DATA = path.join(ROOT, "src/data/genbuildings.js");

//how high a storey is, and the plinth under the ground floor
var STOREY = 12,
    PLINTH = 3;

var GRASS = [112, 158, 84],
    PAVING = [178, 176, 168],
    ASPHALT = [96, 98, 104],
    STRIPE = [232, 232, 226],
    RUBBER = [184, 108, 88],
    SAND = [226, 204, 142],
    WOOD = [150, 104, 68],
    METAL = [92, 96, 104],
    TRUNK = [112, 84, 60],
    LEAF = [70, 128, 66],
    HEDGE = [84, 136, 70],
    GLASS = [88, 124, 156],
    DOOR = [86, 72, 64],
    VENT = [150, 152, 156];

//what a block is built of: its walls, the plinth under them, the stairwells
//up the front, the balconies and canopies, and the roof
var PALETTES = {
    panel: {
        wall: [214, 208, 196],
        plinth: [128, 124, 120],
        accent: [204, 112, 72],
        trim: [238, 236, 230],
        roof: [120, 114, 110]
    },
    sand: {
        wall: [226, 200, 158],
        plinth: [134, 118, 104],
        accent: [96, 134, 164],
        trim: [244, 238, 224],
        roof: [126, 112, 100]
    },
    slate: {
        wall: [170, 184, 194],
        plinth: [104, 110, 118],
        accent: [230, 194, 98],
        trim: [238, 240, 240],
        roof: [104, 108, 116]
    }
};

//a random number generator that gives the same numbers for the same seed, so
//running this again paints the same pictures
function random(seed) {
    var s = 0, i;

    for (i = 0; i < seed.length; i++)
        s = (s * 31 + seed.charCodeAt(i)) | 0;

    return function () {
        s = (s + 0x6D2B79F5) | 0;
        var t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function pick(rnd, list) {
    return list[Math.floor(rnd() * list.length)];
}

/**
 * The one section every block is built of. It is a tile wide along the wall,
 * so the next one carries straight on, and less than a tile deep, which leaves
 * room inside the tile for the entrance and canopy in front and balconies on
 * both long sides.
 *
 * Every block has the same sections - a 1x1 tower is a single one of them, a
 * two tile wall two of them side by side - so they all look like the same
 * block, only longer or taller.
 */
var SECTION = {
    //how far the wall stands back from the front of its tile, and how deep
    front: 10,
    depth: 19,
    //how far a section that ends the wall stops short of its tile's edge
    inset: 2,
    //the windows either side of the stairwell in the middle, along the tile
    windows: [[3, 7], [8, 12], [20, 24], [25, 29]],
    //which of those have balconies: one of these for each long side
    balconies: [[1, 2], [0, 3]]
};

/**
 * Where section c of a wall `cells` tiles long stands, its front on row: the
 * same for every storey stacked on it and the roof on top. start and end say
 * whether it ends the wall that way - both, for a wall of one.
 */
function section(c, cells, row, balconies, backBalconies) {
    var start = c === 0,
        end = c === cells - 1,
        cell = c * TILE;

    return {
        cell: cell,
        mid: cell + TILE / 2,
        x0: start ? cell + SECTION.inset : cell,
        x1: end ? cell + TILE - SECTION.inset : cell + TILE,
        front: row + SECTION.front,
        back: row + SECTION.front + SECTION.depth,
        start: start,
        end: end,
        balconies: balconies,
        backBalconies: backBalconies
    };
}

/**
 * One storey of a section, its wall from z0 up to z1 and its floor at zf: the
 * windows and balconies along both long sides, and its piece of the stairwell
 * up the middle of the front - a strip of colour with a window on the landing
 * halfway up the storey, which shows through at the back too. The ends are
 * blank. On the ground storey (upper false) there are no balconies, and the
 * way in is where the landing window would be.
 */
function storey(b, s, z0, z1, zf, upper, pal) {
    var landing = zf + STOREY / 2;

    b.push(box(s.x0, s.x1, s.front, s.back, z0, z1, pal.wall));

    facade(b, s.cell, upper ? s.balconies : [], s.front, -1, zf, pal);
    facade(b, s.cell, upper ? s.backBalconies : [], s.back, 1, zf, pal);

    b.push(box(s.mid - 2, s.mid + 2, s.front - 0.5, s.front, zf, z1, pal.accent));
    if (upper)
        b.push(box(s.mid - 1, s.mid + 1, s.front - 0.7, s.front, landing - 2, landing + 2, GLASS));
    b.push(box(s.mid - 1, s.mid + 1, s.back, s.back + 0.2, landing - 2, landing + 2, GLASS));
}

//how far the plinth and the floor lines stand out of a section's ends
function ends(s, e) {
    return [s.x0 - (s.start ? e : 0), s.x1 + (s.end ? e : 0)];
}

//the ground storey: on a plinth, with the way in under a canopy at the front
function groundStorey(b, s, pal) {
    var x = ends(s, 0.3);

    storey(b, s, 1, PLINTH + STOREY, PLINTH, false, pal);
    b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, pal.plinth));

    b.push(box(s.mid - 3, s.mid + 3, s.front - 4, s.front, 1, 1.6, pal.plinth));
    b.push(box(s.mid - 1.5, s.mid + 1.5, s.front - 0.7, s.front, 1.6, PLINTH + 6, DOOR));
    b.push(box(s.mid - 3.5, s.mid + 3.5, s.front - 4, s.front, PLINTH + 6.5, PLINTH + 7.5, pal.trim));
}

//a storey stacked on the one under it, from z: a line where its floor is
function upperStorey(b, s, z, pal) {
    var x = ends(s, 0.2);

    storey(b, s, z, z + STOREY, z, true, pal);
    b.push(box(x[0], x[1], s.front - 0.2, s.back + 0.2, z - 0.5, z + 0.5, darker(pal.wall, 0.08)));
}

/**
 * The roof on top of a section at z. The parapet runs round the edge of the
 * whole roof - along the front and back of every section, across the end only
 * on the end ones - so no seam shows where two sections meet. On it, the way
 * out over the stairs and a vent or two.
 */
function roof(b, s, z, pal, rnd) {
    var vents = 1 + Math.floor(rnd() * 2), v, vx, vy;

    b.push(box(s.x0, s.x1, s.front, s.back, z, z + 0.4, pal.roof));
    b.push(box(s.x0, s.x1, s.front, s.front + 1.5, z, z + 2, pal.wall));
    b.push(box(s.x0, s.x1, s.back - 1.5, s.back, z, z + 2, pal.wall));
    if (s.start)
        b.push(box(s.x0, s.x0 + 1.5, s.front, s.back, z, z + 2, pal.wall));
    if (s.end)
        b.push(box(s.x1 - 1.5, s.x1, s.front, s.back, z, z + 2, pal.wall));

    b.push(box(s.mid - 3, s.mid + 3, s.back - 9, s.back - 3, z, z + 6, pal.wall));
    b.push(box(s.mid - 3.3, s.mid + 3.3, s.back - 9.3, s.back - 2.7, z + 6, z + 6.8, pal.plinth));
    b.push(box(s.mid - 1.2, s.mid + 1.2, s.back - 9.2, s.back - 9, z + 0.4, z + 4.5, DOOR));

    for (v = 0; v < vents; v++) {
        vx = pick(rnd, [s.x0 + 4, s.x1 - 7]);
        vy = s.front + 3 + Math.floor(rnd() * (s.back - s.front - 9));
        b.push(box(vx, vx + 3, vy, vy + 3, z, z + 2.5, VENT));
    }
}

/**
 * One storey of windows along a long side of a section: the wall's face is at
 * y, looking towards -y (out = -1) or +y (out = 1), the storey's floor at zf.
 * The windows listed in balconies get a glass door and a balcony instead.
 */
function facade(b, cell, balconies, y, out, zf, pal) {
    SECTION.windows.forEach(function (w, i) {
        var w0 = cell + w[0], w1 = cell + w[1];

        if (balconies.indexOf(i) >= 0)
            balcony(b, w0, w1, y, out, zf, pal);
        else
            b.push(box(w0, w1, y, y + out * 0.2, zf + 3, zf + 9, GLASS));
    });
}

//a balcony outside a glass door from w0 to w1 in the face at y, on the floor
//at zf
function balcony(b, w0, w1, y, out, zf, pal) {
    var a0 = w0 - 1, a1 = w1 + 1, d = y + out * 3;

    b.push(box(w0, w1, y, y + out * 0.2, zf + 1, zf + 9, GLASS));
    b.push(box(a0, a1, y, d, zf, zf + 1, pal.plinth));
    b.push(box(a0, a1, d, d - out * 0.5, zf + 1, zf + 4.5, pal.trim));
    b.push(box(a0, a0 + 0.5, y, d, zf + 1, zf + 4.5, pal.trim));
    b.push(box(a1 - 0.5, a1, y, d, zf + 1, zf + 4.5, pal.trim));
}

function tree(b, x, y, size) {
    var z = 4;

    b.push(box(x - 0.5, x + 0.5, y - 0.5, y + 0.5, 1, z + 1, TRUNK));
    [[size - 1, 2], [size, size + 1], [size - 1, 2], [size - 2, 1.5]].forEach(function (tier) {
        var r = tier[0];
        b.push(box(x - r, x + r, y - r, y + r, z, z + tier[1], LEAF));
        z += tier[1];
    });
}

function bench(b, x, y) {
    b.push(box(x, x + 5, y, y + 2, 2, 2.6, WOOD));
    b.push(box(x, x + 5, y + 1.6, y + 2, 2.6, 4, WOOD));
    b.push(box(x + 0.5, x + 1, y + 0.5, y + 1.5, 1, 2, METAL));
    b.push(box(x + 4, x + 4.5, y + 0.5, y + 1.5, 1, 2, METAL));
}

//the cars that park at home - no trucks or buses - each as often as it turns
//up on the roads
var PARKED = ["sedan", "hatchback", "pickup", "van"];

/**
 * A car from tools/vehiclemodels.js - the same boxes the driving ones are
 * painted from - parked with its middle at x, y on ground z high, nose in
 * towards +y or backed in.
 */
function parkedCar(b, x, y, z, rnd) {
    var total = 0, roll, type, t, colors = Object.keys(vehicles.COLORS);

    PARKED.forEach(function (name) {
        total += vehicles.TYPES[name].weight;
    });
    roll = rnd() * total;
    for (type = 0; roll >= vehicles.TYPES[PARKED[type]].weight; type++)
        roll -= vehicles.TYPES[PARKED[type]].weight;
    t = vehicles.TYPES[PARKED[type]];

    vehicles.place(t.build(vehicles.COLORS[pick(rnd, colors)]), t.length, t.width,
        vehicles.DIRECTIONS[rnd() < 0.7 ? "y+" : "y-"]).forEach(function (c) {
        b.push(box(c.x0 + x, c.x1 + x, c.y0 + y, c.y1 + y, c.z0 + z, c.z1 + z, c.color));
    });
}

//the ground of one yard tile at cell x = cx (the yard is always the front row)
var YARDS = {
    playground: function (b, cx, rnd) {
        var sx = cx + 4 + Math.floor(rnd() * 4), sy = 5;

        b.push(box(cx + 3, cx + 29, 3, 29, 1, 1.2, RUBBER));
        //a sandpit with a wooden rim
        b.push(box(sx, sx + 9, sy, sy + 9, 1, 1.8, SAND));
        b.push(box(sx, sx + 9, sy, sy + 1, 1, 2.2, WOOD));
        b.push(box(sx, sx + 9, sy + 8, sy + 9, 1, 2.2, WOOD));
        b.push(box(sx, sx + 1, sy, sy + 9, 1, 2.2, WOOD));
        b.push(box(sx + 8, sx + 9, sy, sy + 9, 1, 2.2, WOOD));
        //a swing: two posts, a bar, two seats on chains
        var wx = cx + 16, wy = 20;
        b.push(box(wx, wx + 1, wy, wy + 1, 1, 11, METAL));
        b.push(box(wx + 11, wx + 12, wy, wy + 1, 1, 11, METAL));
        b.push(box(wx, wx + 12, wy, wy + 1, 10, 11, METAL));
        [wx + 3, wx + 7.5].forEach(function (x) {
            b.push(box(x, x + 0.4, wy + 0.3, wy + 0.7, 4, 10, METAL));
            b.push(box(x + 1.1, x + 1.5, wy + 0.3, wy + 0.7, 4, 10, METAL));
            b.push(box(x - 0.3, x + 1.8, wy - 0.5, wy + 1.5, 3.5, 4.2, RUBBER));
        });
        bench(b, cx + 5, 22);
        tree(b, cx + 25, 7, 3);
    },
    lawn: function (b, cx, rnd) {
        var n = 2 + Math.floor(rnd() * 2), i, spots = [[8, 8], [22, 10], [12, 21], [24, 22]];

        //a hedge round the front
        b.push(box(cx + 1, cx + 31, 1, 3, 1, 3.5, HEDGE));
        spots.sort(function () {
            return rnd() - 0.5;
        });
        for (i = 0; i < n; i++)
            tree(b, cx + spots[i][0], spots[i][1], 3 + Math.floor(rnd() * 2));
        bench(b, cx + 12, 27);
    },
    //three bays against the block, the way in along the front
    parking: function (b, cx, rnd) {
        var i, x;

        b.push(box(cx + 1, cx + 31, 2, 30, 1, 1.2, ASPHALT));
        for (i = 0; i < 4; i++) {
            x = cx + 3 + i * 9;
            b.push(box(x, x + 0.6, 14, 30, 1.2, 1.25, STRIPE));
        }
        for (i = 0; i < 3; i++) {
            if (rnd() < 0.75)
                parkedCar(b, cx + 7.8 + i * 9, 22, 1.2, rnd);
        }
    }
};

/**
 * An apartment block: `cells` sections side by side, `storeys` high, with or
 * without a row of yard in front - a ground storey, the storeys stacked on it
 * and a roof on top of every section.
 */
function apartments(spec, pal, rnd) {
    var sizeX = spec.cells,
        sizeY = spec.yard ? 2 : 1,
        row = spec.yard ? TILE : 0,
        //the same balconies all along the block, one way at the front and
        //maybe another at the back
        balconies = pick(rnd, SECTION.balconies),
        backBalconies = pick(rnd, SECTION.balconies),
        b = [], c, k, s, yards;

    //the lot, and a pavement along the front of the block
    b.push(box(0, sizeX * TILE, 0, sizeY * TILE, 0, 1, GRASS));
    b.push(box(1, sizeX * TILE - 1, spec.yard ? row : 1, row + SECTION.front, 1, 1.2, PAVING));

    for (c = 0; c < spec.cells; c++) {
        s = section(c, spec.cells, row, balconies, backBalconies);

        groundStorey(b, s, pal);
        for (k = 1; k < spec.storeys; k++)
            upperStorey(b, s, PLINTH + k * STOREY, pal);
        roof(b, s, PLINTH + spec.storeys * STOREY, pal, rnd);
    }

    if (spec.yard) {
        //never the same yard twice side by side
        yards = Object.keys(YARDS);
        for (c = 0; c < spec.cells; c++) {
            var kind = pick(rnd, yards);
            YARDS[kind](b, c * TILE, rnd);
            yards = yards.filter(function (y) {
                return y !== kind;
            });
        }
    }

    return {sizeX: sizeX, sizeY: sizeY, boxes: b};
}

//the blocks: a tower of one section, with and without a yard, and a wall of
//two - each two, three and four storeys high
var LAYOUTS = {
    tower: {cells: 1, yard: false},
    toweryard: {cells: 1, yard: true},
    wall: {cells: 2, yard: false},
    wallyard: {cells: 2, yard: true}
};

var buildings = [];

Object.keys(LAYOUTS).forEach(function (layout) {
    [2, 3, 4].forEach(function (storeys) {
        Object.keys(PALETTES).forEach(function (palette) {
            var name = "apartments-" + layout + storeys + "-" + palette,
                spec = Object.assign({storeys: storeys}, LAYOUTS[layout]),
                model = apartments(spec, PALETTES[palette], random(name));

            buildings.push({
                name: name,
                sizeX: model.sizeX,
                sizeY: model.sizeY,
                storeys: storeys,
                rotations: [0, 1, 2, 3].map(function (turns) {
                    var odd = turns % 2 === 1;

                    return paint(name, iso.rotate(model.boxes, model.sizeX, model.sizeY, turns),
                        odd ? model.sizeY : model.sizeX, odd ? model.sizeX : model.sizeY, "-r" + turns);
                })
            });
        });
    });
});

//paints what stands on each tile on its own and writes a picture per tile,
//giving back the sprites entries
function paint(name, boxes, sizeX, sizeY, suffix) {
    var dir = path.join(GFX, OUT_DIR, name);

    fs.mkdirSync(dir, {recursive: true});

    return iso.paintTiles(boxes, sizeX, sizeY).map(function (piece) {
        var file = path.join(dir, name + suffix + "-" + piece.x + "-" + piece.y + ".png"),
            png = new PNG({width: piece.w, height: piece.h});

        png.data.fill(0);
        iso.blit(png, piece, 0, 0);
        fs.writeFileSync(file, PNG.sync.write(png));

        return {
            x: piece.x,
            y: 0,
            z: piece.y,
            pivotX: piece.pivotX,
            pivotY: piece.pivotY,
            path: path.relative(GFX, file).split(path.sep).join("/"),
            piece: piece
        };
    });
}

function entries(sprites) {
    return sprites.map(function (s) {
        return {x: s.x, y: s.y, z: s.z, pivotX: s.pivotX, pivotY: s.pivotY, path: s.path};
    });
}

var data = {};
buildings.forEach(function (b) {
    data[b.name] = {sizeX: b.sizeX, sizeY: b.sizeY, storeys: b.storeys, rotations: b.rotations.map(entries)};
});

fs.writeFileSync(OUT_DATA,
    "//Generated by tools/genbuildings.js - change that and run it again instead.\n" +
    "//\n" +
    "//Every generated building, with its size in tiles and, for each quarter turn,\n" +
    "//its sprites entries as data/buildings.js has them (layer left out). Turned\n" +
    "//0 times its front looks towards -y, then -x, +y and +x; turned an odd number\n" +
    "//of times its footprint is sizeY by sizeX.\n" +
    "export default " + JSON.stringify(data, null, 4).replace(/\{\s+("x"[^}]*?)\s+\}/g, function (m, inner) {
        return "{" + inner.replace(/\s+/g, " ") + "}";
    }) + ";\n");

var count = buildings.reduce(function (n, b) {
    return b.rotations.reduce(function (m, sprites) {
        return m + sprites.length;
    }, n);
}, 0);

console.log("wrote " + buildings.length + " buildings, " + count + " pictures, to " + path.join("src/public/gfx", OUT_DIR) + " and " + path.relative(ROOT, OUT_DATA));

var previewAt = process.argv.indexOf("--preview");
if (previewAt >= 0)
    preview(process.argv[previewAt + 1]);

/**
 * Every building standing on grass, put back together from its pieces the way
 * the game draws them - back to front - a row per layout and height, the
 * palettes across, each in its four turns.
 */
function preview(file) {
    var cellW = 200, cellH = 190,
        palettes = Object.keys(PALETTES).length,
        cols = palettes * 4,
        rows = buildings.length / palettes,
        png = new PNG({width: cols * cellW, height: rows * cellH}),
        ground = {w: 64, h: 32, pixels: []}, i, j;

    for (i = 0; i < png.data.length; i += 4) {
        png.data[i] = png.data[i + 1] = png.data[i + 2] = 40;
        png.data[i + 3] = 255;
    }

    //a grass tile's diamond, lit from above
    for (j = 0; j < 32; j++) {
        for (i = 0; i < 64; i++)
            ground.pixels.push(Math.abs(i + 0.5 - 32) / 2 + Math.abs(j + 0.5 - 16) <= 16 ? lighter(GRASS, 0.22) : null);
    }

    buildings.forEach(function (b, n) {
        b.rotations.forEach(function (sprites, r) {
            var col = (n % palettes) * 4 + r,
                ox = col * cellW + cellW / 2,
                oy = Math.floor(n / palettes) * cellH + cellH - 50,
                gx, gy;

            //the tiles around it, so it can be seen standing among them
            for (gx = -1; gx <= 2; gx++) {
                for (gy = -1; gy <= 2; gy++)
                    iso.blit(png, ground, ox + (gx - gy) * 32 - 32, oy - (gx + gy) * 16 - 16);
            }

            sprites.slice().sort(function (a, c) {
                return (c.x + c.z) - (a.x + a.z);
            }).forEach(function (s) {
                var cx = ox + (s.x - s.z) * 32,
                    cy = oy - (s.x + s.z) * 16;

                iso.blit(png, s.piece, cx - s.pivotX, cy - s.pivotY);
            });
        });
    });

    fs.writeFileSync(file, PNG.sync.write(png));
    console.log("wrote " + file);
}
