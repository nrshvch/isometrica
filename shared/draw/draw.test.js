import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import { DrawList, Pictures, Visible } from "./index.js";

//an isometric world-to-screen matrix, column-major: x right-down, z left-down
function iso(scale, tx, ty) {
  var M = new Float64Array(16);

  M[0] = scale;
  M[1] = scale / 2;
  M[4] = 0;
  M[5] = -scale;
  M[8] = -scale;
  M[9] = scale / 2;
  M[12] = tx;
  M[13] = ty;
  M[15] = 1;

  return M;
}

/*
 * The plain way: every row an object, kept if on the screen, sorted by
 * layer, then the same 16-bit depth key, then the order culled in.
 */
function plain(lists, pictures, M, width, height, pad, D) {
  var out = [];

  lists.forEach(function (list, li) {
    for (var row = 0; row < list.count; row++) {
      var p = list.picture[row],
        w = pictures.width[p],
        h = pictures.height[p];

      if (!w) continue;

      var x = list.x[row],
        y = list.y[row],
        z = list.z[row],
        sx = Math.floor(
          M[0] * x + M[4] * y + M[8] * z + M[12] - pictures.pivotX[p] + 0.5,
        ),
        sy = Math.floor(
          M[1] * x + M[5] * y + M[9] * z + M[13] - pictures.pivotY[p] + 0.5,
        );

      if (
        sx > width + pad ||
        sx + w < -pad ||
        sy > height + pad ||
        sy + h < -pad
      )
        continue;

      out.push({
        list: li,
        row: row,
        sx: sx,
        sy: sy,
        layer: list.layer[row],
        depth: D[0] * x + D[1] * y + D[2] * z,
        seq: out.length,
      });
    }
  });

  var byLayer = {};

  out.forEach(function (e) {
    var r = (byLayer[e.layer] = byLayer[e.layer] || {
      min: Infinity,
      max: -Infinity,
    });

    r.min = Math.min(r.min, e.depth);
    r.max = Math.max(r.max, e.depth);
  });
  out.forEach(function (e) {
    var r = byLayer[e.layer],
      range = r.max - r.min;

    e.key =
      range > 0
        ? Math.min(((e.depth - r.min) * (0xffff / range)) | 0, 0xffff)
        : 0;
  });

  return out.sort(function (a, b) {
    return a.layer - b.layer || a.key - b.key || a.seq - b.seq;
  });
}

describe("Pictures", function () {
  it("numbers pictures in the order added, and grows", function () {
    var pictures = Pictures(1);

    expect(pictures.add(10, 20, 5, 18)).toBe(0);
    expect(pictures.add(30, 40, 1, 2, 3, 0.5, 0.25)).toBe(1);
    expect(pictures.width[1]).toBe(30);
    expect(pictures.page[0]).toBe(-1);
    expect(pictures.page[1]).toBe(3);
    expect(pictures.v[1]).toBe(0.25);
    expect(pictures.count).toBe(2);
  });
});

describe("DrawList", function () {
  it("adds rows, alpha 1 and tag -1 unless given, and grows", function () {
    var list = DrawList(1);

    list.add(1, 2, 3, 4);
    list.add(5, 6, 7, 8, 2, 99);

    expect(list.count).toBe(2);
    expect(list.alpha[0]).toBe(1);
    expect(list.tag[0]).toBe(-1);
    expect(list.layer[1]).toBe(2);
    expect(list.tag[1]).toBe(99);
    list.clear();
    expect(list.count).toBe(0);
  });
});

describe("Visible", function () {
  it("culls and sorts as the plain way does, over many lists and layers", function () {
    var random = Random(1),
      pictures = Pictures(),
      lists = [DrawList(), DrawList(), DrawList()],
      visible = Visible(4),
      D = [1, -1, 1];

    for (var p = 0; p < 20; p++)
      pictures.add(
        p === 7 ? 0 : random.int(8, 80),
        random.int(8, 120),
        random.int(0, 40),
        random.int(0, 110),
      );

    lists.forEach(function (list) {
      for (var i = 0; i < 3000; i++)
        list.add(
          random.range(-400, 400),
          random.int(0, 3) * 8,
          random.range(-400, 400),
          random.int(0, 19),
          random.int(0, 3),
        );
    });

    [iso(1, 400, 300), iso(0.5, 100, 50), iso(2, -100, 700)].forEach(
      function (M) {
        var expected = plain(lists, pictures, M, 800, 600, 16, D);

        visible.clear();
        lists.forEach(function (list) {
          visible.cull(list, pictures, M, 800, 600, 16);
        });
        visible.sort(D, 4);

        expect(visible.count).toBe(expected.length);
        expect(expected.length).toBeGreaterThan(100);

        for (var i = 0; i < visible.count; i++) {
          var e = visible.order[i];

          expect([
            visible.list[e],
            visible.rows[e],
            visible.sx[e],
            visible.sy[e],
          ]).toEqual([
            expected[i].list,
            expected[i].row,
            expected[i].sx,
            expected[i].sy,
          ]);
          expect(visible.listOf(e)).toBe(lists[expected[i].list]);
        }

        for (var l = 0; l < 4; l++) {
          var n = expected.filter(function (e) {
            return e.layer === l;
          }).length;

          expect(visible.layerStarts[l + 1] - visible.layerStarts[l]).toBe(n);
        }
      },
    );
  });

  it("never draws a picture that is not ready", function () {
    var pictures = Pictures(),
      list = DrawList(),
      visible = Visible();

    list.add(0, 0, 0, pictures.add(0, 10));
    visible.clear();
    expect(visible.cull(list, pictures, iso(1, 0, 0), 100, 100, 0)).toBe(0);
  });

  it("rounds a spot a hair under a whole pixel up, as the engine does", function () {
    var pictures = Pictures(),
      list = DrawList(),
      visible = Visible();

    list.add(9.9999999, 0, 0, pictures.add(4, 4));
    visible.clear();
    visible.cull(list, pictures, iso(1, 0, 0), 100, 100, 0);
    expect(visible.sx[0]).toBe(10);
  });

  it("keeps a picture just touching the edge, and lets one past the pad go", function () {
    var pictures = Pictures(),
      list = DrawList(),
      visible = Visible(),
      pic = pictures.add(10, 10),
      M = iso(1, 0, 0);

    M[1] = M[5] = M[9] = 0;
    list.add(-10, 0, 0, pic);
    list.add(-11, 0, 0, pic);
    list.add(-14, 0, 0, pic);
    list.add(-15, 0, 0, pic);
    visible.clear();
    expect(visible.cull(list, pictures, M, 100, 100, 0)).toBe(1);
    visible.clear();
    expect(visible.cull(list, pictures, M, 100, 100, 4)).toBe(3);
  });
});
