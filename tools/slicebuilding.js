/**
 * Cuts the picture of a building bigger than one tile into one piece per tile.
 *
 * The renderer sorts sprites one by one, so a single picture over several tiles
 * would be drawn either entirely in front of or entirely behind whatever stands
 * next to it. Cut per tile, every piece is sorted with its own tile, the way the
 * two storey houses in the spritesheet are.
 *
 * Tile (0, 0) is the front one, the lowest on screen; +x runs up and to the
 * right, +y up and to the left (the building's sizeX and sizeY). Every piece is
 * its tile's own 64px column, and a pixel that two columns share goes to the
 * front tile when it is below that tile's back edges, otherwise to the tile
 * behind - so the roof and the tall walls go with the tiles they stand over.
 *
 * Usage:
 *   node tools/slicebuilding.js <picture.png> <sizeX> <sizeY> <anchorX> <anchorY> <out/prefix>
 *
 * anchorX/anchorY is where the middle of the front tile is in the picture: the
 * middle of its bottom corner, 14px up (the pivot the rest of the game uses).
 * Writes <out/prefix>-<x>-<y>.png for every tile and prints the sprites entry
 * for data/buildings.js, paths relative to src/public/gfx.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var TILE_W = 64,
    TILE_H = 32;

var args = process.argv.slice(2);

if (args.length !== 6) {
    console.error("usage: node tools/slicebuilding.js <picture.png> <sizeX> <sizeY> <anchorX> <anchorY> <out/prefix>");
    process.exit(1);
}

var image = PNG.sync.read(fs.readFileSync(args[0])),
    sizeX = parseInt(args[1], 10),
    sizeY = parseInt(args[2], 10),
    anchorX = parseFloat(args[3]),
    anchorY = parseFloat(args[4]),
    prefix = args[5];

var tiles = [];

for (var i = 0; i < sizeX; i++) {
    for (var j = 0; j < sizeY; j++) {
        tiles.push({
            x: i,
            y: j,
            cx: anchorX + (i - j) * TILE_W / 2,
            cy: anchorY - (i + j) * TILE_H / 2,
            pixels: []
        });
    }
}

//front to back
tiles.sort(function (a, b) {
    return (a.x + a.y) - (b.x + b.y);
});

function inColumn(tile, px) {
    return px >= tile.cx - TILE_W / 2 && px < tile.cx + TILE_W / 2;
}

//how high on screen the back edges of a tile are in that column
function backEdge(tile, px) {
    return tile.cy - TILE_H / 2 + Math.abs(px + 0.5 - tile.cx) / 2 - 0.5;
}

function owner(px, py) {
    var candidates = tiles.filter(function (tile) {
        return inColumn(tile, px);
    });

    //out past the footprint's corners: the nearest column has it
    if (candidates.length === 0) {
        return tiles.reduce(function (best, tile) {
            return Math.abs(tile.cx - px) < Math.abs(best.cx - px) ? tile : best;
        });
    }

    for (var k = 0; k < candidates.length; k++) {
        if (py >= backEdge(candidates[k], px))
            return candidates[k];
    }

    //above everything in the column - it stands over the back one
    return candidates[candidates.length - 1];
}

for (var py = 0; py < image.height; py++) {
    for (var px = 0; px < image.width; px++) {
        if (image.data[(py * image.width + px) * 4 + 3] > 0)
            owner(px, py).pixels.push([px, py]);
    }
}

var sprites = [];

tiles.sort(function (a, b) {
    return a.x - b.x || a.y - b.y;
});

tiles.forEach(function (tile) {
    if (tile.pixels.length === 0) {
        console.error("tile " + tile.x + "," + tile.y + " has nothing on it, skipped");
        return;
    }

    var left = Math.round(tile.cx - TILE_W / 2),
        top = Infinity,
        bottom = -Infinity;

    tile.pixels.forEach(function (p) {
        top = Math.min(top, p[1]);
        bottom = Math.max(bottom, p[1]);
    });

    var piece = new PNG({width: TILE_W, height: bottom - top + 1});
    piece.data.fill(0);

    tile.pixels.forEach(function (p) {
        var from = (p[1] * image.width + p[0]) * 4,
            to = ((p[1] - top) * TILE_W + (p[0] - left)) * 4;

        image.data.copy(piece.data, to, from, from + 4);
    });

    var file = prefix + "-" + tile.x + "-" + tile.y + ".png";
    fs.writeFileSync(file, PNG.sync.write(piece));

    sprites.push({
        x: tile.x,
        y: 0,
        z: tile.y,
        pivotX: Math.round(tile.cx - left),
        pivotY: Math.round(tile.cy - top),
        path: path.relative(path.join(__dirname, "../src/public/gfx"), file).split(path.sep).join("/")
    });
});

console.log(JSON.stringify(sprites, null, 4));
