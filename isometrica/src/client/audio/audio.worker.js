import * as Sounds from "../../shared/gen/sounds.js";
import * as Music from "../../shared/gen/music.js";

//The audio worker: makes the sounds and the music (shared/gen/sounds,
//shared/gen/music) off the main thread, so making them never holds up a
//frame. See client/audio/maker for the other end.

self.onmessage = function (e) {
  var m = e.data,
    made;

  try {
    made =
      m.kind === "music"
        ? Music.generate(m.name, m.rate)
        : Sounds.generate(m.name, m.rate);
  } catch (err) {
    self.postMessage({ id: m.id, error: String(err) });
    return;
  }

  self.postMessage(
    { id: m.id, rate: made.rate, channels: made.channels },
    made.channels.map(function (c) {
      return c.buffer;
    }),
  );
};
