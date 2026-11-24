import { test } from "vitest";
import Random from "../random/index.js";
import { DrawList, Pictures, Visible } from "./index.js";

var N = 100000,
  random = Random(1),
  pictures = Pictures(),
  list = DrawList(N),
  visible = Visible(N),
  objects = [],
  M = new Float64Array([
    1, 0.5, 0, 0, 0, -1, 0, 0, -1, 0.5, 0, 0, 2000, 500, 0, 1,
  ]),
  D = [1, -1, 1];

for (var p = 0; p < 64; p++)
  pictures.add(random.int(16, 64), random.int(16, 96), 16, 80);

for (var i = 0; i < N; i++) {
  var x = random.range(0, 4000),
    y = random.int(0, 3) * 8,
    z = random.range(0, 4000),
    pic = random.int(0, 63),
    layer = random.int(0, 3);

  list.add(x, y, z, pic, layer);
  objects.push({ x: x, y: y, z: z, picture: pic, layer: layer });
}

test("Visible beside objects and Array.prototype.sort", async function ({
  bench,
}) {
  var out = [];

  await bench.compare(
    bench("Visible, 100k rows culled to 1920x1080 and sorted", function () {
      visible.clear();
      visible.cull(list, pictures, M, 1920, 1080, 32);
      visible.sort(D, 4);
    }),
    bench("objects, 100k culled to 1920x1080 and sorted", function () {
      out.length = 0;
      for (var i = 0; i < N; i++) {
        var o = objects[i],
          w = pictures.width[o.picture],
          h = pictures.height[o.picture],
          sx = Math.floor(o.x - o.z + 2000 - 16 + 0.5),
          sy = Math.floor(o.x * 0.5 - o.y + o.z * 0.5 + 500 - 80 + 0.5);

        if (sx > 1952 || sx + w < -32 || sy > 1112 || sy + h < -32) continue;
        out.push({ o: o, sx: sx, sy: sy, depth: o.x - o.y + o.z });
      }
      out.sort(function (a, b) {
        return a.o.layer - b.o.layer || a.depth - b.depth;
      });
    }),
  );
});
