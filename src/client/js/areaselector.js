/**
 * Picks tiles without taking the map away from the player - any shape of them,
 * made of whole footprints of what is being placed (single tiles for roads and
 * for shaping the ground).
 *
 * The selection starts out on the tile in the middle of the screen, and stays
 * put while the map is panned - a drag anywhere else still pans it, and a tap
 * on a building still shows what it is doing, so the spot can be looked for
 * with the selection already up. On a phone there is no cursor to follow and
 * no telling a pan from a pick until the finger moves, so the selection is
 * never drawn out by dragging:
 *
 *  - dragging the selection moves it, held by the tile it was grabbed at, so
 *    it follows the finger rather than jumping under it
 *  - tapping bare ground puts it there instead, back down to one footprint
 *  - the tiles around it are handles, each with an arrow pointing the way it
 *    resizes. One off the end of a row or a column pulls that row or column
 *    alone, out or in - and pulled in past its other end, on out that way, no
 *    lifting the finger to turn round. So the selection takes any shape, as
 *    long as it stays in one piece: pulled in, a row or a column stops at the
 *    footprint that would cut the rest off
 *  - where more than one row or column ends at the same tile - inside a U, in
 *    the crook of an L - the handle there is a square, and pulls whichever of
 *    them the finger goes along
 *  - while it is a whole rectangle, there is a handle off each of its corners
 *    as well, a square too, that pulls both of the sides meeting there the
 *    same way. Any other shape has no corners to pull
 *
 * It turns round along with the buildings on it - see AreaSelector#rotate.
 */
import RenderLayer from "./renderlayer";
import Config from "./config";
import WorldCamera from "./components/camerascript";
import Events from "events";
import Core from "core/main";

var Terrain = Core.Terrain;

var MOVE = 1,
    RESIZE = 2;

/**
 * The ground tile at a point on screen, and whether a building being placed
 * was hit there - picking hands back anything it can hit, the see-through
 * preview of what is about to be built included.
 */
function pick(me, screenX, screenY) {
    var gos = me._cam.pickGameObject(screenX, screenY),
        r = {tile: -1, preview: false},
        sprite;

    for (var i = 0; i < gos.length; i++) {
        //text - a city's name, a "no water" over a house - has no sprite to
        //read a layer off
        sprite = gos[i].spriteRenderer;

        if (sprite === undefined)
            continue;

        if (sprite.layer === RenderLayer.previewLayer)
            r.preview = true;
        else if (r.tile === -1 && sprite.layer === RenderLayer.groundLayer)
            r.tile = me._terrain.getCoordinates(gos[i]);
    }

    return r;
}

/**
 * The tile in the middle of the screen, which is where the camera looks at
 * the ground - worked out from where the camera is when nothing is drawn
 * there to pick.
 */
function centerTile(me) {
    var cam = me._cam,
        viewport = cam.gameObject.camera.viewport,
        tile = viewport === null ? -1 : pick(me, viewport.width / 2, viewport.height / 2).tile,
        pos;

    if (tile !== -1)
        return tile;

    pos = cam.gameObject.transform.getPosition();

    return Terrain.convertToIndex(
        Math.round(pos[0] / Config.tileSize),
        Math.round(pos[2] / Config.tileSize));
}

function key(i, j) {
    return i + "," + j;
}

function has(cells, i, j) {
    return cells[key(i, j)] !== undefined;
}

function add(cells, i, j) {
    cells[key(i, j)] = [i, j];
}

function copy(cells) {
    var r = {}, k;

    for (k in cells)
        r[k] = cells[k];

    return r;
}

/**
 * Every footprint in the selection, as its column and row, row after row -
 * the order a build of it goes through them.
 */
function cellList(cells) {
    var r = [], k;

    for (k in cells)
        r.push(cells[k]);

    return r.sort(function (a, b) {
        return a[1] - b[1] || a[0] - b[0];
    });
}

/**
 * The least and greatest column and row there are footprints in.
 */
function cellBounds(cells) {
    var r = {i0: Infinity, j0: Infinity, i1: -Infinity, j1: -Infinity},
        k, cell;

    for (k in cells) {
        cell = cells[k];
        r.i0 = Math.min(r.i0, cell[0]);
        r.i1 = Math.max(r.i1, cell[0]);
        r.j0 = Math.min(r.j0, cell[1]);
        r.j1 = Math.max(r.j1, cell[1]);
    }

    return r;
}

/**
 * Whether the footprints fill the whole rectangle they span.
 */
function isRect(cells) {
    var b = cellBounds(cells);

    return Object.keys(cells).length === (b.i1 - b.i0 + 1) * (b.j1 - b.j0 + 1);
}

/**
 * Whether tile x, y is in the selection - footprints are laid on a grid from
 * the one at 0, 0, so each tile belongs to exactly one of them.
 */
function contains(me, x, y) {
    return has(me._cells,
        Math.floor((x - me._ox) / me._stepX),
        Math.floor((y - me._oy) / me._stepY));
}

/**
 * The handles, by the tile each is on, each with every way it pulls: off the
 * end of every row and column the ones on that side, and - a whole rectangle
 * only - off each of its four corners the one tile there. A tile more than
 * one row or column ends at - in the crook of an L, inside a U - pulls any of
 * them, whichever the finger goes along (see choose).
 */
function findHandles(me) {
    var cells = me._cells,
        list = cellList(cells),
        sx = me._stepX,
        sy = me._stepY,
        r = {},
        cell, i, j, x0, y0, x1, y1, n, d, dx, dy, b;

    function claim(x, y, dx, dy) {
        var tile = Terrain.convertToIndex(x, y);

        if (r[tile] === undefined)
            r[tile] = {tile: tile, options: []};

        r[tile].options.push({i: i, j: j, dx: dx, dy: dy});
    }

    for (n = 0; n < list.length; n++) {
        i = list[n][0];
        j = list[n][1];
        x0 = me._ox + i * sx;
        y0 = me._oy + j * sy;
        x1 = x0 + sx - 1;
        y1 = y0 + sy - 1;

        for (d = 0; d < 4; d++) {
            dx = [1, -1, 0, 0][d];
            dy = [0, 0, 1, -1][d];

            if (has(cells, i + dx, j + dy))
                continue;

            //the tiles of the footprint over the way that touch this one
            if (dx !== 0) {
                for (cell = y0; cell <= y1; cell++)
                    claim(dx > 0 ? x1 + 1 : x0 - 1, cell, dx, 0);
            } else {
                for (cell = x0; cell <= x1; cell++)
                    claim(cell, dy > 0 ? y1 + 1 : y0 - 1, 0, dy);
            }
        }
    }

    if (!isRect(cells))
        return r;

    b = cellBounds(cells);
    x0 = me._ox + b.i0 * sx;
    y0 = me._oy + b.j0 * sy;
    x1 = me._ox + (b.i1 + 1) * sx - 1;
    y1 = me._oy + (b.j1 + 1) * sy - 1;

    for (d = 0; d < 4; d++) {
        dx = [1, 1, -1, -1][d];
        dy = [1, -1, 1, -1][d];
        i = dx > 0 ? b.i1 : b.i0;
        j = dy > 0 ? b.j1 : b.j0;
        claim(dx > 0 ? x1 + 1 : x0 - 1, dy > 0 ? y1 + 1 : y0 - 1, dx, dy);
    }

    return r;
}

/**
 * A handle is its arrow or square alone - the tile it is on is outlined, if at
 * all, by whoever uses the selector.
 */
function drawHandles(me) {
    var hiliteMan = me.root.hiliteMan,
        handles = me.handles(),
        data = [],
        only, arrow, i;

    for (i = 0; i < handles.length; i++) {
        //one that pulls one way only is an arrow that way, and one that
        //pulls both ways - a corner, or a tile more than one row or column
        //ends at - is a square
        only = handles[i].options.length === 1 ? handles[i].options[0] : null;
        arrow = only !== null && (only.dx === 0 || only.dy === 0);

        data.push({
            x: Terrain.extractX(handles[i].tile),
            y: Terrain.extractY(handles[i].tile),
            underwater: me._underwater,
            arrow: arrow ? [only.dx, only.dy] : null,
            square: !arrow
        });
    }

    hiliteMan.disable(me._handleTokens);
    me._handleTokens = hiliteMan.hilite(data);
}

/**
 * Makes cells, laid from tile ox, oy on, the selection, and tells whoever is
 * listening if that is anything new.
 */
function select(me, ox, oy, cells, force) {
    var sig = ox + ":" + oy + ":" + Object.keys(cells).sort().join(";");

    if (!force && sig === me._sig)
        return;

    me._ox = ox;
    me._oy = oy;
    me._cells = cells;
    me._sig = sig;
    me._handles = findHandles(me);

    drawHandles(me);
    Events.fire(me, events.change);
}

function onDragStart(sender, e, me) {
    var hit = pick(me, e.gameViewportX, e.gameViewportY),
        x, y, handle;

    if (hit.tile === -1 && !hit.preview)
        return;

    x = Terrain.extractX(hit.tile);
    y = Terrain.extractY(hit.tile);
    handle = hit.tile === -1 ? null : me._handles[hit.tile] || null;

    //what is drawn on top is what gets dragged: the building being placed
    //stands over the handles behind it, and grabbing it by the roof is
    //grabbing it all the same
    if (hit.preview)
        handle = null;
    else if (handle === null && !contains(me, x, y))
        return;

    //no tile under the roof that was grabbed - it is held by where the
    //selection is instead, and moves once the finger is over the ground
    if (hit.tile === -1) {
        x = me._ox;
        y = me._oy;
    }

    me._drag = {
        mode: handle === null ? MOVE : RESIZE,
        //which way it pulls - not known yet where it could pull more than
        //one, until the finger has gone one of them
        handle: handle !== null && handle.options.length === 1 ? handle.options[0] : null,
        options: handle !== null ? handle.options : null,
        x: x,
        y: y,
        screenX: e.gameViewportX,
        screenY: e.gameViewportY,
        ox: me._ox,
        oy: me._oy,
        cells: me._cells
    };

    //the map stays where it is while the selection is being moved about on it
    me._camLocked = me._cam.lock();
    me._cam.lock(true);
}

/**
 * How many steps by tiles comes to, rounded the same way both ways.
 */
function steps(by, step) {
    return by < 0 ? -Math.round(-by / step) : Math.round(by / step);
}

function onDrag(sender, param, me) {
    var drag = me._drag;

    if (drag === null)
        return;

    var e = param.e,
        tile = pick(me, e.gameViewportX, e.gameViewportY).tile;

    //off the edge of the drawn map - it stays where it last was
    if (tile === -1)
        return;

    var dx = Terrain.extractX(tile) - drag.x,
        dy = Terrain.extractY(tile) - drag.y,
        handle = drag.handle,
        cells, by, way, next, rx, ry, b, i, j, k;

    if (drag.mode === MOVE) {
        select(me, drag.ox + dx, drag.oy + dy, drag.cells);
        return;
    }

    if (handle === null) {
        handle = drag.handle = choose(me, drag.options,
            e.gameViewportX - drag.screenX, e.gameViewportY - drag.screenY);

        if (handle === null)
            return;
    }

    if (handle.dx !== 0 && handle.dy !== 0) {
        //a corner - there only is one on a whole rectangle - pulls both of
        //its sides, and it stays a whole rectangle
        b = cellBounds(drag.cells);
        rx = pull(b.i0, b.i1, handle.dx, steps(dx, me._stepX));
        ry = pull(b.j0, b.j1, handle.dy, steps(dy, me._stepY));
        cells = {};

        for (i = rx[0]; i <= rx[1]; i++) {
            for (j = ry[0]; j <= ry[1]; j++)
                add(cells, i, j);
        }
    } else {
        //a row or a column pulled in stops short of cutting any of the rest
        //of the selection off - it goes a footprint at a time, so it stops
        //right at the one that would
        by = handle.dx !== 0 ? steps(dx, me._stepX) : steps(dy, me._stepY);
        way = by < 0 ? -1 : 1;
        cells = drag.cells;

        for (k = way; k * way <= by * way; k += way) {
            next = pullRun(drag.cells, handle, k);

            if (!connected(next))
                break;

            cells = next;
        }
    }

    select(me, drag.ox, drag.oy, cells);
}

//how far, in tiles, the finger goes before a handle that could pull more
//than one way is taken to pull the way it went
var CHOOSE_DISTANCE = 0.3;

/**
 * Which of options a handle pulls, from how far the finger has gone on screen
 * since it took hold of it - or null while that is too little to tell.
 *
 * Along whichever of x and y it went further, the row or column it pulls out
 * towards the finger, or else, when there is none that way, the one it pulls
 * in. The tiles' axes run corner to corner across the screen, so the finger
 * is followed the way the camera sees the ground rather than by the tiles it
 * crosses, which would take a whole tile to tell apart.
 */
function choose(me, options, screenX, screenY) {
    var m = me._cam.gameObject.camera.getWorldToScreen(),
        //where a step along the world's x and along its z - the tiles' y -
        //go on screen, and the step along each that screenX, screenY is
        det = m[0] * m[9] - m[8] * m[1],
        along = [
            (screenX * m[9] - m[8] * screenY) / det / Config.tileSize,
            (m[0] * screenY - screenX * m[1]) / det / Config.tileSize
        ],
        first = Math.abs(along[0]) >= Math.abs(along[1]) ? 0 : 1,
        axes = [first, 1 - first],
        n, k, way, option, back;

    if (Math.abs(along[0]) + Math.abs(along[1]) < CHOOSE_DISTANCE)
        return null;

    for (n = 0; n < 2; n++) {
        way = along[axes[n]] < 0 ? -1 : 1;
        back = null;

        for (k = 0; k < options.length; k++) {
            option = options[k];

            if ((axes[n] === 0 ? option.dx : option.dy) === way)
                return option;

            if ((axes[n] === 0 ? option.dx : option.dy) === -way)
                back = option;
        }

        if (back !== null)
            return back;
    }

    return options[0];
}

/**
 * The selection with the row - or the column - handle is at the end of
 * pulled by footprints, and nothing else of it changed (see pull).
 */
function pullRun(cells, handle, by) {
    var r = copy(cells),
        //along the row, or down the column
        row = handle.dx !== 0,
        n = row ? handle.i : handle.j,
        lo, hi, run;

    function at(n) {
        return row ? [n, handle.j] : [handle.i, n];
    }

    function on(n) {
        var c = at(n);
        return has(cells, c[0], c[1]);
    }

    for (lo = n; on(lo - 1); lo--);
    for (hi = n; on(hi + 1); hi++);

    for (n = lo; n <= hi; n++)
        delete r[key.apply(null, at(n))];

    run = pull(lo, hi, row ? handle.dx : handle.dy, by);

    for (n = run[0]; n <= run[1]; n++)
        add(r, at(n)[0], at(n)[1]);

    return r;
}

/**
 * Whether every footprint can be got to from every other one, going from
 * each to the ones beside it.
 */
function connected(cells) {
    var keys = Object.keys(cells),
        seen = {},
        queue = [cells[keys[0]]],
        count = 0,
        cell, d, i, j;

    seen[keys[0]] = true;

    while (queue.length > 0) {
        cell = queue.pop();
        count++;

        for (d = 0; d < 4; d++) {
            i = cell[0] + [1, -1, 0, 0][d];
            j = cell[1] + [0, 0, 1, -1][d];

            if (has(cells, i, j) && seen[key(i, j)] !== true) {
                seen[key(i, j)] = true;
                queue.push(cells[key(i, j)]);
            }
        }
    }

    return count === keys.length;
}

/**
 * Where the end of the run lo - hi on side way (1 for hi, -1 for lo) ends up
 * pulled by, with the handle kept under the finger: out, the run grows; in,
 * it shrinks down to one; and on past its other end it grows out that way
 * instead, from where the other end was.
 *
 * @returns {number[]} the new lo and hi
 */
function pull(lo, hi, way, by) {
    var fixed = way > 0 ? lo : hi,
        edge = (way > 0 ? hi : lo) + by,
        //how far across the end is from the fixed one, that one counted
        size = (edge - fixed) * way + 1,
        //and across the other way - the handle is one out from the end, so
        //once it is round the other side the end is two further on
        other = (fixed - edge) * way - 1,
        far;

    if (size < 1 && other >= 1) {
        way = -way;
        size = other;
    }

    far = fixed + way * (Math.max(1, size) - 1);

    return [Math.min(fixed, far), Math.max(fixed, far)];
}

function onDragEnd(sender, e, me) {
    if (me._drag === null)
        return;

    me._drag = null;
    me._cam.lock(me._camLocked);
}

/**
 * A single footprint about tile - in the middle of it, as near as whole tiles
 * allow.
 */
function placeAt(me, tile, force) {
    var cells = {};

    add(cells, 0, 0);
    select(me,
        Terrain.extractX(tile) - ((me._stepX - 1) >> 1),
        Terrain.extractY(tile) - ((me._stepY - 1) >> 1),
        cells, force);
}

/**
 * A tap on anything with something to show for it - a house, a tower - shows
 * it, the same as it does outside of any action, and one on a city's name
 * does nothing. So does one on the selection, or on what is being placed on
 * it. A tap anywhere else on the ground puts the selection there, back down
 * to one footprint.
 */
function onClick(sender, e, me) {
    var x = e.gameViewportX,
        y = e.gameViewportY,
        root = me.root,
        hit;

    //the city screen does not open while an action is running - but the name
    //is still what was tapped, not the ground behind it
    if (root.cityman.pickCity(x, y) !== null)
        return;

    hit = pick(me, x, y);

    if (hit.preview || hit.tile === -1 || root.serviceman.inspect(x, y))
        return;

    if (!contains(me, Terrain.extractX(hit.tile), Terrain.extractY(hit.tile)))
        placeAt(me, hit.tile);
}

//data is [host, event, subscription] - Events.off needs all three, a bare
//subscription is not enough to find what it was subscribed to
function onDispose(sender, args, data){
    Events.off(data[0], data[1], data[2]);
}

var events = {
    change: 0,
    dispose: 1
};

/**
 * @param root {Vkaria}
 * @param [options] {Object}
 *        stepX, stepY - the footprint the selection is kept a multiple of,
 *                       1 by 1 when left out
 *        underwater   - the handles lie on the ground under water rather
 *                       than on its surface
 * @constructor
 */
function AreaSelector(root, options) {
    options = options || {};

    this.root = root;
    this._terrain = root.terrain;
    this._stepX = options.stepX || 1;
    this._stepY = options.stepY || 1;
    this._underwater = options.underwater === true;
    this._handleTokens = [];
    this._handles = {};
    this._cells = {};
    this._sig = null;
    this._drag = null;
    this._camLocked = false;

    var cam = this._cam = root.camera.cameraScript;

    var dss = Events.on(cam, WorldCamera.events.inputDragStart, onDragStart, this);
    var ds = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);
    var des = Events.on(cam, WorldCamera.events.inputDragEnd, onDragEnd, this);
    var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);

    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDragStart, dss]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDrag, ds]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDragEnd, des]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputClick, cs]);

    //nobody is listening yet, but the handles are drawn all the same
    placeAt(this, centerTile(this), true);
}

AreaSelector.events = events;

/**
 * Turns the whole selection round the way a building is turned - flipped over
 * so that x is y and y is x, each footprint along with it: so many buildings
 * across by so many deep become as many across as there were deep, and a 3 by
 * 4 selection comes out 4 by 3. It turns about its middle, as near as whole
 * tiles allow, and turned back it is right where it was.
 */
AreaSelector.prototype.rotate = function () {
    var list = cellList(this._cells),
        b = cellBounds(this._cells),
        sx = this._stepX,
        sy = this._stepY,
        cells = {},
        w = (b.i1 - b.i0 + 1) * sx,
        h = (b.j1 - b.j0 + 1) * sy,
        //half the difference either way, rounded towards nothing - so the way
        //back is exactly as far as the way there
        x0 = this._ox + b.i0 * sx + Math.trunc((w - h) / 2),
        y0 = this._oy + b.j0 * sy + Math.trunc((h - w) / 2),
        n;

    for (n = 0; n < list.length; n++)
        add(cells, list[n][1] - b.j0, list[n][0] - b.i0);

    this._stepX = sy;
    this._stepY = sx;

    //told even when it comes out the same - what is placed on it is turned
    select(this, x0, y0, cells, true);
};

/**
 * Draws the handles again and tells whoever is listening that the selection
 * changed, for when it is the ground under it that moved.
 */
AreaSelector.prototype.refresh = function () {
    select(this, this._ox, this._oy, this._cells, true);
};

/**
 * Where each footprint of the selection starts - its least x and y - in the
 * order a build of it goes through them.
 *
 * @returns {number[]}
 */
AreaSelector.prototype.anchors = function () {
    var list = cellList(this._cells),
        r = [];

    for (var n = 0; n < list.length; n++)
        r.push(Terrain.convertToIndex(
            this._ox + list[n][0] * this._stepX,
            this._oy + list[n][1] * this._stepY));

    return r;
};

/**
 * Every tile of the selection.
 *
 * @returns {number[]}
 */
AreaSelector.prototype.tiles = function () {
    var anchors = this.anchors(),
        r = [],
        n, x, y;

    for (n = 0; n < anchors.length; n++) {
        for (y = 0; y < this._stepY; y++) {
            for (x = 0; x < this._stepX; x++)
                r.push(anchors[n] + x + y * Terrain.dy);
        }
    }

    return r;
};

/**
 * The least and greatest x and y of the selection's tiles.
 *
 * @returns {{x0: number, y0: number, x1: number, y1: number}}
 */
AreaSelector.prototype.bounds = function () {
    var b = cellBounds(this._cells);

    return {
        x0: this._ox + b.i0 * this._stepX,
        y0: this._oy + b.j0 * this._stepY,
        x1: this._ox + (b.i1 + 1) * this._stepX - 1,
        y1: this._oy + (b.j1 + 1) * this._stepY - 1
    };
};

/**
 * Every handle, the tile it is on, and every footprint it pulls at and which
 * way - more than one where rows or columns end at the same tile.
 *
 * @returns {{tile: number, options: {i: number, j: number, dx: number, dy: number}[]}[]}
 */
AreaSelector.prototype.handles = function () {
    var r = [];

    for (var tile in this._handles)
        r.push(this._handles[tile]);

    return r;
};

AreaSelector.prototype.dispose = function () {
    //let go of the map if it goes while something is being dragged
    onDragEnd(this._cam, null, this);

    this.root.hiliteMan.disable(this._handleTokens);
    this._handleTokens = [];

    Events.fire(this, events.dispose);
};

export default AreaSelector;
