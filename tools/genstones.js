/**
 * Cuts the stones out of the pictures they were painted in, and paints each of
 * them the other way round as well.
 *
 * The stones in assets/scenery/stone were painted straight onto a flat grass
 * tile - the very one in assets/terrain/grass/2222.png, pixel for pixel - with
 * their shadows laid over it as black at 20%. Where a picture has that grass,
 * there is nothing but ground; where it has that grass darkened the same in
 * every channel, there is shadow, and it becomes black as see-through as the
 * shadows were on the whole - one pixel off another only by rounding;
 * everything else is stone and stays as it is. So the stones can lie on any
 * ground, sloped or whatever grass it happens to be.
 *
 * The mirrored ones are flipped left to right, stones only: the light still
 * comes from the right, so their shadows are cast again to the left of them -
 * each stone's silhouette dragged SHADOW_LENGTH pixels along the ground, over
 * the tile and nowhere else, the way the painted ones lie.
 *
 * Usage:
 *   node tools/genstones.js
 *
 * Writes src/public/gfx/scenery/<name>.png and <name>-m.png for every picture.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var ROOT = path.resolve(__dirname, "..");
var SOURCES = ["stone", "stone0"];
var SOURCE_DIR = path.join(ROOT, "assets/scenery/stone");
var GROUND = path.join(ROOT, "assets/terrain/grass/2222.png");
var OUT_DIR = path.join(ROOT, "src/public/gfx/scenery");

//how far a shadow may be off the darkening it is taken for, per channel - the
//painted ones were rounded to whole values
var SHADOW_TOLERANCE = 0.05;
//how far to the left a stone's shadow reaches, as far as the painted ones do
var SHADOW_LENGTH = 6;

function read(file) {
    return PNG.sync.read(fs.readFileSync(file));
}

function write(image, name) {
    fs.writeFileSync(path.join(OUT_DIR, name + ".png"), PNG.sync.write(image));
}

/**
 * How much a pixel of the picture darkens the ground under it: 0 where it is
 * the ground as it is, the same for all three channels where it is shadow, and
 * null where it is neither - that is a stone.
 */
function darkening(picture, ground, i) {
    var ratios = [0, 1, 2].map(function (c) {
            return picture.data[i + c] / Math.max(1, ground.data[i + c]);
        }),
        mean = (ratios[0] + ratios[1] + ratios[2]) / 3;

    if (ratios.some(function (r) {
            return Math.abs(r - mean) > SHADOW_TOLERANCE;
        }) || mean > 1 + SHADOW_TOLERANCE)
        return null;

    return Math.max(0, 1 - mean);
}

/**
 * The picture with the ground taken out of it: stones as they were painted,
 * shadows black and as see-through as they darkened the grass on the whole.
 *
 * @returns {{image: PNG, stone: Uint8Array, shade: number}} stone marks the
 *          stone pixels, and shade is the alpha of the shadows
 */
function cutOut(picture, ground) {
    var w = picture.width,
        h = picture.height,
        image = new PNG({width: w, height: h}),
        stone = new Uint8Array(w * h),
        shadow = [],
        shade = 0,
        p, i, d;

    for (p = 0; p < w * h; p++) {
        i = p * 4;

        if (picture.data[i + 3] === 0)
            continue;

        //painted past the edge of the tile - there is no ground to be
        //anything but stone
        d = ground.data[i + 3] === 0 ? null : darkening(picture, ground, i);

        if (d === null) {
            stone[p] = 1;
            picture.data.copy(image.data, i, i, i + 4);
        } else if (Math.round(d * 255) > 0) {
            shadow.push(p);
            shade += d;
        }
    }

    shade = shadow.length > 0 ? Math.round(shade / shadow.length * 255) : 0;

    shadow.forEach(function (q) {
        image.data[q * 4 + 3] = shade;
    });

    return {image: image, stone: stone, shade: shade};
}

/**
 * The stones of a cut out picture flipped left to right, with their shadows
 * cast again on the ground to the left of them, as dark as the shadows were.
 */
function mirror(cut, ground) {
    var src = cut.image,
        w = src.width,
        h = src.height,
        image = new PNG({width: w, height: h}),
        stone = new Uint8Array(w * h),
        x, y, k, p, i, j;

    for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
            p = y * w + x;
            j = y * w + (w - 1 - x);

            if (cut.stone[j] === 1) {
                stone[p] = 1;
                src.data.copy(image.data, p * 4, j * 4, j * 4 + 4);
            }
        }
    }

    for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
            p = y * w + x;
            i = p * 4;

            //shadows fall on the tile only, and never over a stone
            if (stone[p] === 1 || ground.data[i + 3] === 0)
                continue;

            for (k = 1; k <= SHADOW_LENGTH && x + k < w; k++) {
                if (stone[p + k] === 1) {
                    image.data[i + 3] = cut.shade;
                    break;
                }
            }
        }
    }

    return image;
}

var ground = read(GROUND);

fs.mkdirSync(OUT_DIR, {recursive: true});

SOURCES.forEach(function (name) {
    var picture = read(path.join(SOURCE_DIR, name + ".png")),
        cut;

    if (picture.width !== ground.width || picture.height !== ground.height)
        throw new Error(name + ".png is not the size of the tile it was painted on");

    cut = cutOut(picture, ground);

    write(cut.image, name);
    write(mirror(cut, ground), name + "-m");

    console.log("scenery/" + name + ".png", "scenery/" + name + "-m.png");
});
