/**
 * Traces the outline of a set of tiles.
 *
 * Every tile offers its four edges, and an edge that two tiles share cancels
 * out - what is left is the perimeter. Those edges are then walked into closed
 * rings: one per piece, plus one per hole, so a set in two halves or with a
 * bite out of the middle comes back as several rings rather than one impossible
 * shape.
 *
 * Walking has a choice to make wherever two tiles meet at nothing but a corner,
 * and it always turns the same way - which reads that pinch as two shapes
 * touching rather than one shape crossing itself.
 *
 * Points follow the terrain's grid points, so an outline rides over hills
 * instead of cutting through them, and every line is drawn a little way inside
 * its own area - two areas that share a border then show two lines side by
 * side instead of one on top of the other.
 *
 * This is how the city limits, the blocks of land for sale and a water tower's
 * reach are all drawn: one continuous line around "these tiles, together",
 * rather than a grid of per tile hilites.
 */
import Core from "core/main";
import Config from "./config";

var Terrain = Core.Terrain;

//+x, +y, -x, -y
var DIRECTIONS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

//how far inside its own edge a line is drawn, in world units - a tile is about
//45 of them across, so this is a hair's breadth on the ground and just enough
//to keep two borders apart
export var PADDING = 2.5;

//which way to go on at a vertex, relative to the way we came in: turn, then
//straight on, then the other turn, and only then back the way we came
var PREFERENCE = [1, 0, 3, 2];

/**
 * @param tiles {number[]} tile indexes
 * @param terrain {Terrain} core terrain, for grid point heights
 * @param [padding] {number} how far inside the edge to draw, in world units
 * @returns {Array[]} one array of [x, y, z] points per closed ring
 */
export function outline(tiles, terrain, padding) {
    return points(simplify(rings(edges(tiles))), terrain,
        padding === undefined ? PADDING : padding);
}

/**
 * The perimeter edges, as outgoing edges per grid point.
 */
function edges(tiles) {
    var yUnit = Terrain.convertToIndex(0, 1),
        out = {},
        byKey = {},
        seen = {},
        tile, a, b, c, d, i;

    function add(from, to) {
        var back = byKey[to + ":" + from];

        //the tile on the other side claims this edge the other way round, so
        //it is an inside edge and neither of them keeps it
        if (back !== undefined && !back.cancelled) {
            back.cancelled = true;
            return;
        }

        var key = from + ":" + to;

        if (byKey[key] !== undefined && !byKey[key].cancelled)
            return;

        var edge = {from: from, to: to, used: false, cancelled: false};

        byKey[key] = edge;
        (out[from] = out[from] || []).push(edge);
    }

    for (i = 0; i < tiles.length; i++) {
        tile = parseInt(tiles[i], 10);

        //the same tile twice would offer its edges twice, and the second lot
        //would put back the very edges the first lot cancelled
        if (seen[tile] === true)
            continue;

        seen[tile] = true;

        a = tile;               // x,     y
        b = tile + 1;           // x + 1, y
        c = tile + yUnit + 1;   // x + 1, y + 1
        d = tile + yUnit;       // x,     y + 1

        add(a, b);
        add(b, c);
        add(c, d);
        add(d, a);
    }

    return out;
}

/**
 * Walks the edges into closed rings.
 */
function rings(out) {
    var paths = [], point, edge, path, i;

    for (point in out) {
        for (i = 0; i < out[point].length; i++) {
            edge = out[point][i];

            if (edge.used || edge.cancelled)
                continue;

            path = [];

            while (edge !== null && !edge.used) {
                edge.used = true;
                path.push(edge.from);
                edge = onwards(out, edge);
            }

            paths.push(path);
        }
    }

    return paths;
}

function onwards(out, edge) {
    var at = out[edge.to] || [],
        came = direction(edge.from, edge.to),
        want, next, i, j;

    for (i = 0; i < PREFERENCE.length; i++) {
        want = DIRECTIONS[(came + PREFERENCE[i]) % 4];

        for (j = 0; j < at.length; j++) {
            next = at[j];

            if (next.used || next.cancelled)
                continue;

            if (Terrain.extractX(next.to) - Terrain.extractX(next.from) === want[0] &&
                    Terrain.extractY(next.to) - Terrain.extractY(next.from) === want[1])
                return next;
        }
    }

    return null;
}

function direction(from, to) {
    var dx = Terrain.extractX(to) - Terrain.extractX(from),
        dy = Terrain.extractY(to) - Terrain.extractY(from);

    for (var i = 0; i < DIRECTIONS.length; i++) {
        if (DIRECTIONS[i][0] === dx && DIRECTIONS[i][1] === dy)
            return i;
    }

    return 0;
}

/**
 * Drops the points that sit in the middle of a straight run.
 */
function simplify(paths) {
    for (var i = 0; i < paths.length; i++) {
        var path = paths[i],
            kept = [],
            prev, curr, next, j;

        for (j = 0; j < path.length; j++) {
            curr = path[j];
            //a ring closes back on itself, so the first and last points have
            //neighbours too
            prev = path[(j - 1 + path.length) % path.length];
            next = path[(j + 1) % path.length];

            if (path.length > 2 && straight(prev, curr, next))
                continue;

            kept.push(curr);
        }

        paths[i] = kept;
    }

    return paths;
}

function straight(prev, curr, next) {
    var px = Terrain.extractX(prev), py = Terrain.extractY(prev),
        cx = Terrain.extractX(curr), cy = Terrain.extractY(curr),
        nx = Terrain.extractX(next), ny = Terrain.extractY(next);

    return (px === cx && cx === nx) || (py === cy && cy === ny);
}

function points(paths, terrain, padding) {
    var ts = Config.tileSize,
        zStep = Config.tileZStep,
        out = [],
        path, ring, tile, inset, x, y, z, i, j;

    for (i = 0; i < paths.length; i++) {
        path = paths[i];
        ring = [];

        for (j = 0; j < path.length; j++) {
            tile = path[j];
            x = Terrain.extractX(tile);
            y = Terrain.extractY(tile);
            //everything below zero is sea bed, and the water is drawn flat at
            //zero - so an outline rides the waves rather than diving into the
            //bay
            z = Math.max(terrain.getGridPointHeight(x, y), 0);

            inset = corner(path, j, padding);

            ring.push(new Float32Array([
                x * ts - ts / 2 + inset[0],
                z * zStep,
                y * ts - ts / 2 + inset[1]
            ]));
        }

        out.push(ring);
    }

    return out;
}

/**
 * How far to pull a corner in so that the whole ring sits inside its own edge.
 *
 * The two edges meeting here are at right angles - a straight run has had its
 * middle points dropped by now - so one of them says how far to come in along
 * x and the other how far along y. Which side is the inside follows from the
 * way the ring is wound, and a hole is wound the other way round, so the same
 * sum pulls it towards the ground it encloses.
 */
function corner(path, at, padding) {
    var prev = path[(at - 1 + path.length) % path.length],
        curr = path[at],
        next = path[(at + 1) % path.length],
        incoming = inward(prev, curr),
        outgoing = inward(curr, next);

    return [
        (incoming[0] + outgoing[0]) * padding,
        (incoming[1] + outgoing[1]) * padding
    ];
}

/**
 * The way the enclosed ground lies from an edge running from one point to the
 * next: a quarter turn from the direction of travel.
 */
function inward(from, to) {
    var dx = Terrain.extractX(to) - Terrain.extractX(from),
        dy = Terrain.extractY(to) - Terrain.extractY(from);

    return [-dy, dx];
}

export default outline;
