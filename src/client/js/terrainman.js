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
 * them dashed and fading out, following their shape - all following the
 * ground, under water too, since that is where it gets shaped.
 */
function hiliteData(tiles) {
    var picked = Object.create(null),
        ring = Object.create(null),
        halo = [],
        selected = [],
        tile, near, r, x, y, dx, dy, i;

    for (i = 0; i < tiles.length; i++)
        picked[tiles[i]] = true;

    //how far each tile around them is from the nearest picked one
    for (i = 0; i < tiles.length; i++) {
        x = Terrain.extractX(tiles[i]);
        y = Terrain.extractY(tiles[i]);

        for (dx = -HALO_RADIUS; dx <= HALO_RADIUS; dx++) {
            for (dy = -HALO_RADIUS; dy <= HALO_RADIUS; dy++) {
                near = Terrain.convertToIndex(x + dx, y + dy);
                r = Math.max(Math.abs(dx), Math.abs(dy));

                if (picked[near] !== true && (ring[near] === undefined || r < ring[near]))
                    ring[near] = r;
            }
        }
    }

    function hilite(tile, border, width, dash) {
        return {
            x: Terrain.extractX(tile),
            y: Terrain.extractY(tile),
            borderColor: border,
            borderWidth: width,
            borderDash: dash,
            underwater: true
        };
    }

    for (tile in ring)
        halo.push(hilite(+tile, HALO_BORDERS[ring[tile] - 1], 1, HALO_DASH));

    for (i = 0; i < tiles.length; i++)
        selected.push(hilite(tiles[i], SELECTED_BORDER, 2, null));

    //the picked tiles last, so their outline is drawn over the others
    return halo.concat(selected);
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
        tokens = root.hiliteMan.hilite(hiliteData(ts.tiles()));
    }

    var sub = Events.on(ts, AreaSelector.events.change, updateHilite);

    //each action works on what is picked and leaves it picked - going up or
    //down again is only another tap away. The ground under it may have moved,
    //so it is drawn over again
    function act(f) {
        return function () {
            f(ts.tiles(), ts.bounds());
            ts.refresh();
        };
    }

    function bulldoze(tiles) {
        var city = root.core.cities.getCity(0);

        for (var i = 0; i < tiles.length; i++) {
            //every tile is charged on its own, so each one that goes gets
            //its own text
            if (city.clearTile(tiles[i]))
                buildman.showCost(tiles[i], 1, 1, Core.Config.clearTileCost);
        }
    }

    function level(direction) {
        return function (tiles, bounds) {
            var result = root.core.cities.getCity(0).terraform(tiles, direction);

            if (result.error !== ErrorCode.NONE)
                buildman.showText(result.tile, 1, 1, errorText[result.error] || "can't do that");
            else if (result.cost > 0)
                buildman.showCost(Terrain.convertToIndex(bounds.x0, bounds.y0),
                    bounds.x1 - bounds.x0 + 1,
                    bounds.y1 - bounds.y0 + 1,
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
