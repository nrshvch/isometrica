/**
 * The demolition bench (lab/demolition.html): a few buildings, a few trees
 * planted and a road along them, on a patch of flat grass and nothing else
 * (lab/bench/world) - and all of it cleared the way the game clears ground
 * (client/clearworks): fenced off, the bulldozers coming, a building
 * coming down a tile at a time as they get to it, the trees going over the
 * way they are pushed, the road broken up, and what it all came to floated
 * up once over the lot. Put up again as often as wanted.
 */

//the ground the scene stands on, tiles from the middle of the bench: its
//corner with the least x and y, and how far it goes
var X = -7,
  Y = -4,
  W = 15,
  H = 9;

//what stands on it, each [code, x, y, rotation]: along the back of the road
//an office tower with its plaza, a block of flats with a yard, a town house
//and a pair of semi-detached houses; and in front of it a farmstead
var BUILDINGS = [
  [2126, -6, -3, 0],
  [440, -4, -2, 0],
  [4112, -1, -2, 0],
  [4222, 1, -2, 0],
  [4012, 4, 1, 0],
];

//and the trees: a row of them in front, a clump at the end
var TREES = [
  [-6, 1],
  [-5, 1],
  [-4, 1],
  [-3, 1],
  [-6, 2],
  [-2, 2],
  [0, 1],
  [1, 2],
  [5, -2],
  [6, -2],
  [6, -1],
  [6, 1],
];

//the road between them, along x
var ROAD = { x: -7, y: 0, length: 15 };

//how far the grass reaches out round it, tiles - room for the bulldozers to
//come out of their dust on
var MARGIN = 2;

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Scene(world) {
  this.world = world;
  world.ground(X - MARGIN, Y - MARGIN, W + 2 * MARGIN, H + 2 * MARGIN);
  this.put();
  world.look(0, 0);
}

/**
 * Everything put up again, over whatever was left of it.
 */
Scene.prototype.put = function () {
  var world = this.world;

  world.wipe(X - 2, Y - 2, W + 4, H + 4);
  world.road(ROAD.x, ROAD.y, ROAD.length, false, "asphalt");
  BUILDINGS.forEach(function (b) {
    world.put(b[0], b[1], b[2], b[3]);
  });
  TREES.forEach(function (t) {
    world.plant(t[0], t[1]);
  });
};

/**
 * All of it cleared, the bulldozers out to it.
 *
 * @returns {number} the tiles cleared
 */
Scene.prototype.clear = function () {
  var tiles = [];

  for (var i = 0; i < W; i++)
    for (var j = 0; j < H; j++) tiles.push(this.world.tile(X + i, Y + j));

  return this.world.clear(tiles);
};
