/**
 * The debug panel, over the world while it is asked for (the menu's Debug
 * panel, or ?debug=on): how many frames a second are drawn, and what the
 * script spends a frame on - the world going on, every part of drawing it,
 * every kind of ticker - and what comes now and then between frames, the
 * world's tick, a pick, the HUD read again; how many draw calls, pictures,
 * lamps and lines there are; the pictures painted; the heap, and how fast it
 * fills. Read off the engine's Stats a few times a second, never a frame.
 *
 * Every line stays where it is from one read to the next - in the order the
 * frame goes in, never by what costs most - and is there whether or not
 * anything was counted on it (a dash, dimmed), each figure in a column of
 * its own, so an eye kept on one line finds it where it was.
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

//nothing to show on a line, yet or this time
var NONE = "–";

function ms(v) {
  return v >= 10 ? v.toFixed(1) : v.toFixed(2);
}

function n(v) {
  return v >= 100 ? Math.round(v).toLocaleString() : String(+v.toFixed(1));
}

function mb(bytes) {
  return (bytes / 1048576).toFixed(1);
}

/**
 * The sections as they are shown, always the same lines in the same order:
 * the frame's parts, then the render's own in the order they were first
 * timed and whatever else there is; the layers, one line each in the
 * order they are drawn, with what drawing and submitting each took; and
 * what comes between frames.
 */
function order(sections) {
  var byName = {},
    frame = [],
    layers = [],
    between = [],
    names = engine.Config.layerNames || [];

  sections.forEach(function (s) {
    byName[s.name] = s;
  });

  TOP.forEach(function (name) {
    frame.push({ name: name, s: byName[name] || null });
  });

  sections.forEach(function (s) {
    if (TOP.indexOf(s.name) !== -1 || NOW_AND_THEN.indexOf(s.name) !== -1)
      return;
    if (/^(draw|submit): /.test(s.name)) return;
    frame.push({ name: s.name, s: s, part: /^render: /.test(s.name) });
  });

  names.forEach(function (name) {
    layers.push({
      name: name,
      draw: byName["draw: " + name] || null,
      submit: byName["submit: " + name] || null,
    });
  });

  NOW_AND_THEN.forEach(function (name) {
    between.push({ name: name, s: byName[name] || null });
  });

  return { frame: frame, layers: layers, between: between };
}

//a section that has had anything at all in the frames kept
function ran(s) {
  return s !== null && (s.avg > 0 || s.max > 0);
}

/**
 * A heading, and what each column under it is.
 */
function Head({ children, cols }) {
  return (
    <div className="label flex items-end gap-2 border-t-[1.5px] border-inset px-3 pt-2 pb-1">
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {(cols || []).map(function (c) {
        return (
          <span key={c} className="w-[6ch] shrink-0 text-right">
            {c}
          </span>
        );
      })}
    </div>
  );
}

/**
 * A line: its name, then its figures each in a column of its own, as wide
 * as any of them, lined up with the line above - dimmed while there is
 * nothing on it, and set in a little under what it is part of.
 */
function Line({ name, values, dim, part }) {
  return (
    <div
      className={cx(
        "flex gap-2 pr-3 leading-[1.5]",
        part ? "pl-5" : "pl-3",
        dim && "text-muted",
      )}
    >
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {(values || []).map(function (v, i) {
        return (
          <span key={i} className="w-[6ch] shrink-0 text-right tabular-nums">
            {v}
          </span>
        );
      })}
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
          <Line
            name="frames a second"
            values={[
              <b key="fps">{snap.fps.toFixed(1)}</b>,
              passes.uncapped ? NONE : "30",
            ]}
          />
          <Line
            name="between frames, ms"
            values={[ms(snap.interval.avg), ms(snap.interval.max)]}
          />
          <Head cols={["avg", "worst"]}>CPU a frame, ms</Head>
          {shown.frame.map(function (row) {
            var s = row.s,
              on = ran(s);

            return (
              <Line
                key={row.name}
                name={row.part ? row.name.replace(/^render: /, "") : row.name}
                part={row.part}
                dim={!on || (row.part && s.avg < 0.05)}
                values={on ? [ms(s.avg), ms(s.max)] : [NONE, NONE]}
              />
            );
          })}
          <Head cols={["draw", "submit"]}>Layers, ms a frame</Head>
          {shown.layers.map(function (row) {
            var on = ran(row.draw) || ran(row.submit),
              //what is next to nothing
              little =
                (!row.draw || row.draw.avg < 0.05) &&
                (!row.submit || row.submit.avg < 0.05);

            return (
              <Line
                key={row.name}
                name={row.name}
                part
                dim={!on || little}
                values={
                  on
                    ? [
                        row.draw ? ms(row.draw.avg) : NONE,
                        row.submit ? ms(row.submit.avg) : NONE,
                      ]
                    : [NONE, NONE]
                }
              />
            );
          })}
          <Head cols={["last", "worst"]}>Now and then, ms</Head>
          {shown.between.map(function (row) {
            var s = row.s,
              //once it has run - though it may have taken next to no time
              on = s !== null && (s.last > 0 || s.max > 0 || s.calls > 0);

            return (
              <Line
                key={row.name}
                name={row.name}
                dim={!on}
                values={on ? [ms(s.last), ms(s.max)] : [NONE, NONE]}
              />
            );
          })}
          <Head cols={["ms", "many"]}>Tickers, a frame</Head>
          {snap.tickers.length === 0 && (
            <Line name={tickers ? "none yet" : "not timed"} dim />
          )}
          {snap.tickers.map(function (t) {
            var on = t.calls > 0;

            return (
              <Line
                key={t.name}
                name={t.name}
                dim={!on}
                values={on ? [ms(t.avg), n(t.calls)] : [NONE, NONE]}
              />
            );
          })}
          <Head cols={["avg", "last"]}>A frame</Head>
          {snap.counters.map(function (c) {
            if (/^gpu: /.test(c.name)) return null;

            return (
              <Line key={c.name} name={c.name} values={[n(c.avg), n(c.last)]} />
            );
          })}
          <Head cols={["avg", "worst"]}>GPU, ms</Head>
          {timer ? (
            snap.counters.map(function (c) {
              if (!/^gpu: /.test(c.name)) return null;

              return (
                <Line
                  key={c.name}
                  name={c.name.replace(/^gpu: /, "").replace(/ ms$/, "")}
                  values={[ms(c.avg), ms(c.max)]}
                />
              );
            })
          ) : (
            <Line name="not timed by this browser" dim />
          )}
          <Head>Memory</Head>
          {snap.heap ? (
            <>
              <Line name="heap, MB" values={[mb(snap.heap.used)]} />
              <Line
                name="allocated, MB a second"
                values={[mb(snap.heap.alloc)]}
              />
              <Line name="collections seen" values={[snap.heap.drops]} />
            </>
          ) : (
            <Line name="not told by this browser" dim />
          )}
          {cache && (
            <Line
              name="sprite pages, used"
              values={[
                cache.pages + "/" + cache.maxPages,
                Math.round(cache.used * 100) + "%",
              ]}
            />
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
