/**
 * The terrain mode: pick tiles, then clear them, raise them or lower them -
 * as many times over as the player likes, until they leave with cancel.
 */
import Core from "core/main";
import Events from "events";
import AreaSelector from "./areaselector";
import ErrorCode from "core/errorcode";

var Terrain = Core.Terrain;

/**
 * What the player is told when shaping the ground is turned down, keyed by
 * ErrorCode.
 */
var errorText = {};
errorText[ErrorCode.NOT_ENOUGH_RES] = "no money";
errorText[ErrorCode.TILE_TAKEN] = "building in the way";
errorText[ErrorCode.TERRAFORM_TOO_LARGE] = "too much land";

//how far around the picked tiles the ground is outlined, so the shape of it is
//there to see even under water
var HALO_RADIUS = 2;

var SELECTED_BORDER = "rgba(255,255,255,1)";
//a tile the ground would move under, raising or lowering
var AFFECTED_BORDER = "rgba(255,255,255,0.6)";
//the rings around the picked tiles, fading outwards
var HALO_BORDERS = ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.2)"];
var HALO_DASH = [4, 4];

/**
 * One hilite per tile: the picked ones outlined in white, every tile raising or
 * lowering them would move faintly outlined, and the rings around them dashed
 * and fading out - all following the ground, under water too, since that is
 * where it gets shaped.
 */
function hiliteData(root, tile0, tile1) {
    if (tile0 === -1 || tile1 === -1)
        return [];

    var terrain = root.core.terrain,
        t0 = Terrain.min(tile0, tile1),
        t1 = Terrain.max(tile0, tile1),
        x0 = Terrain.extractX(t0),
        y0 = Terrain.extractY(t0),
        x1 = Terrain.extractX(t1),
        y1 = Terrain.extractY(t1),
        affected = Object.create(null),
        halo = [],
        rest = [],
        picked = [],
        plan, tile, ring, x, y, i, d;

    //which way the player goes is not known yet, so both
    for (d = -1; d <= 1; d += 2) {
        plan = terrain.planLevel(t0, t1, d);

        if (plan !== null) {
            for (i = 0; i < plan.tiles.length; i++)
                affected[plan.tiles[i]] = true;
        }
    }

    function add(list, tile, border, width, dash) {
        //nothing to follow on a tile that is not drawn
        if (root.terrain.getTile(tile) === null)
            return;

        list.push({
            x: Terrain.extractX(tile),
            y: Terrain.extractY(tile),
            borderColor: border,
            borderWidth: width,
            borderDash: dash,
            underwater: true
        });
    }

    for (x = x0 - HALO_RADIUS; x <= x1 + HALO_RADIUS; x++) {
        for (y = y0 - HALO_RADIUS; y <= y1 + HALO_RADIUS; y++) {
            tile = Terrain.convertToIndex(x, y);
            ring = Math.max(x0 - x, x - x1, y0 - y, y - y1, 0);

            if (ring === 0)
                add(picked, tile, SELECTED_BORDER, 2);
            else if (affected[tile] !== true)
                add(halo, tile, HALO_BORDERS[ring - 1], 1, HALO_DASH);
        }
    }

    //moved ground reaches as far as it has to, past the rings as well
    for (tile in affected) {
        tile = +tile;

        if (!Terrain.contains(t0, t1, tile))
            add(rest, tile, AFFECTED_BORDER, 1);
    }

    //the picked tiles last, so their outline is drawn over the others
    return halo.concat(rest, picked);
}

function Terrainman(root) {
    this.root = root;
}

Terrainman.prototype.enter = function () {
    var root = this.root,
        buildman = root.buildman,
        worldScreen = root.ui.gameScreen().worldScreen(),
        ts = new AreaSelector(root),
        tokens = [];

    worldScreen.showHint("Pick tiles, then clear, raise or lower them!");
    root.camera.cameraScript.lock(true);

    function updateHilite() {
        root.hiliteMan.disable(tokens);
        tokens = root.hiliteMan.hilite(hiliteData(root, ts.tile0(), ts.tile1()));
    }

    var sub = Events.on(ts, AreaSelector.events.change, updateHilite);

    //each action works on what was picked and then drops it, leaving the mode
    //up for the next pick
    function act(f) {
        return function () {
            if (!ts.isPicked())
                return;

            f(ts.tile0(), ts.tile1());
            ts.reset();
            updateHilite();
        };
    }

    function bulldoze(tile0, tile1) {
        var city = root.core.cities.getCity(0),
            iter = new Core.TileIterator(tile0, tile1),
            tile;

        while (!iter.done) {
            tile = iter.next();
            //every tile is charged on its own, so each one that goes gets
            //its own text
            if (city.clearTile(tile))
                buildman.showCost(tile, 1, 1, Core.Config.clearTileCost);
        }
    }

    function level(direction) {
        return function (tile0, tile1) {
            var t0 = Terrain.min(tile0, tile1),
                t1 = Terrain.max(tile0, tile1),
                result = root.core.cities.getCity(0).terraform(t0, t1, direction);

            if (result.error !== ErrorCode.NONE)
                buildman.showText(result.tile, 1, 1, errorText[result.error] || "can't do that");
            else if (result.cost > 0)
                buildman.showCost(t0,
                    Terrain.extractX(t1) - Terrain.extractX(t0) + 1,
                    Terrain.extractY(t1) - Terrain.extractY(t0) + 1,
                    result.cost);
        };
    }

    function leave() {
        ts.dispose();
        root.hiliteMan.disable(tokens);
        Events.off(ts, AreaSelector.events.change, sub);

        root.ui.gameScreen().showWorld();
        worldScreen.hideHint();
        root.camera.cameraScript.lock(false);
    }

    root.ui.gameScreen().showToolControls([
        {icon: "cross-icon", action: leave},
        //TODO a clearing icon of its own - this is the one that got us here
        {icon: "bulldozer-icon", action: act(bulldoze)},
        {icon: "chevron-up-icon", action: act(level(1))},
        {icon: "chevron-down-icon", action: act(level(-1))}
    ]);
};

export default Terrainman;
