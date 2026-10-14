/**
 * The sound lab: every sound the generator makes (src/shared/gen/sounds.js),
 * made in the page at the rate the browser plays at and played through Web
 * Audio - the way a game would. A one-off plays once; one that loops plays
 * until it is clicked again. Each is made the first time it is played and
 * kept, with a picture of how loud it is along its length.
 */
import * as Sounds from "../src/shared/gen/sounds.js";
import { wake, audio } from "./audio.js";

var made = {},
  playing = null;

function status(text) {
  document.getElementById("status").textContent = text;
}

/**
 * The sound as a Web Audio buffer, made the first time it is asked for.
 */
function bufferOf(name) {
  if (made[name]) return made[name];

  var ctx = audio(),
    started = performance.now(),
    sound = Sounds.generate(name, ctx.sampleRate),
    buf = ctx.createBuffer(
      sound.channels.length,
      sound.channels[0].length,
      sound.rate,
    );

  sound.channels.forEach(function (ch, i) {
    buf.copyToChannel(ch, i);
  });

  made[name] = { buffer: buf, sound: sound, ms: performance.now() - started };

  return made[name];
}

//how loud it is along its length, the louder ear
function draw(canvas, sound) {
  var w = (canvas.width = canvas.clientWidth * devicePixelRatio),
    h = (canvas.height = canvas.clientHeight * devicePixelRatio),
    g = canvas.getContext("2d"),
    l = sound.channels[0],
    r = sound.channels[1],
    per = Math.max(1, Math.floor(l.length / w));

  g.clearRect(0, 0, w, h);
  g.fillStyle = "#4a9a9a";

  for (var x = 0; x < w; x++) {
    var most = 0;

    for (var i = x * per; i < (x + 1) * per && i < l.length; i++)
      most = Math.max(most, Math.abs(l[i]), Math.abs(r[i]));

    g.fillRect(x, h / 2 - (most * h) / 2, 1, most * h);
  }
}

function stop() {
  if (playing === null) return;

  playing.source.stop();
  playing.button.classList.remove("playing");
  playing = null;
}

function play(entry, button, canvas) {
  var was = playing !== null && playing.button === button;

  stop();

  if (was) return;

  //woken now, in the click: a phone plays nothing from a context woken later
  wake();

  button.disabled = true;
  status("making " + entry.name + "...");

  //let the page show it is busy before the work starts
  setTimeout(function () {
    var it = bufferOf(entry.name),
      ctx = audio(),
      source = ctx.createBufferSource();

    button.disabled = false;
    draw(canvas, it.sound);

    source.buffer = it.buffer;
    source.loop = entry.loop;
    source.connect(ctx.destination);
    source.start();

    playing = { source: source, button: button };
    button.classList.add("playing");

    source.onended = function () {
      if (playing !== null && playing.source === source) stop();
    };

    status(
      entry.name +
        " - " +
        it.buffer.duration.toFixed(1) +
        " s" +
        (entry.loop ? ", looping" : "") +
        ", made in " +
        Math.round(it.ms) +
        " ms",
    );
  }, 20);
}

function build() {
  var root = document.getElementById("sounds"),
    bySound = {};

  Sounds.list().forEach(function (entry) {
    (bySound[entry.sound] = bySound[entry.sound] || []).push(entry);
  });

  Object.keys(bySound).forEach(function (sound) {
    var card = document.createElement("div"),
      title = document.createElement("h2"),
      ways = document.createElement("div"),
      canvas = document.createElement("canvas");

    card.className = "sound";
    title.innerHTML =
      sound +
      " <small>" +
      (bySound[sound][0].loop ? "loops" : "once") +
      "</small>";
    ways.className = "ways";

    bySound[sound].forEach(function (entry) {
      var button = document.createElement("button");

      button.textContent = entry.label;
      button.title = entry.name;
      button.onclick = function () {
        play(entry, button, canvas);
      };
      ways.appendChild(button);
    });

    card.appendChild(title);
    card.appendChild(ways);
    card.appendChild(canvas);
    root.appendChild(card);
  });
}

build();
