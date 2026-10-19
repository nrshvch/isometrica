/**
 * The city builder: the city is the player's to found, build, lay roads in,
 * shape the ground under and buy land for - and where the city the delivery
 * game is played in is built, to be handed over to it (games/builder/ui/city
 * export).
 */
import Catalogue from "./ui/modules/catalogue/js/catalogue";
import City from "./ui/modules/city/js/city";
import { showWorld } from "./ui/modules/world/js/tools";

export default {
  name: "builder",
  //a tick of the clock is five minutes of game time: a day goes by in under
  //five minutes of the real thing
  tick: 300000,
  //what its cities are saved under in localStorage - a new generation drops
  //the saves of before
  saves: "city-sim.v1",
  //and where they are kept on the server, the game's own Worker
  //(worker/saves) - for the city to open anywhere by its address
  api: "/api",

  //land, and shaping the ground (games/builder/play)
  client: function () {
    return import("./play");
  },

  screens: { catalogue: Catalogue, city: City },

  route: function (gs, module, args) {
    switch (module) {
      case "catalogue":
      case "city":
        gs.show(module, args);
        break;
      case "build":
        gs.show("world");
        //and for a road, what it is laid in and which ways it goes
        //(ui/world pickRoad, pickWay)
        gs.client.buildman.build(
          args[0],
          args[1] ? { material: args[1], way: args[2] } : undefined,
        );
        break;
      case "terrain":
        gs.show("world");
        gs.client.terrainman.enter();
        break;
      case "land":
        gs.show("world");
        gs.client.landman.enter();
        break;
    }
  },

  showWorld: showWorld,

  //the treasury is what the city screen is mostly about - clicked again, it
  //puts it away
  moneyClick: function (gs, city) {
    if (gs.showing() === "city") {
      gs.ui.navigate("world");
      return;
    }

    //an action owns the world while it runs - opening the city screen from
    //under it would leave the action with no buttons and no way to finish
    if (gs.worldScreen().busy()) return;

    gs.ui.navigate("city", [city.id()]);
  },
};
