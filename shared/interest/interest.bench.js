import { test } from "vitest";
import { Grid, Quadtree } from "../spatial/index.js";
import { Interest } from "./index.js";

//a camera's footprint of 1600 x 1000 panning over 64-wide regions, rings
//of 1, 3 and 6 regions round it, as isometrica is to use them
var RINGS = {
  view: { enter: 0, leave: 32 },
  near: { enter: 192, leave: 256 },
  coarse: { enter: 384, leave: 448 },
};

test("Interest", async function ({ bench }) {
  var grid = Interest(Grid(64), { rings: RINGS }),
    tree = Quadtree(-524288, -524288, 1048576, 14),
    quad = Interest(
      {
        within: function (a, b, c, d, out) {
          return tree.within(a, b, c, d, 14, out);
        },
        bounds: tree.bounds,
      },
      { rings: RINGS },
    ),
    g = grid.observer(),
    q = quad.observer(),
    t = 0,
    x = 0;

  await bench.compare(
    bench("a frame's update on a grid, the camera panning", function () {
      t += 33;
      x += 7;
      grid.look(g, x, 0, x + 1600, 1000);
      grid.update(t);
    }),
    bench("a frame's update on a quadtree, the camera panning", function () {
      t += 33;
      x += 7;
      quad.look(q, x, 0, x + 1600, 1000);
      quad.update(t);
    }),
  );
});
