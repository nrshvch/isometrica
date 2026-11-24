import { test } from "vitest";
import Pixels from "./index.js";

//a 1024 by 1024 page, as a canvas cache page is, and pictures to put on it
var PAGE = 1024,
  page = new Uint8ClampedArray(PAGE * PAGE * 4);

function picture(w, h, alpha) {
  var data = new Uint8ClampedArray(w * h * 4);

  for (var i = 0; i < data.length; i += 4) {
    data[i] = i & 255;
    data[i + 1] = (i >> 8) & 255;
    data[i + 2] = 128;
    data[i + 3] = alpha;
  }

  return { width: w, height: h, data: data };
}

var opaque = picture(128, 128, 255),
  half = picture(128, 128, 128);

//sixteen 128 by 128 pictures across the top of the page
function sixteen(put) {
  return function () {
    for (var i = 0; i < 16; i++) put((i % 8) * 128, (i >> 3) * 128);
  };
}

test("Pixels", async function ({ bench }) {
  await bench.compare(
    bench(
      "over, 128x128 opaque, 16 times",
      sixteen(function (x, y) {
        Pixels.over(page, PAGE, opaque, 0, 0, 128, 128, x, y);
      }),
    ),
    bench(
      "over, 128x128 half there, 16 times",
      sixteen(function (x, y) {
        Pixels.over(page, PAGE, half, 0, 0, 128, 128, x, y);
      }),
    ),
    bench(
      "lighten, 128x128, 16 times",
      sixteen(function (x, y) {
        Pixels.lighten(page, PAGE, half, 0, 0, 128, 128, x, y, 0.5);
      }),
    ),
  );
});
