/**
 * The stones the world strews over the land, by rock code - what
 * Ambient#getRock hands out. They are only there to look at: nothing is got
 * out of them, and nobody can put one down.
 *
 * Every picture is a tile's worth of ground with the stones on it and their
 * shadows, drawn flat over the tile the way the tile itself is - same size,
 * same pivot. See tools/genstones.js for where they come from.
 *
 * @type {{heap: boolean, flat: boolean, path: string, pivotX: number, pivotY: number}[]}
 */
var Rocks = [
    //five together - the thick of a rock field
    {heap: true, flat: true, path: "scenery/stone.png", pivotX: 32, pivotY: 24},
    {heap: true, flat: true, path: "scenery/stone-m.png", pivotX: 32, pivotY: 24},
    //three strewn about - the thin edges of one, and stones out on their own
    {heap: false, flat: true, path: "scenery/stone0.png", pivotX: 32, pivotY: 24},
    {heap: false, flat: true, path: "scenery/stone0-m.png", pivotX: 32, pivotY: 24}
];

export default Rocks;
