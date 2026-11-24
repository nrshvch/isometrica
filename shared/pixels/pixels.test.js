import { describe, expect, it } from "vitest";
import Pixels from "./index.js";

//a picture w by h, every pixel the colour given
function picture(w, h, rgba) {
  var data = new Uint8ClampedArray(w * h * 4);

  for (var i = 0; i < data.length; i += 4) data.set(rgba, i);

  return { width: w, height: h, data: data };
}

function pixelAt(data, w, x, y) {
  var i = (y * w + x) * 4;

  return Array.from(data.subarray(i, i + 4));
}

describe("Pixels.over", function () {
  it("puts an opaque picture over what is there", function () {
    var dst = picture(4, 4, [0, 0, 255, 255]).data;

    Pixels.over(dst, 4, picture(2, 2, [255, 0, 0, 255]), 0, 0, 2, 2, 1, 1);

    expect(pixelAt(dst, 4, 1, 1)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(dst, 4, 2, 2)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(dst, 4, 0, 0)).toEqual([0, 0, 255, 255]);
    expect(pixelAt(dst, 4, 3, 3)).toEqual([0, 0, 255, 255]);
  });

  it("leaves what is there under a transparent pixel", function () {
    var dst = picture(2, 2, [1, 2, 3, 255]).data;

    Pixels.over(dst, 2, picture(2, 2, [255, 255, 255, 0]), 0, 0, 2, 2, 0, 0);

    expect(Array.from(dst)).toEqual(
      Array.from(picture(2, 2, [1, 2, 3, 255]).data),
    );
  });

  it("blends a half-there pixel as a canvas does, source-over", function () {
    var dst = new Uint8ClampedArray([0, 0, 255, 255]);

    Pixels.over(dst, 1, picture(1, 1, [255, 0, 0, 128]), 0, 0, 1, 1, 0, 0);
    expect(Array.from(dst)).toEqual([128, 0, 127, 255]);

    var empty = new Uint8ClampedArray(4);

    Pixels.over(empty, 1, picture(1, 1, [10, 20, 30, 128]), 0, 0, 1, 1, 0, 0);
    expect(Array.from(empty)).toEqual([10, 20, 30, 128]);
  });

  it("leaves out what falls outside, on every side", function () {
    var dst = picture(3, 3, [0, 0, 0, 255]).data,
      src = picture(3, 3, [9, 9, 9, 255]);

    Pixels.over(dst, 3, src, 0, 0, 3, 3, -2, -2);
    Pixels.over(dst, 3, src, 0, 0, 3, 3, 2, 2);

    expect(pixelAt(dst, 3, 0, 0)).toEqual([9, 9, 9, 255]);
    expect(pixelAt(dst, 3, 2, 2)).toEqual([9, 9, 9, 255]);
    expect(pixelAt(dst, 3, 1, 1)).toEqual([0, 0, 0, 255]);
    expect(dst.length).toBe(36);
  });

  it("lands on the nearest whole pixel", function () {
    var dst = picture(3, 1, [0, 0, 0, 255]).data;

    Pixels.over(dst, 3, picture(1, 1, [7, 7, 7, 255]), 0, 0, 1, 1, 0.5, 0);

    expect(pixelAt(dst, 3, 1, 0)).toEqual([7, 7, 7, 255]);
    expect(pixelAt(dst, 3, 0, 0)).toEqual([0, 0, 0, 255]);
  });
});

describe("Pixels.silhouette", function () {
  it("is the shape in one colour", function () {
    var dst = new Uint8ClampedArray([0, 0, 0, 255]);

    Pixels.silhouette(
      dst,
      1,
      picture(1, 1, [9, 9, 9, 255]),
      0,
      0,
      1,
      1,
      0,
      0,
      1,
      2,
      3,
    );

    expect(Array.from(dst)).toEqual([1, 2, 3, 255]);
  });
});

describe("Pixels.lighten", function () {
  it("adds white, as much as asked", function () {
    var dst = new Uint8ClampedArray([100, 100, 100, 255]);

    Pixels.lighten(
      dst,
      1,
      picture(1, 1, [0, 0, 0, 255]),
      0,
      0,
      1,
      1,
      0,
      0,
      0.5,
    );

    expect(Array.from(dst)).toEqual([228, 228, 228, 255]);
  });

  it("adds nothing where the picture is not there", function () {
    var dst = new Uint8ClampedArray([100, 100, 100, 255]);

    Pixels.lighten(dst, 1, picture(1, 1, [0, 0, 0, 0]), 0, 0, 1, 1, 0, 0, 1);

    expect(Array.from(dst)).toEqual([100, 100, 100, 255]);
  });
});
