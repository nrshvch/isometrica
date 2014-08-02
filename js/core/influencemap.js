/**
 * Created by User on 29.07.2014.
 */
define(function (require) {
    var Terrain = require("./terrain");

    function InfluenceMap(){
        this.map = {};
    }

    InfluenceMap.prototype.events = {
        areaChange: 0
    };

    /**
     * Claim your right to own this cell
     * @param map
     * @param city
     * @param index
     * @param value
     */
    function addInfluence(map, city, index, value){
        if(!map[index])
            map[index] = {
                count: 0,
                influences: {}
            };

        var cell = map[index];

        if(!cell.influences[city]) {
            cell.influences[city] = {
                order: cell.count++,
                value: value
            }
        }else{
            cell.influences[city].value += value;
        }
    }

    /**
     * calculate influence area of single source.
     * @param xy
     * @param influenceRadius
     * @constructor
     */
    function calcInfluenceArea(xy,influenceRadius){
        var x = Terrain.extractX(xy);
        var y = Terrain.extractY(xy);
        var r = [];
        var iter = new Terrain.TerrainIterator(x - influenceRadius, y - influenceRadius, influenceRadius * 2, influenceRadius * 2);
        var index;

        while((index = iter.next()) !== -1){
            var _x = Terrain.extractX(index);
            var _y = Terrain.extractY(index);
            var d = Math.sqrt(Math.pow(_x-x, 2) + Math.pow(_y-y,2));
            if(d > influenceRadius)continue;
            var value = influenceRadius + 1 - d;
            r.push({
                x: _x,
                y: _y,
                value: value,
                index: index
            });

        }

        return r;
    }

    InfluenceMap.prototype.setInfluenceArea = function(city, influenceSources){
        for(var index in influenceSources){
            var area = calcInfluenceArea(index, influenceSources[index]);

            for(var j = 0, lj = area.length; j < lj; j++){
                var item = area[j];
                addInfluence(this.map, city, item.index, item.value);
            }
        }
    };

    InfluenceMap.prototype.getInfluenceArea = function(city){
        var ret = [];
        for(var index in this.map){
            var cell = this.map[index];
            var influence = cell.influences[city];

            if(influence){
                ret[index] = influence.value;
            }
        }
        return ret;
    };

    return InfluenceMap;
});