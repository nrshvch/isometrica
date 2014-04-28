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

    window.ttt = TileRatingEnum;

    var initializeValues = function(map){
        for(var key in TileRatingEnum){
            map[TileRatingEnum[key]] = 0;
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

        for(var key in mOut){
            mOut[key] = mA[key] + mB[key];
        }

        return out;
    };

    TileRatings.sub = function(out,a,b){
        var mOut = out.values,
            mA = a.values,
            mB = b.values;

        for(var key in mOut){
            mOut[key] = mA[key] - mB[key];
        }

        return out;
    };

    TileRatings.copy = function(destination, source){
        var dst = destination.values,
            src = source.values;

        for(var key in src){
            dst[key] = src[key];
        }

        return destination;
    };

    TileRatings.create = function(valuePairs){
        var o = new TileRatings();
        for(var key in valuePairs){
            var value = valuePairs[key];
            var enumKey = Enumerator.parse(TileRatingEnum, key);
            if(enumKey != null)
                o.values[TileRatingEnum[enumKey]] = value;
        }

        return o;
    };

    TileRatings.prototype.values = null;

    return TileRatings;
});