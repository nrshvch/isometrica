define(function(require){

    var ResourceCode = require("lib/resourcecode");

    var Resources = {};

    Resources.ResourceCode = ResourceCode;

    Resources.create = function(values){
        var res = Resources.clone(Resources.zero);
        if(values !== undefined){
            for(var key in values){
                var index = ResourceCode[key];

                if(index === undefined)
                    throw "Resource.create : unknown resource code "+key;

                res[index] = values[key];
            }
        }
        return res;
    };

    Resources.zero = [0,0,0,0,0,0,0,0,0,0,0];

    Resources.add = function(out, a, b){
        var len = a.length;
        for(var i = 0; i < len; i++){
            out[i] = a[i] + b[i];
        }
        return out;
    };

    Resources.sub = function(out, a, b){
        var len = a.length;
        for(var i = 0; i < len; i++){
            out[i] = a[i] - b[i];
        }
        return out;
    };

    Resources.mul  = function(out, a, number){
        var len = a.length;
        for(var i = 0; i < len; i++){
            out[i] = a[i] * number;
        }
        return out;
    };

    Resources.clone = function(a){
        var out = new Array(a.length);
        Resources.copy(out, a);
        return out;
    };

    Resources.copy = function(to, from){
        for(var i = 0; i<from.length;i++){
            to[i] = from[i];
        }
        return to;
    };

    Resources.every = function(r, callback){
        for(var i = 0; i < 0; i++){
            if(!callback(r[i], i))
            return false;
        };
        return true;
    };

    return Resources;
});