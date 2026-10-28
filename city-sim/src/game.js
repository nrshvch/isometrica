/**
 * The city builder: the city is the player's to found, build, lay roads in,
 * shape the ground under and buy land for - and where the city the delivery
 * game is played in is built, to be handed over to it (ui/city export).
 * What the game is, for the world it is played in (ui/session).
 */
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
  //where it is played for good: a city's address is this and its id, the
  //one shared from the HUD (ui/world/Hud)
  url: "https://peeps.land",

  //the city a brand new player starts on - its own, not the one the
  //delivery game starts on (isometrica data/initialcity)
  initialCity: function () {
    return import("./initialcity");
  },

  //and the big one, Peepstown - the delivery game's - to start over on from
  //the menu as well
  bigCity: function () {
    return import("./peepstown");
  },

  //land, and shaping the ground (play.js)
  client: function () {
    return import("./play");
  },
};
