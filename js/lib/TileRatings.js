/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 27.04.14
 * Time: 22:10
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {

    var Enumerator = require("lib/enumerator");

    function TileRatings(){
        this.values = {};
        initializeValues(this.values);
    }

    /**
     * @enum {number}
     */
    TileRatings.TileRatingEnum = {
        Wealth: 0,
        Health: 1,
        Crime: 2,
        Culture: 3,
        Education: 4,
        Ecology : 5
    };

    var initializeValues = function(map){
        for(var key in TileRatings.TileRatingEnum){
            map[TileRatings.TileRatingEnum[key]] = 0;
        }
    };

    /**
     * @type {TileRatingEnum}
     */
    //TileRatings.TileRatingEnum = TileRatingEnum;

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

    /**
     * @param [valuePairs]
     * @returns {TileRatings}
     */
    TileRatings.create = function(valuePairs){
        var o = new TileRatings();
        if(valuePairs !== undefined){
            for(var key in valuePairs){
                o.values[key] = valuePairs[key];
            }
        }
        return o;
    };

    TileRatings.prototype.values = null;

    TileRatings.prototype.toJSON = function(){
        return this.values;
    };

    return TileRatings;
});