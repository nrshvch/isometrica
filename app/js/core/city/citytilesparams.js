/**
 * Created by User on 25.08.2014.
 */
define(function(require){
    var TileParam = require("../world/tileparam");

    function CityTilesParams(city){
        this.city = city;
    }

    CityTilesParams.prototype.avgEco = function(){
        var area = this.city.area.getInfluenceArea(),
            t,
            worldTilesParams = this.city.world.tileParams,
            params, eco, ecosum = 0, i = 0;

        for(var key in area){
            t = area[key];
            params = worldTilesParams.get(t);
            eco = params[TileParam.Ecology] || 0;
            ecosum += eco;
            i++;
        }

        return (i > 0 && ecosum / i) || -1;
    };

    return CityTilesParams;
});
