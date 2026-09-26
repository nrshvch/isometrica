/**
 * Paints the cars, vans, trucks and buses that drive about the roads.
 *
 * Every vehicle is a handful of boxes - body, cabin, windows, wheels, lights -
 * and each picture is those boxes seen the way the game sees the world: one
 * ray per pixel, straight into the scene, coloured by the box it hits first and
 * shaded by which way the face it hits looks. So all of them are lit the same,
 * and every body type comes out in every colour without anybody drawing it.
 *
 * A vehicle is painted four times, once for each way it can drive: along x or
 * y, towards + or -. Unlike a mirrored picture, a truck driving away still has
 * its cab in front and the light still comes from the same side.
 *
 * Units: one along the ground is one pixel across the screen - a tile is 32 of
 * them each way, a road about 20 wide, a lane 10. Heights are in pixels.
 * +x runs up and to the right on the screen, +y up and to the left.
 *
 * Usage:
 *   node tools/genvehicles.js
 *
 * Writes src/public/gfx/vehicles/vehicles.png with every picture on it and
 * src/data/vehicles.js saying where each one is and where its pivot is - the
 * middle of the vehicle, on the ground - and where its smoke comes out: its
 * tailpipe as it drives, its engine when it breaks down.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var ROOT = path.resolve(__dirname, "..");
var IMAGE = "vehicles/vehicles.png";
var OUT_IMAGE = path.join(ROOT, "src/public/gfx", IMAGE);
var OUT_DATA = path.join(ROOT, "src/data/vehicles.js");

var COLORS = {
    orange: [236, 128, 32],
    yellow: [242, 198, 38],
    red: [196, 36, 40],
    blue: [44, 92, 204],
    green: [48, 146, 64],
    black: [44, 44, 52],
    white: [228, 230, 232]
};

var GLASS = [96, 150, 196],
    TYRE = [28, 28, 32],
    CHASSIS = [52, 52, 58],
    HEADLIGHT = [255, 244, 180],
    TAILLIGHT = [220, 30, 30],
    BUMPER = [120, 122, 128],
    CARGO = [214, 214, 206];

function mix(c, to, k) {
    return [c[0] + (to[0] - c[0]) * k, c[1] + (to[1] - c[1]) * k, c[2] + (to[2] - c[2]) * k];
}

function lighter(c, k) {
    return mix(c, [255, 255, 255], k);
}

function darker(c, k) {
    return mix(c, [0, 0, 0], k);
}

/**
 * A box in the vehicle's own frame: l along it from the front (0) back, w
 * across it from its left side, z up from the ground.
 */
function box(l0, l1, w0, w1, z0, z1, color) {
    return {l0: l0, l1: l1, w0: w0, w1: w1, z0: z0, z1: z1, color: color};
}

//glass all round a cabin, leaving pillars at the corners
function windows(boxes, l0, l1, w0, w1, z0, z1, pillar, sides) {
    var e = 0.15;

    //front and back
    boxes.push(box(l0 - e, l1 + e, w0 + pillar, w1 - pillar, z0, z1, GLASS));

    //sides, cut into panes
    for (var i = 0; i < sides.length; i++)
        boxes.push(box(sides[i][0], sides[i][1], w0 - e, w1 + e, z0, z1, GLASS));
}

function wheels(boxes, length, width, axles, radius) {
    for (var i = 0; i < axles.length; i++)
        boxes.push(box(axles[i] - radius, axles[i] + radius, -0.3, width + 0.3, 0, radius * 2.1, TYRE));

    //the underside between them
    boxes.push(box(1, length - 1, 0.8, width - 0.8, 0.6, 1.2, CHASSIS));
}

function lights(boxes, length, width, z0, z1, inset, size) {
    var e = 0.2;

    boxes.push(box(-e, 0, inset, inset + size, z0, z1, HEADLIGHT));
    boxes.push(box(-e, 0, width - inset - size, width - inset, z0, z1, HEADLIGHT));
    boxes.push(box(length, length + e, inset, inset + size, z0, z1, TAILLIGHT));
    boxes.push(box(length, length + e, width - inset - size, width - inset, z0, z1, TAILLIGHT));
}

//where smoke comes out of a type, as points in its own frame - l, w and z like
//a box's: its tailpipe, low under the back bumper on the right, puffs as it
//drives; its engine smokes when it breaks down - under the bonnet on most, low
//on the front of a lorry's cab, which sits over it, and at the back of a bus
var TYPES = {
    sedan: {
        length: 13, width: 6, speed: 1, weight: 5, engine: [1.8, 3, 3.8], tailpipe: [13.2, 4.8, 1.0],
        build: function (c) {
            var b = [];
            wheels(b, 13, 6, [2.6, 10.4], 1.2);
            b.push(box(0, 13, 0, 6, 1.2, 3.8, c));
            b.push(box(-0.2, 0, 0.3, 5.7, 1.2, 2.2, BUMPER));
            b.push(box(13, 13.2, 0.3, 5.7, 1.2, 2.2, BUMPER));
            lights(b, 13, 6, 2.4, 3.3, 0.4, 1.3);
            b.push(box(3.6, 9.6, 0.5, 5.5, 3.8, 6.6, c));
            windows(b, 3.6, 9.6, 0.5, 5.5, 4.2, 6.1, 0.6, [[4.2, 6.4], [6.9, 9.0]]);
            return b;
        }
    },
    hatchback: {
        length: 11, width: 6, speed: 1, weight: 4, engine: [1.6, 3, 3.8], tailpipe: [11.2, 4.8, 1.0],
        build: function (c) {
            var b = [];
            wheels(b, 11, 6, [2.3, 8.8], 1.2);
            b.push(box(0, 11, 0, 6, 1.2, 3.8, c));
            b.push(box(-0.2, 0, 0.3, 5.7, 1.2, 2.2, BUMPER));
            b.push(box(11, 11.2, 0.3, 5.7, 1.2, 2.2, BUMPER));
            lights(b, 11, 6, 2.4, 3.3, 0.4, 1.3);
            b.push(box(3.2, 10.6, 0.5, 5.5, 3.8, 6.8, c));
            windows(b, 3.2, 10.6, 0.5, 5.5, 4.2, 6.3, 0.6, [[3.8, 6.6], [7.1, 10.0]]);
            return b;
        }
    },
    pickup: {
        length: 14, width: 6, speed: 0.95, weight: 3, engine: [1.8, 3, 4.0], tailpipe: [14.2, 4.8, 1.2],
        build: function (c) {
            var b = [];
            wheels(b, 14, 6, [2.7, 11.3], 1.4);
            b.push(box(0, 14, 0, 6, 1.4, 4.0, c));
            b.push(box(-0.2, 0, 0.3, 5.7, 1.4, 2.4, BUMPER));
            b.push(box(14, 14.2, 0.3, 5.7, 1.4, 2.4, BUMPER));
            lights(b, 14, 6, 2.6, 3.5, 0.4, 1.3);
            //cab
            b.push(box(3.6, 7.8, 0.4, 5.6, 4.0, 7.2, c));
            windows(b, 3.6, 7.8, 0.4, 5.6, 4.5, 6.6, 0.6, [[4.1, 7.2]]);
            //the bed: open at the top, a floor and low walls
            b.push(box(8.2, 14, 0, 0.6, 4.0, 5.2, c));
            b.push(box(8.2, 14, 5.4, 6, 4.0, 5.2, c));
            b.push(box(13.4, 14, 0, 6, 4.0, 5.2, c));
            b.push(box(8.2, 13.4, 0.6, 5.4, 3.6, 4.0, darker(c, 0.35)));
            return b;
        }
    },
    van: {
        length: 13, width: 6.5, speed: 0.9, weight: 3, engine: [1.2, 3.25, 4.2], tailpipe: [13.2, 5.3, 1.1],
        build: function (c) {
            var b = [];
            wheels(b, 13, 6.5, [2.4, 10.6], 1.3);
            b.push(box(0, 2.4, 0, 6.5, 1.3, 4.2, c));
            b.push(box(2.4, 13, 0, 6.5, 1.3, 8.6, c));
            b.push(box(-0.2, 0, 0.3, 6.2, 1.3, 2.3, BUMPER));
            b.push(box(13, 13.2, 0.3, 6.2, 1.3, 2.3, BUMPER));
            lights(b, 13, 6.5, 2.6, 3.5, 0.4, 1.3);
            b.push(box(2.25, 2.4, 0.6, 5.9, 5.2, 7.8, GLASS));
            b.push(box(2.9, 5.2, -0.15, 6.65, 5.2, 7.6, GLASS));
            return b;
        }
    },
    truck: {
        length: 21, width: 7, speed: 0.75, weight: 2, engine: [0, 3.5, 3.2], tailpipe: [21.2, 5.8, 1.2],
        build: function (c) {
            var b = [];
            wheels(b, 21, 7, [2.8, 14.6, 17.8], 1.5);
            //cab
            b.push(box(0, 5.6, 0, 7, 1.5, 9.4, c));
            b.push(box(-0.2, 0, 0.3, 6.7, 1.5, 2.8, BUMPER));
            b.push(box(-0.15, 0, 0.8, 6.2, 5.4, 8.4, GLASS));
            b.push(box(1.0, 4.4, -0.15, 7.15, 5.4, 8.2, GLASS));
            b.push(box(-0.2, 0, 0.4, 1.6, 3.2, 4.2, HEADLIGHT));
            b.push(box(-0.2, 0, 5.4, 6.6, 3.2, 4.2, HEADLIGHT));
            //cargo box
            b.push(box(6.0, 21, 0, 7, 2.2, 11.6, CARGO));
            b.push(box(6.0, 21, -0.1, 7.1, 9.6, 10.6, c));
            b.push(box(5.6, 6.0, 1.0, 6.0, 1.5, 7.0, CHASSIS));
            b.push(box(21, 21.2, 0.4, 1.6, 2.4, 3.4, TAILLIGHT));
            b.push(box(21, 21.2, 5.4, 6.6, 2.4, 3.4, TAILLIGHT));
            return b;
        }
    },
    bus: {
        length: 25, width: 7.5, speed: 0.7, weight: 1, engine: [25.2, 3.75, 4.2], tailpipe: [25.2, 6.3, 1.2],
        build: function (c) {
            var b = [], panes = [], l;
            wheels(b, 25, 7.5, [4.0, 19.5], 1.5);
            b.push(box(0, 25, 0, 7.5, 1.5, 11.4, c));
            //roof, a shade lighter
            b.push(box(0.6, 24.4, 0.6, 6.9, 11.4, 12.0, lighter(c, 0.45)));
            b.push(box(-0.2, 0, 0.3, 7.2, 1.5, 3.0, BUMPER));
            b.push(box(25, 25.2, 0.3, 7.2, 1.5, 3.0, BUMPER));
            lights(b, 25, 7.5, 3.2, 4.2, 0.4, 1.4);
            //a band of windows down each side, a big one front and back
            for (l = 1.4; l + 2.4 <= 24.2; l += 3.1)
                panes.push([l, l + 2.4]);
            windows(b, 0, 25, 0, 7.5, 5.6, 9.8, 0.5, panes);
            //a stripe under them
            b.push(box(0.2, 24.8, -0.1, 7.6, 4.0, 4.8, lighter(c, 0.7)));
            return b;
        }
    }
};

//the four ways a vehicle drives, and where its own frame lies in the world
var DIRECTIONS = {
    "x+": {alongX: true, forward: true},
    "x-": {alongX: true, forward: false},
    "y+": {alongX: false, forward: true},
    "y-": {alongX: false, forward: false}
};

/**
 * The boxes in world axes, for a vehicle of this length and width going that
 * way with its middle at the origin. Its front is at the end it is going to;
 * its left side is to the left of the way it is going.
 */
function place(boxes, length, width, dir) {
    return boxes.map(function (b) {
        //along the way it goes, front first
        var a0 = dir.forward ? length / 2 - b.l1 : b.l0 - length / 2,
            a1 = dir.forward ? length / 2 - b.l0 : b.l1 - length / 2,
            //across: left of +x is +y, left of +y is -x
            c0, c1;

        if (dir.alongX !== dir.forward) {
            c0 = b.w0 - width / 2;
            c1 = b.w1 - width / 2;
        } else {
            c0 = width / 2 - b.w1;
            c1 = width / 2 - b.w0;
        }

        return dir.alongX ?
            {x0: a0, x1: a1, y0: c0, y1: c1, z0: b.z0, z1: b.z1, color: b.color} :
            {x0: c0, x1: c1, y0: a0, y1: a1, z0: b.z0, z1: b.z1, color: b.color};
    });
}

//a tile is this many units along the ground, and a step up of the land this
//many pixels on the screen
var TILE = 32,
    STEP = 8;

/**
 * Where a point in the vehicle's own frame is when it goes that way: off its
 * middle on the ground, [x, z, y] - along the ground in tiles, up in steps of
 * the land, the way a building gives where its chimney smokes.
 */
function placePoint(p, length, width, dir) {
    var b = place([box(p[0], p[0], p[1], p[1], p[2], p[2])], length, width, dir)[0];

    return [round(b.x0 / TILE), round(b.z0 / STEP), round(b.y0 / TILE)];
}

function round(v) {
    //no "-0" in the data
    return Math.round(v * 1000) / 1000 || 0;
}

//where a point in the world lands on the screen, the origin at 0, 0
function project(x, y, z) {
    return [x - y, -(x + y) / 2 - z];
}

//a face looking up is lit the most, one looking down and to the left (-x)
//less, down and to the right (-y) the least
function shade(color, face) {
    if (face === 2)
        return lighter(color, 0.22);
    else if (face === 0)
        return darker(color, 0.1);
    else
        return darker(color, 0.3);
}

/**
 * The first box a ray through that point on the screen hits, with the face it
 * goes in through. The ray comes from in front, above, and goes along
 * (1, 1, -1), which is what every point that lands on the same pixel lies on.
 */
function cast(boxes, sx, sy) {
    //a point on the ray, well in front of everything
    var y = -100,
        x = y + sx,
        z = -(x + y) / 2 - sy,
        best = Infinity, hit = null, face = -1,
        i, b, tx0, tx1, ty0, ty1, tz0, tz1, tin, tout, f;

    for (i = 0; i < boxes.length; i++) {
        b = boxes[i];
        tx0 = b.x0 - x; tx1 = b.x1 - x;
        ty0 = b.y0 - y; ty1 = b.y1 - y;
        //z goes down along the ray
        tz0 = z - b.z1; tz1 = z - b.z0;

        tin = tx0; f = 0;
        if (ty0 > tin) { tin = ty0; f = 1; }
        if (tz0 > tin) { tin = tz0; f = 2; }
        tout = Math.min(tx1, ty1, tz1);

        if (tin < tout && tin < best) {
            best = tin;
            hit = b;
            face = f;
        }
    }

    return hit === null ? null : shade(hit.color, face);
}

function render(boxes) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity,
        corners, i, j, p, w, h, pixels, color;

    boxes.forEach(function (b) {
        corners = [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x0, b.y1, b.z0], [b.x1, b.y1, b.z0],
            [b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x0, b.y1, b.z1], [b.x1, b.y1, b.z1]];

        corners.forEach(function (c) {
            p = project(c[0], c[1], c[2]);
            minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
            minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
        });
    });

    minX = Math.floor(minX); minY = Math.floor(minY);
    w = Math.ceil(maxX) - minX;
    h = Math.ceil(maxY) - minY;
    pixels = [];

    for (j = 0; j < h; j++) {
        for (i = 0; i < w; i++) {
            color = cast(boxes, minX + i + 0.5, minY + j + 0.5);
            pixels.push(color);
        }
    }

    outline(pixels, w, h);

    return {w: w, h: h, pixels: pixels, pivotX: -minX, pivotY: -minY};
}

//darkens the pixels along the edge of the picture a little, so a vehicle
//stands out against a road of about its own darkness - all but the top
//edge, which the light falls on
function outline(pixels, w, h) {
    var edge = [], i, j, k;

    function empty(i, j) {
        return i < 0 || j < 0 || i >= w || j >= h || pixels[j * w + i] === null;
    }

    for (j = 0; j < h; j++) {
        for (i = 0; i < w; i++) {
            k = j * w + i;
            if (pixels[k] !== null && !empty(i, j - 1) && (empty(i - 1, j) || empty(i + 1, j) || empty(i, j + 1)))
                edge.push(k);
        }
    }

    edge.forEach(function (k) {
        pixels[k] = darker(pixels[k], 0.3);
    });
}

var GAP = 1,
    frames = [],
    data = {},
    sheetW = 0,
    sheetH = 0;

//a row for every body type: each colour, each direction
Object.keys(TYPES).forEach(function (type) {
    var t = TYPES[type], rowH = 0, x = 0;

    data[type] = {speed: t.speed, weight: t.weight, colors: {}};

    Object.keys(COLORS).forEach(function (color) {
        var boxes = t.build(COLORS[color]);

        data[type].colors[color] = {};

        Object.keys(DIRECTIONS).forEach(function (d) {
            var picture = render(place(boxes, t.length, t.width, DIRECTIONS[d])),
                engine = placePoint(t.engine, t.length, t.width, DIRECTIONS[d]),
                tailpipe = placePoint(t.tailpipe, t.length, t.width, DIRECTIONS[d]);

            frames.push({picture: picture, x: x, y: sheetH});
            data[type].colors[color][d] = [x, sheetH, picture.w, picture.h, picture.pivotX, picture.pivotY]
                .concat(engine, tailpipe);

            x += picture.w + GAP;
            rowH = Math.max(rowH, picture.h);
        });
    });

    sheetW = Math.max(sheetW, x);
    sheetH += rowH + GAP;
});

var sheet = new PNG({width: sheetW, height: sheetH});

frames.forEach(function (f) {
    var p = f.picture, i, j, c, k;

    for (j = 0; j < p.h; j++) {
        for (i = 0; i < p.w; i++) {
            c = p.pixels[j * p.w + i];
            if (c === null)
                continue;

            k = ((f.y + j) * sheetW + f.x + i) * 4;
            sheet.data[k] = Math.round(c[0]);
            sheet.data[k + 1] = Math.round(c[1]);
            sheet.data[k + 2] = Math.round(c[2]);
            sheet.data[k + 3] = 255;
        }
    }
});

fs.mkdirSync(path.dirname(OUT_IMAGE), {recursive: true});
fs.writeFileSync(OUT_IMAGE, PNG.sync.write(sheet));

fs.writeFileSync(OUT_DATA,
    "//Generated by tools/genvehicles.js - change that and run it again instead.\n" +
    "//\n" +
    "//Every body type, with how fast it drives next to a car (1) and how often it\n" +
    "//turns up next to the others; for each colour and each way it drives\n" +
    "//(x+, x-, y+, y-) where its picture is in the image and where smoke comes out:\n" +
    "//[x, y, width, height, pivotX, pivotY, engineX, engineZ, engineY, tailpipeX,\n" +
    "//tailpipeZ, tailpipeY], the pivot being its middle on the ground. The tailpipe\n" +
    "//puffs as it drives, the engine smokes when it breaks down; each is off that\n" +
    "//middle along x, up and along y - in tiles and steps of the land, like a\n" +
    "//building's smokeSource.\n" +
    "export default {\n" +
    "    image: " + JSON.stringify(IMAGE) + ",\n" +
    "    types: " + JSON.stringify(data, null, 4).replace(/\n/g, "\n    ").replace(/\[\s+([^\]]*?)\s+\]/g, function (m, inner) {
        return "[" + inner.replace(/\s+/g, " ") + "]";
    }) + "\n" +
    "};\n");

console.log("wrote " + path.relative(ROOT, OUT_IMAGE) + " (" + sheetW + "x" + sheetH + ") and " + path.relative(ROOT, OUT_DATA));
