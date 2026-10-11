/**
 * The delivery game: the city is only the scene - built in the city builder
 * and handed over as the city it starts on (data/initialcity) - and the
 * player drives a courier's car about it, taking orders from restaurants to
 * customers.
 */
import Numeral from "numeral";
import Events from "events";
import DeliveryPanel from "./ui/js/delivery";

//the courier's panel over the world, once it is up
var panel = null;

export default {
  name: "delivery",
  //a tick of the clock is a minute of game time: a day goes by in 24
  //minutes of the real thing
  tick: 60000,
  //its cities apart from the city builder's
  saves: "isometrica.delivery.v1",

  //the courier and the car (games/delivery/play)
  client: function () {
    return import("./play");
  },

  //nothing over the world but the courier's panel - put up the first time
  showWorld: function (world) {
    world.showButtons([]);

    if (panel === null) {
      panel = new DeliveryPanel(world.client);
      world.addOverlay(panel.view.el);
    }
  },

  //the courier's money, not the city's
  purse: function (client) {
    var man = client.deliveryman;

    return {
      text: function () {
        var courier = man.courier;

        return (
          "$" + Numeral(courier === null ? 0 : courier.money()).format("0,0.00")
        );
      },
      watch: function (f) {
        var token = Events.on(man, man.events.change, f);

        return function () {
          Events.off(man, man.events.change, token);
        };
      },
    };
  },
};
