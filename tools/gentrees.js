/**
 * Paints the trees the world grows besides the broadleaf ones there are: the
 * pines of the northern forests, in two shapes, each snowed over as well for
 * where the snow comes down among them; and for the savannah its baobabs and
 * the dead trees standing about it, two of each.
 *
 * They are not drawn flat, but modelled - a pine as a trunk and a stack of
 * cones, ragged at the rims and lumpy with needles; a baobab as a trunk like
 * a bottle, creased, with thick branches spread round the top of it and
 * tufts of leaves at their ends; a dead tree as a trunk and bare branches -
 * and looked at the way the game looks at everything: from 30 degrees above,
 * so that anything round on the ground is twice as wide as it is deep, the
 * way the tiles are. Every pixel of the picture is a ray going into it, lit
 * where it meets the tree by light from the right, as the trees in the
 * spritesheet are, darker in the hollows, and with a pixel's worth of noise
 * in the colour. Snow lies on whatever faces up. The shadow on the ground is
 * the tree's own, cast down and to the left, black and as see-through as the
 * other trees' shadows are.
 *
 * Every picture is 64 by 64, the tree standing on the same spot of it as the
 * broadleaf ones, (34, 53). No two runs differ.
 *
 * Usage:
 *   node tools/gentrees.js [outDir]
 *
 * Writes <name>.png for every tree to outDir, src/public/gfx/trees unless
 * given - which the game finds them in as trees/<name>.png.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "src/public/gfx/trees");

var SIZE = 64;
//where on the picture the foot of the tree is
var PIVOT = [34, 53];

//the world is x to the right, y up and z towards whoever is looking, a unit
//a pixel across. The eye looks down at 30 degrees: along VIEW, with UP the
//way up the picture
var VIEW = [0, -0.5, -Math.sqrt(3) / 2];
var UP = [0, Math.sqrt(3) / 2, -0.5];
//the light the trees are lit by, from the right and above, and the one their
//shadows are cast by - down and to the left, and towards the eye a little
var LIGHT = normalize([0.8, 0.6, 0.25]);
var SHADOW_LIGHT = normalize([1, 2.6, -0.5]);
var SHADOW = 0.2;

function normalize(v) {
    var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

    return [v[0] / l, v[1] / l, v[2] / l];
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

function mix(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

//a colour from dark to light along the stops
function ramp(stops, t) {
    t = clamp(t, 0, 1);

    var at = t * (stops.length - 1),
        i = Math.min(stops.length - 2, Math.floor(at));

    return mix(stops[i], stops[i + 1], at - i);
}

//0..1, the same for the same numbers
function hash(x, y, z) {
    var h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(z | 0, 0x9e3779b1);

    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

//smooth noise, 0..1, a blob every unit
function noise(x, y, z) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z),
        fx = x - ix, fy = y - iy, fz = z - iz,
        u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);

    function at(dx, dy, dz) {
        return hash(ix + dx, iy + dy, iz + dz);
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    return lerp(
        lerp(lerp(at(0, 0, 0), at(1, 0, 0), u), lerp(at(0, 1, 0), at(1, 1, 0), u), v),
        lerp(lerp(at(0, 0, 1), at(1, 0, 1), u), lerp(at(0, 1, 1), at(1, 1, 1), u), v),
        w);
}

/* --- Shapes: how far a point is from them, less than 0 inside ---------- */

//a limb from a to b, as thick as ra at a and rb at b
function limb(p, a, b, ra, rb) {
    var ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
        ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]],
        t = clamp(dot(ap, ab) / dot(ab, ab), 0, 1),
        dx = ap[0] - ab[0] * t,
        dy = ap[1] - ab[1] * t,
        dz = ap[2] - ab[2] * t;

    return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}

/**
 * A shape turned round the upright through the foot: the outline it has
 * seen side on, as [out from the middle, up] corners, at distance q out and
 * y up. Near the middle of it this is less than the way to the surface,
 * which is all the ray needs.
 */
function turned(outline, q, y) {
    var n = outline.length,
        d = Infinity,
        s = 1;

    for (var i = 0, j = n - 1; i < n; j = i++) {
        var vi = outline[i],
            vj = outline[j],
            ex = vj[0] - vi[0],
            ey = vj[1] - vi[1],
            wx = q - vi[0],
            wy = y - vi[1],
            t = clamp((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1),
            bx = wx - ex * t,
            by = wy - ey * t;

        d = Math.min(d, bx * bx + by * by);

        var c1 = y >= vi[1],
            c2 = y < vj[1],
            c3 = ex * wy > ey * wx;

        if ((c1 && c2 && c3) || (!c1 && !c2 && !c3))
            s = -s;
    }

    return s * Math.sqrt(d);
}

/* --- The trees --------------------------------------------------------- */

//A tree to paint: shape(p) is how far p is from it, and sets part to which
//part of it is nearest; colour(part, p, normal, light, grain) is what it
//looks like there, lit that much, grain -1..1 a pixel's worth of noise

var PINE = [[12, 36, 24], [20, 58, 32], [32, 84, 42], [52, 112, 54], [84, 144, 74]];
var SPRUCE = [[10, 34, 32], [18, 54, 44], [28, 78, 56], [46, 104, 72], [76, 134, 96]];
var TRUNK = [[48, 32, 22], [72, 48, 30], [100, 70, 44]];
var SNOW = [[150, 168, 196], [196, 210, 230], [236, 242, 250], [252, 253, 255]];

/**
 * A pine: a trunk, and tiers stacked on it, broad at the bottom and smaller
 * and smaller to the top - each a cone as steep as the others, with a ragged
 * rim standing out over the tier below, hollow a little underneath, its
 * needles lumpy.
 *
 * @param o {{tiers: number, height: number, radius: number, trunk: number, leaf: number[][], snow: boolean, seed: number}}
 */
function pine(o) {
    var tiers = [],
        radii = [],
        heights = [],
        k;

    for (k = 0; k < o.tiers; k++) {
        radii.push(o.radius * (1 - k / (o.tiers + 0.5)));
        heights.push(radii[k] * 1.15 + 1.5);
    }

    for (k = 0; k < o.tiers; k++) {
        var base = o.trunk + k * (o.height - heights[o.tiers - 1] - o.trunk) / (o.tiers - 1),
            top = base + heights[k],
            radius = radii[k];

        tiers.push([[0, top], [radius, base - 0.8], [radius * 0.6, base + heights[k] * 0.22], [0, base + heights[k] * 0.4]]);
    }

    var tree = {part: null};

    tree.shape = function (p) {
        var q = Math.sqrt(p[0] * p[0] + p[2] * p[2]),
            //which way round the tree, for the rims to be ragged by
            cx = q > 0 ? p[0] / q : 1,
            cz = q > 0 ? p[2] / q : 0,
            trunk = limb(p, [0, -1, 0], [0, o.height * 0.8, 0], 1.2, 0.6),
            leaves = Infinity;

        for (var k = 0; k < tiers.length; k++) {
            var rag = 1 + 0.16 * (noise(cx * 3 + k * 7.3, cz * 3, o.seed) - 0.5)
                + 0.1 * (noise(cx * 9, cz * 9 + k * 3.1, o.seed) - 0.5);

            leaves = Math.min(leaves, turned(tiers[k], q / rag, p[1]));
        }

        //lumpy with tufts of needles
        leaves += 0.9 * (noise(p[0] * 0.55, p[1] * 0.55, p[2] * 0.55 + o.seed) - 0.5);

        tree.part = leaves < trunk ? "leaves" : "trunk";

        return Math.min(leaves, trunk);
    };

    tree.colour = function (part, p, n, light, grain) {
        if (part === "trunk")
            return ramp(TRUNK, 0.15 + 0.8 * light + grain * 0.1);

        //in clumps on whatever faces up
        if (o.snow && n[1] + 0.5 * (noise(p[0] * 0.3, p[1] * 0.3, p[2] * 0.3 + 9) - 0.5) > 0.56)
            return ramp(SNOW, 0.1 + 0.9 * light + grain * 0.06);

        var tuft = noise(p[0] * 0.35, p[1] * 0.35, p[2] * 0.35 + o.seed * 3) - 0.5,
            colour = ramp(o.leaf, 0.08 + 0.85 * light + 0.35 * tuft + grain * 0.12);

        //what shows of the needles under snow is frosted over
        return o.snow ? mix(colour, SNOW[1], 0.18) : colour;
    };

    return tree;
}

var BAOBAB_BARK = [[92, 78, 66], [128, 110, 92], [162, 142, 120], [192, 172, 146]];
var BAOBAB_LEAF = [[52, 66, 28], [80, 96, 40], [112, 126, 58], [140, 152, 80]];

/**
 * A baobab: a trunk like a bottle, swollen low down and creased up its
 * length, and at the top of it short thick branches spread out all round,
 * like roots in the air, with a tuft of leaves at the end of each.
 *
 * @param o {{height: number, girth: number, branches: number, reach: number, seed: number}}
 */
function baobab(o) {
    var outline = [[0, -1], [o.girth * 1.05, -1], [o.girth * 1.12, o.height * 0.3], [o.girth * 0.92, o.height * 0.75],
            [o.girth * 0.7, o.height], [0, o.height + 0.5]],
        top = [0, o.height - 0.5, 0],
        branches = [];

    for (var i = 0; i < o.branches; i++) {
        var a = 2 * Math.PI * (i + 0.35 * hash(i, 1, o.seed)) / o.branches,
            rise = 0.55 + 0.35 * hash(i, 2, o.seed),
            reach = o.reach * (0.75 + 0.25 * hash(i, 3, o.seed)),
            dir = normalize([Math.cos(a), rise, Math.sin(a)]);

        branches.push({from: top, to: [dir[0] * reach, top[1] + dir[1] * reach, dir[2] * reach]});
    }

    var tree = {part: null};

    tree.shape = function (p) {
        var q = Math.sqrt(p[0] * p[0] + p[2] * p[2]),
            angle = Math.atan2(p[2], p[0]),
            //creased up its length
            crease = 1 - 0.06 * Math.abs(Math.sin(angle * 4 + p[1] * 0.1)),
            wood = turned(outline, q / crease, p[1]),
            leaves = Infinity;

        branches.forEach(function (b) {
            wood = Math.min(wood, limb(p, b.from, b.to, 1.6, 0.6));

            //a flat tuft sitting on the end of it
            var dx = p[0] - b.to[0],
                dy = (p[1] - b.to[1] - 0.8) / 0.5,
                dz = p[2] - b.to[2];

            leaves = Math.min(leaves, Math.sqrt(dx * dx + dy * dy + dz * dz) * 0.5 - 1.6);
        });

        leaves += 0.8 * (noise(p[0] * 0.8, p[1] * 0.8, p[2] * 0.8 + o.seed) - 0.5);

        tree.part = leaves < wood ? "leaves" : "wood";

        return Math.min(wood, leaves);
    };

    tree.colour = function (part, p, n, light, grain) {
        if (part === "wood")
            return ramp(BAOBAB_BARK, 0.1 + 0.85 * light + grain * 0.08);

        return ramp(BAOBAB_LEAF, 0.05 + 0.85 * light + 0.3 * (noise(p[0] * 0.5, p[1] * 0.5, p[2] * 0.5) - 0.5) + grain * 0.1);
    };

    return tree;
}

var DEAD_BARK = [[70, 60, 52], [104, 92, 78], [140, 126, 108], [168, 154, 134]];

/**
 * A dead tree, dried out and bare: a trunk, and the branches it has left
 * reaching out round it, forking at their ends - or, broken off, a snag and
 * a stub.
 *
 * @param o {{height: number, girth: number, lean: number[], broken: boolean, branches: number[][], seed: number}}
 *        branches: [how far up, which way round, how far out, how steep]
 */
function deadTree(o) {
    var top = [o.lean[0], o.height, o.lean[1]],
        limbs = [{from: [0, -1, 0], to: top, ra: o.girth, rb: o.girth * (o.broken ? 0.75 : 0.3)}];

    o.branches.forEach(function (b, i) {
        var from = [top[0] * b[0], o.height * b[0], top[2] * b[0]],
            dir = normalize([Math.cos(b[1]), b[3], Math.sin(b[1])]),
            to = [from[0] + dir[0] * b[2], from[1] + dir[1] * b[2], from[2] + dir[2] * b[2]];

        limbs.push({from: from, to: to, ra: 0.9, rb: 0.45});

        //and forking at the end
        [-0.7, 0.8].forEach(function (turn, j) {
            if (j === 1 && hash(i, 7, o.seed) > 0.7)
                return;

            var fd = normalize([Math.cos(b[1] + turn), b[3] + 0.6, Math.sin(b[1] + turn)]);

            limbs.push({from: to, to: [to[0] + fd[0] * 3.5, to[1] + fd[1] * 3.5, to[2] + fd[2] * 3.5], ra: 0.45, rb: 0.35});
        });
    });

    var tree = {part: "wood"};

    tree.shape = function (p) {
        var d = Infinity;

        limbs.forEach(function (l) {
            d = Math.min(d, limb(p, l.from, l.to, l.ra, l.rb));
        });

        //a broken one ends in splinters
        if (o.broken && p[1] > o.height - 2)
            d += 0.8 * noise(p[0] * 1.5, p[1] * 1.5, p[2] * 1.5 + o.seed);

        return d;
    };

    tree.colour = function (part, p, n, light, grain) {
        return ramp(DEAD_BARK, 0.08 + 0.85 * light + 0.15 * (noise(p[0], p[1] * 0.3, p[2]) - 0.5) + grain * 0.1);
    };

    return tree;
}

/* --- Painting --------------------------------------------------------- */

//how far along a ray it first meets the tree, or -1
function march(tree, origin, dir, far) {
    var t = 0;

    for (var i = 0; i < 400 && t < far; i++) {
        var p = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t],
            d = tree.shape(p);

        if (d < 0.02)
            return t;

        //the shapes are lumpy, so they are stepped into carefully
        t += Math.max(0.03, d * 0.6);
    }

    return -1;
}

function normalAt(tree, p) {
    var e = 0.25;

    return normalize([
        tree.shape([p[0] + e, p[1], p[2]]) - tree.shape([p[0] - e, p[1], p[2]]),
        tree.shape([p[0], p[1] + e, p[2]]) - tree.shape([p[0], p[1] - e, p[2]]),
        tree.shape([p[0], p[1], p[2] + e]) - tree.shape([p[0], p[1], p[2] - e])
    ]);
}

//how much of the open sky a point sees - less deep in among the branches
function openness(tree, p, n) {
    var shade = 0;

    for (var i = 1; i <= 4; i++) {
        var h = i * 0.9;

        shade += (h - tree.shape([p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h])) / Math.pow(2, i);
    }

    return clamp(1 - 0.5 * shade, 0.15, 1);
}

/**
 * The picture of a tree: a ray for every pixel, from the eye's side of the
 * tree along VIEW, which either meets the tree, and is painted as it is lit
 * there, or the ground, and is shadow if the tree stands between that bit of
 * ground and the light.
 */
function paint(tree, seed) {
    var image = new PNG({width: SIZE, height: SIZE}),
        back = 80;

    for (var py = 0; py < SIZE; py++) {
        for (var px = 0; px < SIZE; px++) {
            var sx = px + 0.5 - PIVOT[0],
                sy = PIVOT[1] - (py + 0.5),
                origin = [sx - VIEW[0] * back + UP[0] * sy, UP[1] * sy - VIEW[1] * back, UP[2] * sy - VIEW[2] * back],
                ground = origin[1] / -VIEW[1],
                t = march(tree, origin, VIEW, ground),
                k = (py * SIZE + px) * 4,
                colour, alpha;

            if (t >= 0) {
                var p = [origin[0] + VIEW[0] * t, origin[1] + VIEW[1] * t, origin[2] + VIEW[2] * t];

                tree.shape(p);

                var part = tree.part,
                    n = normalAt(tree, p),
                    light = (0.22 + 0.9 * Math.max(0, dot(n, LIGHT))) * openness(tree, p, n);

                colour = tree.colour(part, p, n, light, 2 * hash(px, py, seed) - 1);
                alpha = 255;
            } else {
                //the ground, in the tree's shadow or not
                var g = [origin[0] + VIEW[0] * ground, 0, origin[2] + VIEW[2] * ground];

                if (march(tree, [g[0], 0.3, g[2]], SHADOW_LIGHT, 80) < 0)
                    continue;

                colour = [0, 0, 0];
                alpha = Math.round(SHADOW * 255);
            }

            for (var c = 0; c < 3; c++)
                image.data[k + c] = Math.round(clamp(colour[c], 0, 255));
            image.data[k + 3] = alpha;
        }
    }

    return image;
}

var TREES = {
    "pine1": function () {
        return paint(pine({tiers: 5, height: 46, radius: 12, trunk: 4, leaf: PINE, snow: false, seed: 1}), 1);
    },
    "pine2": function () {
        return paint(pine({tiers: 4, height: 38, radius: 14, trunk: 3, leaf: SPRUCE, snow: false, seed: 2}), 2);
    },
    "pine1-snow": function () {
        return paint(pine({tiers: 5, height: 46, radius: 12, trunk: 4, leaf: PINE, snow: true, seed: 1}), 1);
    },
    "pine2-snow": function () {
        return paint(pine({tiers: 4, height: 38, radius: 14, trunk: 3, leaf: SPRUCE, snow: true, seed: 2}), 2);
    },
    "baobab1": function () {
        return paint(baobab({height: 24, girth: 6, branches: 7, reach: 12, seed: 3}), 3);
    },
    "baobab2": function () {
        return paint(baobab({height: 19, girth: 5, branches: 6, reach: 10, seed: 4}), 4);
    },
    "deadtree1": function () {
        return paint(deadTree({height: 30, girth: 1.6, lean: [1.5, 0.5], broken: false, seed: 5,
            branches: [[0.45, 2.6, 9, 0.8], [0.62, 0.3, 10, 0.6], [0.8, 4.2, 7, 1.1], [0.7, 1.4, 6, 0.9]]}), 5);
    },
    "deadtree2": function () {
        return paint(deadTree({height: 14, girth: 2.2, lean: [0.3, 0], broken: true, seed: 6,
            branches: [[0.6, 0.4, 7, 0.5]]}), 6);
    }
};

function main() {
    var out = path.resolve(process.argv[2] || DEFAULT_OUT);

    fs.mkdirSync(out, {recursive: true});

    Object.keys(TREES).forEach(function (name) {
        fs.writeFileSync(path.join(out, name + ".png"), PNG.sync.write(TREES[name]()));
    });

    console.log("Wrote " + Object.keys(TREES).length + " trees to " + path.relative(process.cwd(), out));
}

main();
