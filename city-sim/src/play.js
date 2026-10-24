/**
 * The city builder's own part of the client (client/vkaria): shaping the
 * ground, the city's border - and no names over the cities.
 */
import Terrainman from "./client/terrainman";
import CityBorder from "./client/cityborder";

export default {
  create: function (vkaria) {
    vkaria.terrainman = new Terrainman(vkaria);
    vkaria.cityBorder = new CityBorder(vkaria);
    //the city's name is on the HUD (ui/world/Hud) - not over the world too,
    //for now
    vkaria.cityman.names = false;
  },

  init: function (vkaria) {
    vkaria.cityBorder.init();
  },
};
