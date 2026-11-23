/**
 * The stones the world strews over the land, by rock code - what
 * Ambient#getRock hands out. They are only there to look at: nothing is got
 * out of them, and nobody can put one down.
 *
 * Every picture is a tile's worth of ground with the stones on it and their
 * shadows, drawn flat over the tile the way the tile itself is - same size,
 * same pivot. The game paints them as it starts, see shared/gen/stones.
 *
 * The climate (core/climate) has stones of three kinds, both sizes of each:
 * the grey and brown ones of the green ("temperate"), the same snowed over
 * out in the cold ("cold"), and sandstone and pale rock where it is hot
 * ("hot") - which of them lie in each zone, and how many, core/ambient ROCKS
 * says. A new one goes on the end, so the codes of the ones before it stay.
 *
 * @type {{heap: boolean, flat: boolean, climate: string, path: string, pivotX: number, pivotY: number}[]}
 */
var Rocks = [];

//every picture, the climate it lies in, and whether it is the thick of a rock
//field - five together - or its thin edges and the stones out on their own,
//three strewn about; each the other way round as well ("-m")
[
  ["stone", "temperate", true],
  ["stone0", "temperate", false],
  ["snowstone", "cold", true],
  ["snowstone0", "cold", false],
  ["desertstone", "hot", true],
  ["desertstone0", "hot", false],
].forEach(function (rock) {
  ["", "-m"].forEach(function (m) {
    Rocks.push({
      heap: rock[2],
      flat: true,
      climate: rock[1],
      path: "gen/scenery/" + rock[0] + m,
      pivotX: 32,
      pivotY: 24,
    });
  });
});

export default Rocks;
