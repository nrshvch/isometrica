/**
 * The city builder's own part of the client (client/vkaria): buying land and
 * shaping the ground - and no names over the cities.
 */
import Landman from "./client/landman";
import Terrainman from "./client/terrainman";

export default {
  create: function (vkaria) {
    vkaria.landman = new Landman(vkaria);
    vkaria.terrainman = new Terrainman(vkaria);
    //the city's name is on the HUD (ui/world/Hud) - not over the world too,
    //for now
    vkaria.cityman.names = false;
  },

  init: function (vkaria) {
    vkaria.landman.init();
  },
};
