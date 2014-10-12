define(function(require){

    var ResourceCode = require("core/resourcecode");

    /**
     * @export Resources
     * @type {{}}
     */
    var Resources = {
        zero: null
    };

    //Resources.ResourceCode = ResourceCode;

    /**
     *
     * @param values
     * @returns {*}
     */
    Resources.create = function(values){
        var dict = Object.create(null);
        if(values !== null)
            Resources.copy(dict, values);
        return dict;
    };

    Resources.add = function(out, a, b){
        var va,vb,key;
        for(var name in ResourceCode) {
            key = ResourceCode[name];
            va = a[key] || 0;
            vb = b[key] || 0;
            va = va + vb;
            if(va !== 0 || out[key] !== undefined)
                out[key] = va;
        }

        return out;
    };

    Resources.sub = function(out, a, b){

        var va,vb,key;
        for(var name in ResourceCode) {
            key = ResourceCode[name];
            va = a[key] || 0;
            vb = b[key] || 0;
            va = va + vb;
            if(va !== 0 || out[key] !== undefined)
                out[key] = va;
        }

        return out;
    };

    Resources.addOne = function(out, res, resCode, amount){
        var a = res[resCode] || 0;
        out[resCode] = a + amount;
        return out;
    };

    Resources.subOne = function(out, res, resCode, amount){
        var a = res[resCode] || 0;
        out[resCode] = a - amount;
        return out;
    };

    Resources.mul  = function(out, a, number){
        for(var key in a) {
            out[key] = a[key] * number;
        }

        return out;
    };

    Resources.clone = function(a){
        var out = {};
        Resources.copy(out, a);
        return out;
    };

    Resources.copy = function(to, from){
        for(var key in from) {
            to[key] = from[key];
        }

        return to;
    };

    Resources.every = function(r, callback, args){
        for(var key in r){
            if(!callback(key, r[key], args))
            return false;
        }

        return true;
    };

    Resources.clear = function(input){
        var key;
        for(var name in ResourceCode) {
            key = ResourceCode[name];
            if(input[key] !== undefined)
                input[key] = 0;
        }
    };

    return Resources;
});