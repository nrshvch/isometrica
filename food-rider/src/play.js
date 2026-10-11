/**
 * The delivery game's own part of the client (client/vkaria): the courier,
 * their car and the orders.
 */
import Deliveryman from "./client/deliveryman";

export default {
  create: function (vkaria) {
    vkaria.deliveryman = new Deliveryman(vkaria);
  },

  //the city is the scene: nothing about it is shown, and the camera stays on
  //the courier's car
  start: function (vkaria) {
    vkaria.serviceman.quiet();
    vkaria.camera.cameraScript.follow = true;
    vkaria.deliveryman.init();
  },
};
