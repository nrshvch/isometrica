/**
 * Plays the music the generator makes (src/shared/gen/music.js) the way a
 * game would. The three weathers of a place and time are made - each in a
 * worker of its own, off the page's thread (worker.js) - and started
 * together from the same moment, looping; the weather sets which is heard,
 * and changing it fades one up and the others down over a few seconds, in
 * time. A new place or time fades over to its own three.
 */
import * as Music from "../../src/shared/gen/music.js";
import { audio } from "../../src/client/audio/wake.js";

//made at this rate, whatever the browser plays at - Web Audio converts
var RATE = 44100;

//how long the weather takes to fade over, and a new place or time
var WEATHER_FADE = 3,
  PIECE_FADE = 4;

var made = {},
  making = {},
  workers = [],
  next = 0;

//a worker to make it, round the three of them
function worker() {
  if (workers.length === 0)
    for (var i = 0; i < 3; i++)
      workers.push(
        new Worker(new URL("./worker.js", import.meta.url), {
          type: "module",
        }),
      );

  return workers[next++ % workers.length];
}

/**
 * A piece as a Web Audio buffer - made in a worker the first time, and kept.
 */
function bufferOf(name) {
  if (made[name]) return Promise.resolve(made[name]);
  if (making[name]) return making[name];

  making[name] = new Promise(function (resolve) {
    var w = worker();

    w.addEventListener("message", function got(e) {
      if (e.data.name !== name) return;

      w.removeEventListener("message", got);

      var ctx = audio(),
        buf = ctx.createBuffer(2, e.data.channels[0].length, e.data.rate);

      e.data.channels.forEach(function (c, i) {
        buf.copyToChannel(c, i);
      });

      made[name] = { buffer: buf, ms: e.data.ms };
      resolve(made[name]);
    });

    w.postMessage({ name: name, rate: RATE });
  });

  return making[name];
}

/**
 * A player, telling what it is doing through told: { making: key } while
 * the three are made, then { key, info, seconds, pieces: [[weather, s]] }
 * once they play - info what Music.list() says of the piece.
 */
export function createPlayer(told) {
  var playing = null,
    //what is wanted: { place, time, weather }, or null for quiet
    want = null;

  /**
   * All three weathers of the place and time wanted, started together and
   * looping, the one for the weather turned up - fading in over whatever
   * was playing.
   */
  function start() {
    var key = want.place + "/" + want.time,
      names = Music.WEATHERS.map(function (w) {
        return key + "/" + w;
      }),
      begun = performance.now();

    told({ making: key });

    Promise.all(names.map(bufferOf)).then(function (pieces) {
      if (want === null || want.place + "/" + want.time !== key) return;

      var ctx = audio(),
        now = ctx.currentTime + 0.1,
        master = ctx.createGain(),
        gains = [],
        sources = [];

      master.connect(ctx.destination);
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(
        1,
        now + (playing ? PIECE_FADE : 0.5),
      );

      pieces.forEach(function (p, i) {
        var source = ctx.createBufferSource(),
          gain = ctx.createGain();

        source.buffer = p.buffer;
        source.loop = true;
        gain.gain.value = Music.WEATHERS[i] === want.weather ? 1 : 0;
        source.connect(gain);
        gain.connect(master);
        source.start(now);
        sources.push(source);
        gains.push(gain);
      });

      fade(PIECE_FADE);

      playing = { key: key, master: master, gains: gains, sources: sources };

      told({
        key: key,
        info: Music.list().filter(function (m) {
          return m.name.indexOf(key + "/") === 0;
        })[0],
        seconds: (performance.now() - begun) / 1000,
        pieces: pieces.map(function (p, i) {
          return [Music.WEATHERS[i], p.ms / 1000];
        }),
      });
    });
  }

  //fades out what is playing and stops it
  function fade(seconds) {
    if (playing === null) return;

    var ctx = audio(),
      old = playing,
      now = ctx.currentTime;

    old.master.gain.cancelScheduledValues(now);
    old.master.gain.setValueAtTime(old.master.gain.value, now);
    old.master.gain.linearRampToValueAtTime(0, now + seconds);
    old.sources.forEach(function (s) {
      s.stop(now + seconds + 0.1);
    });
    playing = null;
  }

  //turns up the weather wanted and the others down, in time with each other
  function weather() {
    if (playing === null) return;

    var ctx = audio(),
      now = ctx.currentTime;

    playing.gains.forEach(function (g, i) {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(
        Music.WEATHERS[i] === want.weather ? 1 : 0,
        now + WEATHER_FADE,
      );
    });
  }

  return {
    /**
     * Plays what is wanted: the piece of its place and time, if that is not
     * what plays already (or is being made), heard in its weather.
     */
    play: function (wanted) {
      var was = want;

      want = wanted;

      if (
        was === null ||
        was.place !== wanted.place ||
        was.time !== wanted.time
      )
        start();
      else weather();
    },

    stop: function () {
      want = null;
      fade(1);
    },
  };
}
