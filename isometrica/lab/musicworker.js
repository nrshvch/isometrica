/**
 * Makes a piece of music off the page's thread (lab/music.js): given a name
 * and a rate, sends back its two channels.
 */
import * as Music from "../src/shared/gen/music.js";

self.onmessage = function (e) {
  var started = performance.now(),
    piece = Music.generate(e.data.name, e.data.rate);

  self.postMessage(
    {
      name: e.data.name,
      rate: piece.rate,
      channels: piece.channels,
      ms: performance.now() - started,
    },
    piece.channels.map(function (c) {
      return c.buffer;
    }),
  );
};
