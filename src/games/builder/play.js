/**
 * The city builder's own part of the client (client/vkaria): buying land and
 * shaping the ground.
 */
import Landman from "./client/landman";
import Terrainman from "./client/terrainman";

export default {
  create: function (vkaria) {
    vkaria.landman = new Landman(vkaria);
    vkaria.terrainman = new Terrainman(vkaria);
  },

  init: function (vkaria) {
    vkaria.landman.init();
  },
};
