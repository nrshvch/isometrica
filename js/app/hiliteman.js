/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 31.03.14
 * Time: 14:48
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var engine = require("engine"),
        TileHiliteScript = require("app/components/tilehilitescript"),
        TileHiliteRenderer = require("app/components/tilehiliterenderer"),
        RenderLayer = require("lib/renderlayer");

    function createHiliter(){
        var go = new engine.GameObject("hilite");
        var cmp = new TileHiliteRenderer();
        cmp.layer = RenderLayer.overlayLayer;
        go.addComponent(cmp);
        cmp = new TileHiliteScript();
        go.addComponent(cmp);
        vkariaApp.game.logic.world.addGameObject(go);
        return cmp;
    }

    function HiliteMan(){
        this.hiliters = [];
    }

                     /*
    HiliteMan.prototype.hiliteTile = function(tileX, tileY, color){
        var tile = vkariaApp.tilesman.getTile(tileX, tileY).tileScript;

        //if (this.hiliters.length) {
          //  this.hiliters[0].setTile(tile, color);
        //} else {
            //var hilite = createHiliter();
            //this.hiliters.push(hilite);
            //hilite.setTile(tile, color);
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
    };             */

    HiliteMan.prototype._hiliteOne = function(hiliteData){
        var hiliter = createHiliter();
        hiliter.setHiliteData(hiliteData);
        var index = this.hiliters.push(hiliter) - 1;
        return index;
    };

    HiliteMan.prototype._hiliteArea = function(hiliteAreaData){
        var x0 = hiliteAreaData.x,
            y0 = hiliteAreaData.y,
            x1 = x0 + hiliteAreaData.w - 1,
            y1 = y0 + hiliteAreaData.h - 1,
            fill = hiliteAreaData.fillColor,
            border = hiliteAreaData.borderColor;

            x0 = Math.min(x0, x1);
            y0 = Math.min(y0, y1);
            x1 = x0 + Math.abs(hiliteAreaData.w - 1);
            y1 = y0 + Math.abs(hiliteAreaData.h - 1);

        var hiliteData = [];

        for(var i = x0; i <= x1; i++){
            for(var j = y0; j <= y1; j++){
                hiliteData.push({
                    x: i,
                    y: j,
                    fillColor: fill,
                    borderColor: border
                });
            }
        }

        return this._hiliteMany(hiliteData);
    };

    HiliteMan.prototype._hiliteMany = function(hiliteData){
        var i = 0,
            len = hiliteData.length,
            data, r = [];

        for(i = 0; i < len; i++){
            data = hiliteData[i];
            r.push(this._hiliteOne(data));
        }

        return r;
    };

    HiliteMan.prototype.hilite = function(hiliteData){
        if(Array.isArray(hiliteData))
            return this._hiliteMany(hiliteData);
        else if(hiliteData.w !== undefined && hiliteData.h !== undefined)
            return this._hiliteArea(hiliteData);
        else
            return this._hiliteOne(hiliteData);
    };

    HiliteMan.prototype.disable = function(tokenData){
        if(tokenData !== undefined){
            if(Array.isArray(tokenData)){
                for(var i = 0; i < tokenData.length; i++){
                    this.disable(tokenData[i]);
                }
            }else{
                if(this.hiliters[tokenData] !== null){
                    var hiliter = this.hiliters[tokenData];
                    this.hiliters[tokenData] = null;
                    hiliter.gameObject.destroy();
                }
            }
        }else{
            for(var i = 0; i < this.hiliters.length; i++)
                this.disable(i);
        }
    };

    return HiliteMan;
});