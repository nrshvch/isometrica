/**
 * Created by User on 21.08.2014.
 */
define(function(require){
    var TileParams = require("./tileparams");
    var TileParam = require("./tileparam");

    var MAX_PARAM_VAL = 100;

    var defaults = {};
    Object.defineProperty(defaults, TileParam.Ecology, {
        value: MAX_PARAM_VAL,
        writable: false,
        enumerable: true
    });

    /**
     * @class TileParamsMan
     */
    function TileParamsMan(){
        /**
         * Dictionary containing all record that've been made with Add method
         * @type {Object.<number,Object.<number,Object.<TileParam,number>>>}
         * @private
         */
        this._records = {};
        /**
         * Dictionary containing cached params sum of all records of each tile
         * @type {Object.<number,Object.<TileParam,number>>}
         * @private
         */
        this._map = {};
        /**
         * Dictionary containing all records for each tile. Not summed up.
         * @type {Object.<number,Object.<number,Object.<TileParam,number>>>}
         * @private
         */
        this._tileRecords = {};
    }

    TileParamsMan.MAX_PARAM_VAL = MAX_PARAM_VAL;

    /**
     * @param self {TileParamsMan}
     * @param key {string|number}
     * @param tilesParams {Object.<number,Object.<TileParam,number>>}
     */
    TileParamsMan.add = function(self, key, tilesParams){
        //save all tile params associated with given key
        //exit if set
        if(self._records[key] !== undefined)
            throw "key is already set, remove it first";

        self._records[key] = tilesParams;

        //add params to global map of params
        var params, tileRec;
        for(var tile in tilesParams){
            params = tilesParams[tile];
            tileRec = self._tileRecords[tile] || (self._tileRecords[tile] = {});
            if(tileRec[key] !== undefined)
                throw "Tile record with key: "+key+", is already set";

            tileRec[key] = params;

            //recalc cached map tile params
            calcMapTile(self, tile);
        }
    };

    TileParamsMan.remove = function(self, key){
        if(self._records[key] === undefined)
            throw "key doesn't exist";

        var tilesParams = self._records[key];

        var params, tileRec;
        for(var tile in tilesParams){
            params = tilesParams[tile];
            tileRec = self._tileRecords[tile];
            if(tileRec[key] === undefined)
                throw "Tile record with key: "+key+", is not set";

            delete tileRec[key];

            //remove empty tiles
            if(Object.keys !== undefined && Object.keys(self._tileRecords[tile]).length === 0)
                delete self._tileRecords[tile];

            calcMapTile(self, tile);
        }

        delete self._records[key];
    };

    TileParamsMan.has = function(self, key){
        return self._records[key] !== undefined;
    };

    /**
     *
     * @param self
     * @param tile
     * @returns {*|null}
     */
    TileParamsMan.get = function(self, tile){
        return self._map[tile] || defaults;
    };

    TileParamsMan.prototype.add = function(key, tilesParams){
        return TileParamsMan.add(this, key, tilesParams);
    };

    TileParamsMan.prototype.remove = function(key){
        return TileParamsMan.remove(this, key);
    };

    TileParamsMan.prototype.get = function(tile){
        return TileParamsMan.get(this, tile);
    };

    TileParamsMan.prototype.has = function(key){
        return TileParamsMan.has(this, key);
    };

    function calcMapTile(self, tile){
        var tileRecs = self._tileRecords[tile], recParams;
        var mapParams = undefined;

        for(var key in tileRecs){
            recParams = tileRecs[key];
            mapParams = mapParams || TileParams.clone(defaults);
            TileParams.add(mapParams, mapParams, recParams);

            for(var param in mapParams)
                mapParams[param] = Math.min(MAX_PARAM_VAL, Math.max(0, mapParams[param]));
        }

        if(mapParams !== undefined)
            self._map[tile] = mapParams;
        else if(self._map[tile] !== undefined)
            delete self._map[tile];
    }

    return TileParamsMan;

});
