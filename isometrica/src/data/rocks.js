/**
 * The stones the world strews over the land, by rock code - what
 * Ambient#getRock hands out. They are only there to look at: nothing is got
 * out of them, and nobody can put one down.
 *
 * Every picture is a tile's worth of ground with the stones on it and their
 * shadows, drawn flat over the tile the way the tile itself is - same size,
 * same pivot. The game paints them as it starts, see shared/gen/stones.
 *
 * Each zone of the climate (core/climate) has stones of its own, both kinds:
 * the grey and brown ones of the green, the same snowed over out in the
 * cold, sandstone and pale rock in the desert. A new one goes on the end, so
 * the codes of the ones before it stay.
 *
 * @type {{heap: boolean, flat: boolean, zone: string, path: string, pivotX: number, pivotY: number}[]}
 */
var Rocks = [];

//every picture, the zone it lies in, and whether it is the thick of a rock
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
      zone: rock[1],
      path: "gen/scenery/" + rock[0] + m,
      pivotX: 32,
      pivotY: 24,
    });
  });
});

export default Rocks;
