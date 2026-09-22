/**
 * Created by User on 28.07.2014.
 */
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.Config = {
    tickDelay: 1000,
    //what it costs to take one tile's worth of anything off the map, whether
    //that is a bulldozed tile or a tree a construction site has to make way for
    clearTileCost: 25,
    //what it costs to raise, lower or flatten one tile of land, counting every
    //tile the ground moves under - any tree on it is cleared on top of that,
    //at clearTileCost
    terraformTileCost: 1000,
    //raising the bottom of the sea costs this many times more
    terraformWaterFactor: 10
};

export default Core.Config;
