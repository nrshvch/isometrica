/**
 * Created by User on 25.08.2014.
 */
import TileParam from "../world/tileparam";
import namespace from "namespace";

var CityService = namespace("Isometrica.Core.CityService");
CityService.TileParams = CityTilesParams;

function CityTilesParams(city) {
  this.city = city;
}

/**
 * How green the town is: the ecology of the ground its buildings stand on,
 * on average - what the parks round them raise - or -1 while nothing does.
 */
CityTilesParams.prototype.avgEco = function () {
  var buildings = this.city.buildingService.getBuildings(),
    worldTilesParams = this.city.world.tileParams,
    ecosum = 0,
    i;

  for (i = 0; i < buildings.length; i++)
    ecosum += worldTilesParams.get(buildings[i].tile)[TileParam.Ecology] || 0;

  return (buildings.length > 0 && ecosum / buildings.length) || -1;
};

export default CityTilesParams;
