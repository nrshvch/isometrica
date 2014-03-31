/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 31.03.14
 * Time: 14:48
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var engine = require("engine"),
        TileHiliteScript = require("app/components/TileHighliteScript");

    function createHiliter () {
        var hiliteGO = new engine.GameObject();
        var hilite = new TileHiliteScript();
        hiliteGO.addComponent(hilite);
        vkariaApp.game.logic.world.addGameObject(hiliteGO);
        return hilite;
    }

    function HiliteMan(){
        this.hiliters = [];
    }

    HiliteMan.prototype.hiliteTile = function(tileX, tileY, color){
        var tile = vkariaApp.tilesman.getTile(tileX, tileY).tileScript;

        //if (this.hiliters.length) {
          //  this.hiliters[0].setTile(tile, color);
        //} else {
            var hilite = createHiliter();
            this.hiliters.push(hilite);
            hilite.setTile(tile, color);
        //}
    };

    HiliteMan.prototype.hiliteTileArea = function (tile1X, tile1Y, tile2X, tile2Y, color) {
        var tiles = vkariaApp.tilesman,
            tile1 = tiles.getTile(tile1X, tile1Y).tileScript,
            tile2 = tiles.getTile(tile2X, tile2Y).tileScript,
            len = this.hiliters.length,
            hiliter, i,
            x0 = Math.min(tile1.x, tile2.x),
            y0 = Math.min(tile1.y, tile2.y),
            x1 = Math.max(tile1.x, tile2.x),
            y1 = Math.max(tile1.y, tile2.y);

        this.disableAll();

        i = 0;
        for (var x = x0; x <= x1; x++) {
            for (var y = y0; y <= y1; y++) {
                var tile = tiles.getTile(x, y).tileScript;

                if (!tile)
                    continue;

                if (i < len) {
                    hiliter = this.hiliters[i];
                } else {
                    hiliter = createHiliter();
                    this.hiliters.push(hiliter);
                }

                hiliter.setTile(tile, color);

                i++;
            }
        }
    };

    HiliteMan.prototype.disableAll = function () {
        for (var i = 0; i < this.hiliters.length; i++) {
            this.hiliters[i].disable();
        }
    };

    HiliteMan.prototype.overlayTiles = function(testGood){
        var cam = vkaria.game.logic.world.findByName("mainCamera");
        var objs = cam.camera.getVisibleGameObjects();
        var objs = vkaria.game.logic.world.retrieve(cam);
        var l = objs.length;
        var obj;
        for(var i = 0; i < l; i++){
            obj = objs[i];
            if(obj.tileScript){
                if(testGood(obj.tileScript)){
                    vkariaApp.hiliteMan.hiliteTile(obj.tileScript.x, obj.tileScript.y, "rgba(0,255,0,0.25)");
                }else{
                    vkariaApp.hiliteMan.hiliteTile(obj.tileScript.x, obj.tileScript.y, "rgba(255,0,0,0.25)");
                }
            }
        }
    };

    return HiliteMan;
});