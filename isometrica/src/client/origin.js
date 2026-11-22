/**
 * Where the world is put for the engine to draw it: about a tile near where
 * the camera opens - the origin - rather than about the world's own corner.
 *
 * The world is 65536 tiles each way, and a city may stand anywhere in it -
 * tens of thousands of tiles out, over a million units of the world. The
 * engine keeps where things are as float32, which out there is to an eighth
 * of a unit, and a fraction of a pixel goes a different way for every row of
 * tiles: rounded to whole pixels, some rows come out a pixel apart, with a
 * line of nothing between them. Only what is round the camera is ever seen,
 * so where it is drawn is counted from the origin instead, and the numbers
 * stay small, where float32 is good to a hair of a pixel.
 *
 * Tiles are where the world is: what is in the world goes by them, and only
 * what is put where the engine draws it - and read back from there, a point
 * picked on the screen, say - goes through here. The origin is set once, as
 * the client starts, before anything is put anywhere (Vkaria#startServices):
 * the page is opened again for another city.
 */
import Config from "./config";

var Origin = {
  //the tile at 0, 0 in the world as it is drawn
  x: 0,
  y: 0,
};

/**
 * Puts the world about tile x, y - before anything is put in it.
 */
Origin.set = function (x, y) {
  Origin.x = Math.round(x);
  Origin.y = Math.round(y);
};

/**
 * Where tile x - or a spot that many tiles along, a fraction of the way
 * across one - is along the world's x, as it is drawn.
 */
Origin.worldX = function (x) {
  return (x - Origin.x) * Config.tileSize;
};

/**
 * Where tile y is along the world's z, as it is drawn.
 */
Origin.worldZ = function (y) {
  return (y - Origin.y) * Config.tileSize;
};

/**
 * The tile x a spot at x in the world, as it is drawn, is on - and how far
 * across it, a fraction.
 */
Origin.tileX = function (x) {
  return x / Config.tileSize + Origin.x;
};

/**
 * The tile y a spot at z in the world is on.
 */
Origin.tileY = function (z) {
  return z / Config.tileSize + Origin.y;
};

export default Origin;
