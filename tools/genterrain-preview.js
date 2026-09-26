/**
 * Puts the tiles tools/genterrain.js wrote together the way the game is to,
 * to see how they look: every tileset's slopes and diffuse tiles side by side,
 * and a made-up stretch of land where all the kinds of ground and the water
 * meet.
 *
 * It goes by nothing but the manifest and the pictures it lists, so it is also
 * how a renderer is to go about it - see composeTile().
 *
 * Usage:
 *   node tools/genterrain-preview.js [outDir]
 *
 * Writes preview-tiles.png and preview-map.png to outDir,
 * assets/terrain/terraingen unless given.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var SimplexNoise = require("simplex-noise");

var DEFAULT_OUT = path.resolve(__dirname, "../assets/terrain/terraingen");
//tiles across and down the made-up land
var MAP_SIZE = 24;
var BACKGROUND = [40, 40, 48, 255];

function hash() {
    var h = 0x9e3779b9;

    for (var i = 0; i < arguments.length; i++) {
        h = Math.imul(h ^ (arguments[i] | 0), 0x85ebca6b);
        h ^= h >>> 13;
        h = Math.imul(h, 0xc2b2ae35);
        h ^= h >>> 16;
    }

    return (h >>> 0) / 4294967296;
}

function canvas(width, height, fill) {
    var image = new PNG({width: width, height: height});

    for (var k = 0; fill && k < image.data.length; k += 4)
        image.data.set(fill, k);

    return image;
}

//src over dst, its top left corner at x, y
function blit(dst, src, x, y) {
    for (var sy = 0; sy < src.height; sy++) {
        for (var sx = 0; sx < src.width; sx++) {
            var dx = x + sx,
                dy = y + sy,
                s = (sy * src.width + sx) * 4,
                a = src.data[s + 3] / 255;

            if (a === 0 || dx < 0 || dy < 0 || dx >= dst.width || dy >= dst.height)
                continue;

            var d = (dy * dst.width + dx) * 4;

            for (var c = 0; c < 3; c++)
                dst.data[d + c] = Math.round(src.data[s + c] * a + dst.data[d + c] * (1 - a));
            dst.data[d + 3] = Math.max(dst.data[d + 3], src.data[s + 3]);
        }
    }
}

function Preview(out, manifest) {
    this.out = out;
    this.manifest = manifest;
    this.images = {};
    this.tiles = {};
}

Preview.prototype.image = function (rel) {
    return this.images[rel] || (this.images[rel] = PNG.sync.read(fs.readFileSync(path.join(this.out, rel))));
};

//one of a list of variants, always the same one for the same place
function pick(list, x, y, salt) {
    return list[Math.floor(hash(x, y, salt) * list.length)];
}

/**
 * The picture of the tile at x, y: its base, the diffuse tiles of the
 * neighbours that go over it, and the shore of its water if it is a shore -
 * all of it as the manifest says. Painted once for every different make-up,
 * the way the game would keep it on a canvas.
 *
 * @param at {function(x, y): ({tileset: string, slope: string, water: boolean, shore: boolean}|null)}
 */
Preview.prototype.composeTile = function (at, x, y) {
    var m = this.manifest,
        self = this,
        tile = at(x, y),
        set = m.tilesets[tile.tileset],
        layers = [pick(set.base[tile.slope], x, y, 0)],
        over = {};

    Object.keys(m.directions).forEach(function (dir) {
        var d = m.directions[dir],
            other = at(x + d.neighbour[0], y + d.neighbour[1]);

        if (other !== null && m.transitions[tile.tileset][other.tileset] === "diffuse")
            over[dir] = other.tileset;
    });

    //a corner is left out where an edge next to it brings the same ground
    Object.keys(over).forEach(function (dir) {
        var d = m.directions[dir];

        if (d.kind === "corner" && d.edges.some(function (e) {
            return over[e] === over[dir];
        }))
            delete over[dir];
    });

    Object.keys(over).sort(function (a, b) {
        return m.tilesets[over[a]].precedence - m.tilesets[over[b]].precedence;
    }).forEach(function (dir, k) {
        layers.push(pick(m.tilesets[over[dir]].diffuse[tile.slope][dir], x, y, 1 + k));
    });

    if (tile.shore) {
        var shore = m.tilesets[set.waterBody].shore;

        if (shore && shore[tile.slope])
            layers.push(shore[tile.slope]);
    }

    var key = layers.join("|");

    if (this.tiles[key] === undefined) {
        var image = canvas(m.tile.width, m.tile.height);

        layers.forEach(function (rel) {
            blit(image, self.image(rel), 0, 0);
        });
        this.tiles[key] = image;
    }

    return this.tiles[key];
};

/**
 * Every tileset in a row of its own: its base tiles, then what its diffuse
 * tiles look like over the tileset under it - or, for water, its shore over
 * the ground it meets.
 */
Preview.prototype.tilesSheet = function () {
    var m = this.manifest,
        self = this,
        w = m.tile.width + 4,
        h = m.tile.height + 4,
        ids = m.precedence,
        sheet = canvas(w * (m.slopes.length + 1), h * ids.length * 2, BACKGROUND);

    ids.forEach(function (id, row) {
        var set = m.tilesets[id],
            y = row * 2 * h + 2,
            under = m.tilesets[ids[row === 0 ? 1 : row - 1]];

        set.slopes.forEach(function (slope, col) {
            blit(sheet, self.image(set.base[slope][0]), col * w + 2, y);
        });

        if (set.shore) {
            var land = m.tilesets[id === "ice" ? "snow" : "grass"];

            Object.keys(set.shore).forEach(function (slope, col) {
                blit(sheet, self.image(land.base[slope][0]), col * w + 2, y + h);
                blit(sheet, self.image(set.shore[slope]), col * w + 2, y + h);
            });
            return;
        }

        Object.keys(m.directions).forEach(function (dir, col) {
            blit(sheet, self.image(under.base["2222"][0]), col * w + 2, y + h);
            blit(sheet, self.image(set.diffuse["2222"][dir][0]), col * w + 2, y + h);
        });

        //and all of it at once, on a slope
        var slope = "2211";

        if (set.diffuse[slope]) {
            blit(sheet, self.image(under.base[slope][0]), 9 * w + 2, y + h);
            Object.keys(m.directions).forEach(function (dir) {
                if (m.directions[dir].kind === "edge")
                    blit(sheet, self.image(set.diffuse[slope][dir][0]), 9 * w + 2, y + h);
            });
        }
    });

    return sheet;
};

/**
 * Made-up land: hills out of noise, no two corners along an edge more than a
 * step apart - which is what makes every tile one of the slopes - water where
 * it is at 0, and a patch of every kind of ground.
 */
Preview.prototype.map = function () {
    var m = this.manifest,
        self = this,
        n = MAP_SIZE,
        noise = new SimplexNoise("preview"),
        heights = [],
        land = m.precedence.filter(function (id) {
            return m.tilesets[id].kind === "land";
        }),
        seeds = land.map(function (id, k) {
            var a = k / land.length * 2 * Math.PI;

            return [n / 2 + Math.cos(a) * n * 0.32, n / 2 + Math.sin(a) * n * 0.32, id];
        }),
        x, y, changed;

    function h(gx, gy) {
        return heights[gy * (n + 1) + gx];
    }

    //and a sea in the left corner, deep enough to have deep water in it
    for (y = 0; y <= n; y++)
        for (x = 0; x <= n; x++)
            heights.push(Math.max(0, Math.round(1.2 + 2.2 * noise.noise2D(x / 7, y / 7) + 0.8 * noise.noise2D(x / 3, y / 3 + 9) -
                6 * Math.max(0, 1 - (x + n - y) / (n * 0.7)))));

    do {
        changed = false;
        for (y = 0; y <= n; y++) {
            for (x = 0; x <= n; x++) {
                [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
                    var qx = x + d[0],
                        qy = y + d[1];

                    if (qx < 0 || qy < 0 || qx > n || qy > n || h(x, y) <= h(qx, qy) + 1)
                        return;

                    heights[y * (n + 1) + x] = h(qx, qy) + 1;
                    changed = true;
                });
            }
        }
    } while (changed);

    function ground(tx, ty) {
        var best = null,
            distance = Infinity;

        seeds.forEach(function (s) {
            var d = Math.pow(s[0] - tx, 2) + Math.pow(s[1] - ty, 2) + 6 * noise.noise2D(tx / 4 + s[0], ty / 4);

            if (d < distance) {
                distance = d;
                best = s[2];
            }
        });

        return best;
    }

    function corners(tx, ty) {
        return {w: h(tx, ty + 1), n: h(tx + 1, ty + 1), e: h(tx + 1, ty), s: h(tx, ty)};
    }

    function wetCorners(tx, ty) {
        var c = corners(tx, ty);

        return [c.w, c.n, c.e, c.s].filter(function (z) {
            return z <= 0;
        }).length;
    }

    //open water with nothing but open water all round it is deep
    function offshore(tx, ty) {
        for (var dy = -1; dy <= 1; dy++)
            for (var dx = -1; dx <= 1; dx++)
                if (tx + dx < 0 || ty + dy < 0 || tx + dx >= n || ty + dy >= n || wetCorners(tx + dx, ty + dy) < 4)
                    return false;

        return true;
    }

    function at(tx, ty) {
        if (tx < 0 || ty < 0 || tx >= n || ty >= n)
            return null;

        var c = corners(tx, ty),
            id = ground(tx, ty),
            wet = wetCorners(tx, ty),
            water = m.tilesets[id].waterBody;

        if (wet === 4)
            return {
                tileset: water === "water_shallow" && m.tilesets.water_deep && offshore(tx, ty) ? "water_deep" : water,
                slope: "2222",
                water: true,
                shore: false
            };

        return {
            tileset: id,
            slope: String(2000 + (c.n - c.w + 2) * 100 + (c.e - c.w + 2) * 10 + (c.s - c.w + 2)),
            water: false,
            shore: wet > 0
        };
    }

    var top = Math.max.apply(null, heights),
        step = m.tile.heightStep,
        half = m.tile.width / 2,
        originX = n * half,
        originY = (2 * n - 1) * half / 2 + top * step + m.tile.pivot[1] + 1,
        image = canvas((2 * n + 2) * half, originY + 16, BACKGROUND);

    //far to near: the higher x + y is, the further up the screen
    for (var s = 2 * n - 2; s >= 0; s--) {
        for (x = Math.max(0, s - n + 1); x <= Math.min(n - 1, s); x++) {
            y = s - x;

            var tile = at(x, y),
                z = tile.water ? 0 : h(x, y + 1);

            blit(image, self.composeTile(at, x, y),
                (x - y - 1) * half + originX,
                originY - (x + y + 1) * half / 2 - z * step - m.tile.pivot[1]);
        }
    }

    return image;
};

function preview(out, manifest) {
    var p = new Preview(out, manifest);

    fs.writeFileSync(path.join(out, "preview-tiles.png"), PNG.sync.write(p.tilesSheet()));
    fs.writeFileSync(path.join(out, "preview-map.png"), PNG.sync.write(p.map()));
    console.log("Wrote preview-tiles.png and preview-map.png (" + Object.keys(p.tiles).length + " different tiles on the map)");
}

if (require.main === module) {
    var out = path.resolve(process.argv[2] || DEFAULT_OUT);

    preview(out, JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8")));
}

module.exports = {preview: preview};
