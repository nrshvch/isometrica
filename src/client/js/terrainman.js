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
var HALO_RADIUS = 3;

var SELECTED_BORDER = "rgba(255,255,255,1)";
//the rings around the picked tiles, fading outwards
var HALO_BORDERS = ["rgba(255,255,255,0.45)", "rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"];
var HALO_DASH = [4, 4];

/**
 * One hilite per tile: the picked ones outlined in white and the rings around
 * them dashed and fading out - all following the ground, under water too,
 * since that is where it gets shaped.
 */
function hiliteData(tile0, tile1) {
    var x0 = Terrain.extractX(tile0),
        y0 = Terrain.extractY(tile0),
        x1 = Terrain.extractX(tile1),
        y1 = Terrain.extractY(tile1),
        halo = [],
        picked = [],
        ring, x, y;

    for (x = x0 - HALO_RADIUS; x <= x1 + HALO_RADIUS; x++) {
        for (y = y0 - HALO_RADIUS; y <= y1 + HALO_RADIUS; y++) {
            ring = Math.max(x0 - x, x - x1, y0 - y, y - y1, 0);

            (ring === 0 ? picked : halo).push({
                x: x,
                y: y,
                borderColor: ring === 0 ? SELECTED_BORDER : HALO_BORDERS[ring - 1],
                borderWidth: ring === 0 ? 2 : 1,
                borderDash: ring === 0 ? null : HALO_DASH,
                underwater: true
            });
        }
    }

    //the picked tiles last, so their outline is drawn over the others
    return halo.concat(picked);
}

function Terrainman(root) {
    this.root = root;
}

Terrainman.prototype.enter = function () {
    var root = this.root,
        buildman = root.buildman,
        worldScreen = root.ui.gameScreen().worldScreen(),
        //the handles follow the ground under water the way the rings do
        ts = new AreaSelector(root, {underwater: true}),
        tokens = [];

    worldScreen.showHint("Drag to place, pull arrows to resize!");

    function updateHilite() {
        root.hiliteMan.disable(tokens);
        tokens = root.hiliteMan.hilite(hiliteData(ts.tile0(), ts.tile1()));
    }

    var sub = Events.on(ts, AreaSelector.events.change, updateHilite);

    //each action works on what is picked and leaves it picked - going up or
    //down again is only another tap away. The ground under it may have moved,
    //so it is drawn over again
    function act(f) {
        return function () {
            f(ts.tile0(), ts.tile1());
            ts.refresh();
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
    }

    root.ui.gameScreen().showToolControls([
        {icon: "cross-icon", action: leave},
        //TODO a clearing icon of its own - this is the one that got us here
        {icon: "bulldozer-icon", action: act(bulldoze)},
        {icon: "chevron-up-icon", action: act(level(1))},
        {icon: "chevron-down-icon", action: act(level(-1))}
    ]);

    //the selection is up from the start, in the middle of the screen
    updateHilite();
};

export default Terrainman;
