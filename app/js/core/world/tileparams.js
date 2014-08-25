/**
 * Created by User on 21.08.2014.
 */
define(function(require){
    var TileParam = require("./tileparam");

    var TileParams = {};

    TileParams.maxValue = 100;

    /**
     * @param values
     * @returns {Object.<TileParam, number>}
     */
    TileParams.create = function(values){
        var dict = Object.create(null);
        if(values !== null)
            TileParams.copy(dict, values);
        return dict;
    };

    TileParams.add = function(out, a, b){
        var va,vb,key;
        for(var name in TileParam) {
            key = TileParam[name];
            va = a[key];
            vb = b[key];

            out[key] = (va !== undefined && vb !== undefined && va + vb) || va || vb || 0;
        }

        return out;
    };

    TileParams.sub = function(out, a, b){
        var va,vb,key;
        for(var name in TileParam) {
            key = TileParam[name];
            va = a[key] || 0;
            vb = b[key] || 0;
            out[key] = va - vb;
        }

        return out;
    };

    TileParams.mul  = function(out, a, number){
        for(var key in a) {
            out[key] = a[key] * number;
        }

        return out;
    };

    TileParams.clone = function(a){
        var out = {};
        TileParams.copy(out, a);
        return out;
    };

    TileParams.copy = function(to, from){
        for(var key in from) {
            to[key] = from[key];
        }

        return to;
    };

    TileParams.every = function(r, callback, args){
        for(var key in r){
            if(!callback(key, r[key], args))
                return false;
        }

        return true;
    };

    TileParams.clear = function(input){
        var key;
        for(var name in TileParam) {
            key = TileParam[name];
            if(input[key] !== undefined)
                input[key] = 0;
        }
    };

    return TileParams;
});
