/**
 * The debug panel, over the world while it is asked for (the menu's Debug
 * panel, or ?debug=on): how many frames a second are drawn, and what the
 * script spends a frame on - the world going on, every part of drawing it,
 * every kind of ticker - and what comes now and then between frames, the
 * world's tick, a pick, the HUD read again; how many draw calls, pictures,
 * lamps and lines there are; the pictures painted; the heap, and how fast it
 * fills. Read off the engine's Stats a few times a second, never a frame.
 *
 * Only the script is timed. What the GPU does is not, but where the browser
 * can time it (the GPU lines), and the switches at the bottom draw the city
 * without its shadows, its lamps or what goes over it, or as often as the
 * screen can, to see what each of them takes. Put away, everything is as it
 * was: nothing kept, everything drawn, at most 30 frames a second.
 */
import { useEffect, useState } from "react";
import engine from "engine";
import { cx } from "../kit";
import { setDebug } from "../store";
import { getClient } from "../session";

var Stats = engine.Stats;

//how often it is read again, ms
var EVERY = 250;

//the parts of the frame, in the order they go in - each part's own parts
//under it - and what comes between frames, now and then
var TOP = ["frame", "update", "render"],
  NOW_AND_THEN = [
    "pick",
    "city tick",
    "city catch-up",
    "traffic save",
    "sprites: paint",
    "hud: read",
    "hud: render",
  ];

function ms(v) {
  return v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function n(v) {
  return v >= 100 ? Math.round(v).toLocaleString() : String(+v.toFixed(1));
}

function mb(bytes) {
  return (bytes / 1048576).toFixed(1);
}

//the sections as they are shown: the frame's parts first, then drawing it
//layer by layer - the dearest first - then what comes between frames
function order(sections) {
  var byName = {},
    top = [],
    render = [],
    layers = [],
    between = [];

  sections.forEach(function (s) {
    byName[s.name] = s;
  });

  TOP.forEach(function (name) {
    if (byName[name]) top.push(byName[name]);
  });

  sections.forEach(function (s) {
    if (TOP.indexOf(s.name) !== -1 || NOW_AND_THEN.indexOf(s.name) !== -1)
      return;
    if (s.avg === 0 && s.last === 0) return;
    if (/^render: /.test(s.name)) render.push(s);
    else layers.push(s);
  });

  layers.sort(function (a, b) {
    return b.avg - a.avg;
  });

  NOW_AND_THEN.forEach(function (name) {
    if (byName[name] && byName[name].last > 0) between.push(byName[name]);
  });

  return { frame: top.concat(render, layers), between: between };
}

function Head({ children }) {
  return (
    <div className="label border-t-[1.5px] border-inset px-3 pt-2 pb-1">
      {children}
    </div>
  );
}

function Line({ name, children, dim }) {
  return (
    <div
      className={cx(
        "flex justify-between gap-3 px-3 leading-[1.5]",
        dim && "text-muted",
      )}
    >
      <span className="truncate">{name}</span>
      <span className="shrink-0 tabular-nums">{children}</span>
    </div>
  );
}

function Switch({ label, on, onClick }) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={on}
      onClick={onClick}
      className="row py-1.5 text-xs"
    >
      <span className="whitespace-nowrap">{label}</span>
      <span className={cx("switch scale-75", on && "on")} />
    </button>
  );
}

export default function DebugPanel() {
  var client = getClient(),
    [snap, setSnap] = useState(null),
    [cache, setCache] = useState(null),
    //the tickers timed one by one, which costs a little itself
    [tickers, setTickers] = useState(true),
    //what is drawn, and how often (Lighting passes, Game uncapped)
    [passes, setPasses] = useState({
      shadows: true,
      lamps: true,
      overlay: true,
      uncapped: false,
    });

  useEffect(
    function () {
      Stats.enable(true, tickers);

      var reading = setInterval(function () {
        setSnap(Stats.snapshot());
        if (client && client.sprites) setCache(client.sprites.cache.stats());
      }, EVERY);

      return function () {
        clearInterval(reading);
      };
    },
    [tickers],
  );

  //put away, nothing is kept any more, and everything is drawn as it was
  useEffect(function () {
    return function () {
      Stats.enable(false);
      apply(client, {
        shadows: true,
        lamps: true,
        overlay: true,
        uncapped: false,
      });
    };
  }, []);

  function flip(name) {
    var next = Object.assign({}, passes);

    next[name] = !next[name];
    setPasses(next);
    apply(client, next);
  }

  var timer = client && client.lighting ? client.lighting.view.timer : null,
    shown = snap === null ? null : order(snap.sections);

  return (
    <div className="card pointer-events-auto fixed top-32 left-2.5 z-40 max-h-[calc(100svh-14rem)] w-72 overflow-y-auto overscroll-contain font-mono text-[11px] sm:left-4">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="label">Debug</span>
        <button
          type="button"
          onClick={function () {
            setDebug(false);
          }}
          className="cursor-pointer text-muted hover:text-ink"
          aria-label="Put the debug panel away"
        >
          ×
        </button>
      </div>
      {snap === null ? (
        <div className="px-3 pb-3 text-muted">…</div>
      ) : (
        <>
          <Line name="frames a second">
            <b>{snap.fps.toFixed(1)}</b>
            {passes.uncapped ? "" : " / 30"}
          </Line>
          <Line name="between frames, ms">
            {ms(snap.interval.avg)} / {ms(snap.interval.max)}
          </Line>
          <Head>CPU a frame, ms · avg / worst</Head>
          {shown.frame.map(function (s) {
            return (
              <Line
                key={s.name}
                name={s.name}
                dim={TOP.indexOf(s.name) === -1 && s.avg < 0.05}
              >
                {ms(s.avg)} / {ms(s.max)}
              </Line>
            );
          })}
          {shown.between.length > 0 && (
            <Head>Now and then, ms · last / worst</Head>
          )}
          {shown.between.map(function (s) {
            return (
              <Line key={s.name} name={s.name}>
                {ms(s.last)} / {ms(s.max)}
              </Line>
            );
          })}
          {snap.tickers.length > 0 && (
            <Head>Tickers, ms a frame · how many</Head>
          )}
          {snap.tickers
            .slice()
            .sort(function (a, b) {
              return b.avg - a.avg;
            })
            .map(function (t) {
              return (
                <Line key={t.name} name={t.name}>
                  {ms(t.avg)} · {n(t.calls)}
                </Line>
              );
            })}
          <Head>A frame · avg / last</Head>
          {snap.counters.map(function (c) {
            if (/^gpu: /.test(c.name)) return null;

            return (
              <Line key={c.name} name={c.name}>
                {n(c.avg)} / {n(c.last)}
              </Line>
            );
          })}
          <Head>GPU, ms · avg / worst</Head>
          {timer ? (
            snap.counters.map(function (c) {
              if (!/^gpu: /.test(c.name)) return null;

              return (
                <Line key={c.name} name={c.name.replace(/ ms$/, "")}>
                  {ms(c.avg)} / {ms(c.max)}
                </Line>
              );
            })
          ) : (
            <Line name="not timed by this browser" dim />
          )}
          <Head>Memory</Head>
          {snap.heap ? (
            <>
              <Line name="heap, MB">{mb(snap.heap.used)}</Line>
              <Line name="allocated, MB a second">{mb(snap.heap.alloc)}</Line>
              <Line name="collections seen">{snap.heap.drops}</Line>
            </>
          ) : (
            <Line name="not told by this browser" dim />
          )}
          {cache && (
            <Line name="sprite pages">
              {cache.pages}/{cache.maxPages} · {Math.round(cache.used * 100)}%
            </Line>
          )}
          <Head>Draw</Head>
          <Switch
            label="Shadows"
            on={passes.shadows}
            onClick={function () {
              flip("shadows");
            }}
          />
          <Switch
            label="Lamps"
            on={passes.lamps}
            onClick={function () {
              flip("lamps");
            }}
          />
          <Switch
            label="Lines and words"
            on={passes.overlay}
            onClick={function () {
              flip("overlay");
            }}
          />
          <Switch
            label="As often as the screen"
            on={passes.uncapped}
            onClick={function () {
              flip("uncapped");
            }}
          />
          <Switch
            label="Time every ticker"
            on={tickers}
            onClick={function () {
              setTickers(!tickers);
            }}
          />
        </>
      )}
    </div>
  );
}

//what is drawn, as the switches say
function apply(client, passes) {
  if (!client) return;

  if (client.lighting) {
    client.lighting.passes.shadows = passes.shadows;
    client.lighting.passes.lamps = passes.lamps;
    client.lighting.passes.overlay = passes.overlay;
  }

  if (client.game) client.game.uncapped = passes.uncapped;
}
