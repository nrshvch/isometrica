/**
 * The sound lab: every sound the generator makes (src/shared/gen/sounds.js),
 * made in the page at the rate the browser plays at and played through Web
 * Audio - the way a game would. A one-off plays once; one that loops plays
 * until it is clicked again. Each is made the first time it is played and
 * kept, with a picture of how loud it is along its length.
 */
import { useEffect, useRef, useState } from "react";
import * as Sounds from "../../src/shared/gen/sounds.js";
import { wake, audio } from "../../src/client/audio/wake.js";
import { Article, Button, Status } from "../ui/kit.jsx";

var made = {};

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

//the ways each sound is made, by sound, in the order the generator has them
var BY_SOUND = (function () {
  var out = {};

  Sounds.list().forEach(function (entry) {
    (out[entry.sound] = out[entry.sound] || []).push(entry);
  });

  return out;
})();

/**
 * A sound, its ways of being made as buttons, and the picture of the one
 * last played.
 */
function Sound({ sound, ways, playing, making, onPlay }) {
  var canvas = useRef(null),
    drawn = useRef(null);

  //the picture of the way played, once it is made
  useEffect(
    function () {
      var way = playing && made[playing];

      if (way && drawn.current !== playing) {
        drawn.current = playing;
        draw(canvas.current, way.sound);
      }
    },
    [playing],
  );

  return (
    <div className="mb-2.5 border border-line bg-panel px-3 py-2.5">
      <h3 className="mb-2 flex items-baseline gap-2 font-bold">
        {sound}
        <small className="font-normal text-dim">
          {ways[0].loop ? "loops" : "once"}
        </small>
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {ways.map(function (entry) {
          return (
            <Button
              key={entry.name}
              title={entry.name}
              on={playing === entry.name}
              disabled={making === entry.name}
              onClick={function () {
                onPlay(entry);
              }}
            >
              {entry.label}
            </Button>
          );
        })}
      </div>
      <canvas ref={canvas} className="mt-2 block h-12 w-full bg-well" />
    </div>
  );
}

export default function SoundsPage() {
  var [playing, setPlaying] = useState(null),
    [making, setMaking] = useState(null),
    [status, setStatus] = useState(""),
    //what plays: { name, source }
    now = useRef(null);

  function stop() {
    if (now.current === null) return;

    now.current.source.onended = null;
    now.current.source.stop();
    now.current = null;
    setPlaying(null);
  }

  function play(entry) {
    var was = now.current !== null && now.current.name === entry.name;

    stop();

    if (was) return;

    //woken now, in the click: a phone plays nothing from a context woken later
    wake();

    setMaking(entry.name);
    setStatus("making " + entry.name + "...");

    //let the page show it is busy before the work starts
    setTimeout(function () {
      var it = bufferOf(entry.name),
        ctx = audio(),
        source = ctx.createBufferSource();

      source.buffer = it.buffer;
      source.loop = entry.loop;
      source.connect(ctx.destination);
      source.start();
      source.onended = function () {
        if (now.current !== null && now.current.source === source) stop();
      };

      now.current = { name: entry.name, source: source };
      setMaking(null);
      setPlaying(entry.name);
      setStatus(
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

  //what plays stops with the page
  useEffect(function () {
    return stop;
  }, []);

  return (
    <Article
      page="sounds"
      title="Sound lab"
      about="Every sound src/shared/gen/sounds.js makes, made here in the page the way a game would make it. A sound that loops plays on until it is clicked again."
    >
      {Object.keys(BY_SOUND).map(function (sound) {
        var ways = BY_SOUND[sound],
          mine = function (name) {
            return ways.some(function (w) {
              return w.name === name;
            })
              ? name
              : null;
          };

        return (
          <Sound
            key={sound}
            sound={sound}
            ways={ways}
            playing={mine(playing)}
            making={mine(making)}
            onPlay={play}
          />
        );
      })}
      <Status className="mt-3">{status}</Status>
    </Article>
  );
}
