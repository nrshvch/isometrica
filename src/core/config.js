/**
 * Created by User on 28.07.2014.
 */
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.Config = {
    tickDelay: 1000,
    //what it costs to take one tile's worth of anything off the map, whether
    //that is a bulldozed tile or a tree a construction site has to make way for
    clearTileCost: 100
};

export default Core.Config;
