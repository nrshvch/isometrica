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

    /**
     * @param params {Object} Contains x, y and optional w, l, fill and stroke colors.
     * @returns {*}
     */
    HiliteMan.prototype.hilite = function(params){
        if(Array.isArray(params))
            return this._hiliteMany(params);
        else if(params.w !== undefined && params.h !== undefined)
            return this._hiliteArea(params);
        else
            return this._hiliteOne(params);
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