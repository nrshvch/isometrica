/**
 * The stones the world strews over the land, by rock code (Ambient#getRock);
 * a new one goes on the end, so the codes before it stay.
 * See isometrica/.claude/skills/generators/ground.md (Woods, trees, stones).
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
