/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 27.04.14
 * Time: 22:10
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {

    var Enumerator = require("lib/enumerator");

    var TileRatingEnum = Enumerator.create({
        Wealth: 0,
        Health: 1,
        Crime: 2,
        Culture: 3,
        Education: 4,
        Ecology : 5
    });

    var initializeValues = function(map){
        for(var key in TileRatingEnum){
            map[key] = 0;
        }
    };

    function TileRatings(){
        this.values = {};
        initializeValues(this.values);
    }

    //TileRating.prototype = Object.create(null);

    TileRatings.TileRatingEnum = TileRatingEnum;

    TileRatings.add = function(out,a,b){
        var mOut = out.values,
            mA = a.values,
            mB = b.values;

        for(var key in out){
            out[key] = a[key] + b[key];
        }

        return out;
    };

    TileRatings.sub = function(out,a,b){
        var mOut = out.values,
            mA = a.values,
            mB = b.values;

        for(var key in out){
            out[key] = a[key] - b[key];
        }

        return out;
    };

    TileRatings.copy = function(destination, source){
        for(var key in source){
            destination[key] = source[key];
        }

        return destination;
    };

    TileRatings.create = function(valuePairs){
        var o = new TileRatings();
        if(Array.isArray(valuePairs)){
            for(var pair in valuePairs){
                o[pair.key] = pair.value;
            }
        }
        return o;
    };

    TileRatings.prototype.values = null;

    return TileRatings;
});