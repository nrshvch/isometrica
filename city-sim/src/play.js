/**
 * The city builder's own part of the client (client/vkaria): shaping the
 * ground - and no names over the cities.
 */
import Terrainman from "./client/terrainman";

export default {
  create: function (vkaria) {
    vkaria.terrainman = new Terrainman(vkaria);
    //the city's name is on the HUD (ui/world/Hud) - not over the world too,
    //for now
    vkaria.cityman.names = false;
  },
};
