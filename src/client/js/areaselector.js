/**
 * Picks a rectangle of tiles without taking the map away from the player.
 *
 * The selection starts out on the tile in the middle of the screen, and stays
 * put while the map is panned - a drag anywhere else still pans it, and a tap
 * still shows what a building is doing, so the spot can be looked for with
 * the selection already up. On a phone there is no cursor to follow and no
 * telling a pan from a pick until the finger moves, so the selection is never
 * drawn out by dragging:
 *
 *  - dragging the selection moves it, held by the tile it was grabbed at, so
 *    it follows the finger rather than jumping under it
 *  - the ring of tiles around it are handles, each with an arrow pointing the
 *    way it resizes: one on an edge moves that edge alone, one on a corner
 *    the two edges meeting there
 *
 * A selection that stands for buildings is kept to a whole number of their
 * footprints, and turns round along with them - see AreaSelector#rotate.
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

/**
 * Rounds a size to a whole number of steps, never fewer than one.
 */
function snap(size, step) {
    return Math.max(1, Math.round(size / step)) * step;
}

/**
 * The handle on tile x, y, or null when x, y is not on the ring around the
 * selection.
 */
function handleAt(me, x, y) {
    var dx = x < me._x0 ? -1 : x > me._x1 ? 1 : 0,
        dy = y < me._y0 ? -1 : y > me._y1 ? 1 : 0;

    if (dx === 0 && dy === 0)
        return null;

    if (x < me._x0 - 1 || x > me._x1 + 1 || y < me._y0 - 1 || y > me._y1 + 1)
        return null;

    return {dx: dx, dy: dy};
}

function contains(me, x, y) {
    return x >= me._x0 && x <= me._x1 && y >= me._y0 && y <= me._y1;
}

/**
 * A handle is its arrow alone - the tile it is on is outlined, if at all, by
 * whoever uses the selector.
 */
function drawHandles(me) {
    var hiliteMan = me.root.hiliteMan,
        handles = me.handles(),
        data = [],
        i;

    for (i = 0; i < handles.length; i++) {
        data.push({
            x: Terrain.extractX(handles[i].tile),
            y: Terrain.extractY(handles[i].tile),
            underwater: me._underwater,
            arrow: [handles[i].dx, handles[i].dy]
        });
    }

    hiliteMan.disable(me._handleTokens);
    me._handleTokens = hiliteMan.hilite(data);
}

/**
 * Puts the selection over x0, y0 - x1, y1, and tells whoever is listening if
 * that is anywhere new.
 */
function select(me, x0, y0, x1, y1, force) {
    if (!force && x0 === me._x0 && y0 === me._y0 && x1 === me._x1 && y1 === me._y1)
        return;

    me._x0 = x0;
    me._y0 = y0;
    me._x1 = x1;
    me._y1 = y1;

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
    handle = hit.tile === -1 ? null : handleAt(me, x, y);

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
        x = me._x0;
        y = me._y0;
    }

    me._drag = {
        mode: handle === null ? MOVE : RESIZE,
        handle: handle,
        x: x,
        y: y,
        x0: me._x0,
        y0: me._y0,
        x1: me._x1,
        y1: me._y1
    };

    //the map stays where it is while the selection is being moved about on it
    me._camLocked = me._cam.lock();
    me._cam.lock(true);
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
        x0 = drag.x0,
        y0 = drag.y0,
        x1 = drag.x1,
        y1 = drag.y1,
        handle = drag.handle;

    if (drag.mode === MOVE) {
        select(me, x0 + dx, y0 + dy, x1 + dx, y1 + dy);
        return;
    }

    //an edge is pulled along its own axis only, and never past the one
    //across from it - whatever the finger does, one step is left
    if (handle.dx > 0)
        x1 = x0 + snap(x1 + dx - x0 + 1, me._stepX) - 1;
    else if (handle.dx < 0)
        x0 = x1 - snap(x1 - (x0 + dx) + 1, me._stepX) + 1;

    if (handle.dy > 0)
        y1 = y0 + snap(y1 + dy - y0 + 1, me._stepY) - 1;
    else if (handle.dy < 0)
        y0 = y1 - snap(y1 - (y0 + dy) + 1, me._stepY) + 1;

    select(me, x0, y0, x1, y1);
}

function onDragEnd(sender, e, me) {
    if (me._drag === null)
        return;

    me._drag = null;
    me._cam.lock(me._camLocked);
}

/**
 * A tap is not the selector's business - it shows what a building is doing,
 * the same as it does outside of any action.
 */
function onClick(sender, e, me) {
    me.root.serviceman.inspect(e.gameViewportX, e.gameViewportY);
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

    //a footprint wider than a tile is put about the middle of the screen, as
    //near as whole tiles allow
    var tile = centerTile(this),
        x0 = Terrain.extractX(tile) - ((this._stepX - 1) >> 1),
        y0 = Terrain.extractY(tile) - ((this._stepY - 1) >> 1);

    this._x0 = x0;
    this._y0 = y0;
    this._x1 = x0 + this._stepX - 1;
    this._y1 = y0 + this._stepY - 1;

    drawHandles(this);
}

AreaSelector.events = events;

/**
 * Turns the whole selection round, footprint and all: so many buildings
 * across by so many deep become as many across as there were deep, each one
 * turned - a 3 by 4 selection comes out 4 by 3. It turns about its middle, as
 * near as whole tiles allow, and turned back it is right where it was.
 */
AreaSelector.prototype.rotate = function () {
    var w = this._x1 - this._x0 + 1,
        h = this._y1 - this._y0 + 1,
        //half the difference either way, rounded towards nothing - so the
        //way back is exactly as far as the way there
        x0 = this._x0 + Math.trunc((w - h) / 2),
        y0 = this._y0 + Math.trunc((h - w) / 2),
        stepX = this._stepX;

    this._stepX = this._stepY;
    this._stepY = stepX;

    //told even when a square selection comes out the same - what is placed
    //on it is turned
    select(this, x0, y0, x0 + h - 1, y0 + w - 1, true);
};

/**
 * Draws the handles again and tells whoever is listening that the selection
 * changed, for when it is the ground under it that moved.
 */
AreaSelector.prototype.refresh = function () {
    select(this, this._x0, this._y0, this._x1, this._y1, true);
};

/**
 * Every tile on the ring around the selection, and which way it resizes it.
 *
 * @returns {{tile: number, dx: number, dy: number}[]}
 */
AreaSelector.prototype.handles = function () {
    var r = [],
        x, y, handle;

    for (x = this._x0 - 1; x <= this._x1 + 1; x++) {
        for (y = this._y0 - 1; y <= this._y1 + 1; y++) {
            handle = handleAt(this, x, y);

            if (handle !== null) {
                handle.tile = Terrain.convertToIndex(x, y);
                r.push(handle);
            }
        }
    }

    return r;
};

AreaSelector.prototype.dispose = function () {
    //let go of the map if it goes while something is being dragged
    onDragEnd(this._cam, null, this);

    this.root.hiliteMan.disable(this._handleTokens);
    this._handleTokens = [];

    Events.fire(this, events.dispose);
};

/**
 * The near corner of the selection - least x and y.
 */
AreaSelector.prototype.tile0 = function () {
    return Terrain.convertToIndex(this._x0, this._y0);
};

/**
 * The far corner of the selection - greatest x and y.
 */
AreaSelector.prototype.tile1 = function () {
    return Terrain.convertToIndex(this._x1, this._y1);
};

export default AreaSelector;
