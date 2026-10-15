/**
 * The stones the world strews over the land, by rock code - what
 * Ambient#getRock hands out. They are only there to look at: nothing is got
 * out of them, and nobody can put one down.
 *
 * Every picture is a tile's worth of ground with the stones on it and their
 * shadows, drawn flat over the tile the way the tile itself is - same size,
 * same pivot. The game paints them as it starts, see shared/gen/stones.
 *
 * @type {{heap: boolean, flat: boolean, path: string, pivotX: number, pivotY: number}[]}
 */
var Rocks = [
  //five together - the thick of a rock field
  { heap: true, flat: true, path: "gen/scenery/stone", pivotX: 32, pivotY: 24 },
  {
    heap: true,
    flat: true,
    path: "gen/scenery/stone-m",
    pivotX: 32,
    pivotY: 24,
  },
  //three strewn about - the thin edges of one, and stones out on their own
  {
    heap: false,
    flat: true,
    path: "gen/scenery/stone0",
    pivotX: 32,
    pivotY: 24,
  },
  {
    heap: false,
    flat: true,
    path: "gen/scenery/stone0-m",
    pivotX: 32,
    pivotY: 24,
  },
];

export default Rocks;
