/**
 * Created by User on 28.07.2014.
 */
import namespace from "namespace";

var Client = namespace("Isometrica.Client");

export default (Client.Config = {
  //a tile 64 pixels across on screen, 32 to either side: 32 / cos(45deg) -
  //exactly, so tiles a whole number of pixels apart stay a whole number of
  //pixels apart however far from the world's origin they are; 45.255, a
  //hair over, put tiles thousands of them out a fraction of a pixel off,
  //and rows of them rounded to pixels different ways, a line of the
  //background between them
  tileSize: 32 * Math.SQRT2,
  tileZStep: 9.238,
  //chunkSize: (window.matchMedia("handheld").matches ? 8 : 24)
  chunkSize: window.matchMedia("(max-width: 800px)").matches ? 12 : 24,
  //a new city goes somewhere in a square this many tiles wide around where
  //the player was: a fresh one (city-sim ui/session startFreshCity)
  citySpreadTiles: 10000,
});
