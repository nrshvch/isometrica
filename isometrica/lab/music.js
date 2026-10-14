/**
 * The music lab: plays the music the generator makes (src/shared/gen/
 * music.js) the way a game would. The three weathers of a place and time
 * are made - each in a worker of its own, off the page's thread - and
 * started together from the same moment, looping; the weather sets which is
 * heard, and changing it fades one up and the others down over a few
 * seconds, in time. A new place or time fades over to its own three.
 */
import * as Music from "../src/shared/gen/music.js";

//made at this rate, whatever the browser plays at - Web Audio converts
var RATE = 44100;

//how long the weather takes to fade over, and a new place or time
var WEATHER_FADE = 3,
  PIECE_FADE = 4;

var context = null,
  made = {},
  making = {},
  workers = [],
  next = 0,
  want = { place: "town", time: "day", weather: "clear" },
  playing = null,
  on = false;

function status(text) {
  document.getElementById("status").innerHTML = text;
}

function audio() {
  if (context === null) context = new AudioContext();

  return context;
}

//a worker to make it, round the three of them
function worker() {
  if (workers.length === 0)
    for (var i = 0; i < 3; i++)
      workers.push(
        new Worker(new URL("./musicworker.js", import.meta.url), {
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
 * All three weathers of the place and time wanted, started together and
 * looping, the one for the weather turned up - fading in over whatever was
 * playing.
 */
function start() {
  var key = want.place + "/" + want.time,
    names = Music.WEATHERS.map(function (w) {
      return key + "/" + w;
    }),
    begun = performance.now();

  status("making " + key + ": " + Music.WEATHERS.join(", ") + "...");

  Promise.all(names.map(bufferOf)).then(function (pieces) {
    var ctx = audio(),
      now = ctx.currentTime + 0.1,
      master = ctx.createGain(),
      gains = [],
      sources = [];

    if (!on || want.place + "/" + want.time !== key) return;

    master.connect(ctx.destination);
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(1, now + (playing ? PIECE_FADE : 0.5));

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

    stop(PIECE_FADE);

    playing = { key: key, master: master, gains: gains, sources: sources };

    var info = list().filter(function (m) {
      return m.name.indexOf(key + "/") === 0;
    })[0];

    status(
      "<b>" +
        key +
        "</b> - " +
        info.bpm +
        " bpm, " +
        info.bars +
        " bars, " +
        info.lead +
        ", " +
        info.seconds.toFixed(0) +
        " s a loop<br>made in " +
        ((performance.now() - begun) / 1000).toFixed(1) +
        " s (" +
        pieces
          .map(function (p, i) {
            return Music.WEATHERS[i] + " " + (p.ms / 1000).toFixed(1) + " s";
          })
          .join(", ") +
        ")",
    );
  });
}

function list() {
  return Music.list();
}

//fades out what is playing and stops it
function stop(fade) {
  if (playing === null) return;

  var ctx = audio(),
    old = playing,
    now = ctx.currentTime;

  old.master.gain.cancelScheduledValues(now);
  old.master.gain.setValueAtTime(old.master.gain.value, now);
  old.master.gain.linearRampToValueAtTime(0, now + fade);
  old.sources.forEach(function (s) {
    s.stop(now + fade + 0.1);
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

function buttons(id, values, field, changed) {
  var row = document.getElementById(id);

  values.forEach(function (v) {
    var b = document.createElement("button");

    b.textContent = v;
    b.className = want[field] === v ? "on" : "";
    b.onclick = function () {
      want[field] = v;
      Array.prototype.forEach.call(
        row.querySelectorAll("button"),
        function (x) {
          x.className = x === b ? "on" : "";
        },
      );
      changed();
    };
    row.appendChild(b);
  });
}

function piece() {
  if (on) start();
}

buttons("places", Music.PLACES, "place", piece);
buttons("times", Music.TIMES, "time", piece);
buttons("weathers", Music.WEATHERS, "weather", weather);

document.getElementById("play").onclick = function () {
  on = !on;
  this.textContent = on ? "stop" : "play";
  this.className = on ? "on" : "";

  if (on) start();
  else {
    stop(1);
    status("");
  }
};
