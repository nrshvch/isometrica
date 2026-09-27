/**
 * Packs the tiles tools/genterrain.js wrote into what the game loads: every
 * tileset on one picture of its own, and terrain.json - the manifest, with
 * where on its picture every tile is instead of the file it was in.
 *
 * A couple of thousand pictures a few pixels big each would be as many
 * requests; ten are loaded once, before the ground is drawn, so the tiles can
 * be put together the moment they are needed.
 *
 * Usage:
 *   node tools/packterrain.js [inDir] [outDir]
 *
 * inDir is assets/terrain/terraingen, outDir src/public/gfx/terrain, unless
 * given. Writes <outDir>/<tileset>.png and <outDir>/terrain.json.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var ROOT = path.resolve(__dirname, "..");
//the game's pictures are all under gfx/, and named from there
var GFX = path.join(ROOT, "src/public/gfx");
//tiles to a row of an atlas
var COLUMNS = 32;

function main() {
    var input = path.resolve(process.argv[2] || path.join(ROOT, "assets/terrain/terraingen")),
        output = path.resolve(process.argv[3] || path.join(GFX, "terrain")),
        manifest = JSON.parse(fs.readFileSync(path.join(input, "manifest.json"), "utf8")),
        w = manifest.tile.width,
        h = manifest.tile.height,
        packed = {
            generator: manifest.generator,
            seed: manifest.seed,
            tile: manifest.tile,
            slopes: manifest.slopes,
            slopeCode: manifest.slopeCode,
            directions: manifest.directions,
            precedence: manifest.precedence,
            compose: manifest.compose,
            transitions: manifest.transitions,
            tilesets: {}
        };

    fs.mkdirSync(output, {recursive: true});

    Object.keys(manifest.tilesets).forEach(function (id) {
        var set = manifest.tilesets[id],
            files = [],
            entry = {
                name: set.name,
                kind: set.kind,
                precedence: set.precedence,
                color: set.color,
                atlas: path.relative(GFX, path.join(output, id + ".png")).split(path.sep).join("/"),
                base: {},
                diffuse: {}
            };

        //every tile gets the next place on the atlas, and where that is goes
        //where its file was
        function place(file) {
            var i = files.length;

            files.push(file);

            return [(i % COLUMNS) * w, Math.floor(i / COLUMNS) * h];
        }

        Object.keys(set.base).forEach(function (slope) {
            entry.base[slope] = set.base[slope].map(place);
        });

        Object.keys(set.diffuse).forEach(function (slope) {
            entry.diffuse[slope] = {};

            Object.keys(set.diffuse[slope]).forEach(function (dir) {
                entry.diffuse[slope][dir] = set.diffuse[slope][dir].map(place);
            });
        });

        if (set.shore) {
            entry.shore = {};

            Object.keys(set.shore).forEach(function (slope) {
                entry.shore[slope] = place(set.shore[slope]);
            });
        }

        var atlas = new PNG({
            width: Math.min(files.length, COLUMNS) * w,
            height: Math.ceil(files.length / COLUMNS) * h
        });

        files.forEach(function (file, i) {
            var tile = PNG.sync.read(fs.readFileSync(path.join(input, file)));

            PNG.bitblt(tile, atlas, 0, 0, w, h, (i % COLUMNS) * w, Math.floor(i / COLUMNS) * h);
        });

        fs.writeFileSync(path.join(output, id + ".png"), PNG.sync.write(atlas));
        packed.tilesets[id] = entry;
    });

    fs.writeFileSync(path.join(output, "terrain.json"), JSON.stringify(packed) + "\n");

    console.log("Packed " + Object.keys(packed.tilesets).length + " tilesets into " + path.relative(process.cwd(), output));
}

main();
