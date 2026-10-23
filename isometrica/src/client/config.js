/**
 * Created by User on 28.07.2014.
 */
import namespace from "namespace";

var Client = namespace("Isometrica.Client");

export default (Client.Config = {
  tileSize: 45.255,
  tileZStep: 9.238,
  //chunkSize: (window.matchMedia("handheld").matches ? 8 : 24)
  chunkSize: window.matchMedia("(max-width: 800px)").matches ? 12 : 24,
  //a new city goes somewhere in a square this many tiles wide around where
  //the player was: a fresh one (city-sim ui/session startFreshCity)
  citySpreadTiles: 10000,
});
