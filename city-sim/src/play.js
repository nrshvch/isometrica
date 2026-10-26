/**
 * The city builder's own part of the client (client/vkaria): shaping the
 * ground, the city's border and the town's limits over its roads out - and no
 * names over the cities.
 */
import Terrainman from "./client/terrainman";
import CityBorder from "./client/cityborder";

var border = null;

export default {
  create: function (vkaria) {
    vkaria.terrainman = new Terrainman(vkaria);
    vkaria.cityBorder = border = new CityBorder(vkaria);
    //the city's name is on the HUD (ui/world/Hud) - not over the world too,
    //for now
    vkaria.cityman.names = false;
  },

  init: function (vkaria) {
    vkaria.cityBorder.init();
  },

  //where a road crosses the city's border, the sign of its limits
  //(isometrica client/roadview townSignsOf)
  townSignsOn: function (tile) {
    return border !== null ? border.townSignsOn(tile) : [];
  },

  //what is being put down, for the area it would take (isometrica
  //client/buildman)
  placing: function (what) {
    if (border !== null) border.placing(what);
  },
};
