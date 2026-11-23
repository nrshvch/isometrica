/**
 * City bench page: size, layout, seed (kept in the address), camera, and
 * how it came out. See .claude/skills/citygen.
 */
import { useEffect, useRef, useState } from "react";
import { open } from "../bench/world.js";
import { Scene, SIZE_NAMES, LAYOUT_NAMES } from "./scene.js";
import { Button, Header, Input, Select } from "../ui/kit.jsx";

var SIZE_LABELS = {
  town: "small town",
  city: "city (Peepstown's size)",
  metropolis: "Peepsopolis",
};

function asked() {
  var q = new URLSearchParams(window.location.hash.slice(1)),
    size = q.get("size"),
    seed = parseInt(q.get("seed"), 10),
    layout = q.get("layout");

  return {
    size: SIZE_NAMES.indexOf(size) >= 0 ? size : "city",
    seed: isFinite(seed) ? seed : 1,
    layout: LAYOUT_NAMES.indexOf(layout) >= 0 ? layout : "",
  };
}

function keep(want) {
  var q = new URLSearchParams({ size: want.size, seed: String(want.seed) });

  if (want.size === "town" && want.layout) q.set("layout", want.layout);
  window.history.replaceState(null, "", "#" + q.toString());
}

function Section({ title, children }) {
  return (
    <>
      <h2 className="mt-3 mb-1 font-bold text-accent">{title}</h2>
      {children}
    </>
  );
}

function Note({ children }) {
  return <p className="mt-0.5 mb-1.5 leading-[1.45] text-muted">{children}</p>;
}

function Line({ label, children }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-right tabular-nums">{children}</span>
    </div>
  );
}

export default function Cities() {
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [want, setWant] = useState(asked),
    [top, setTop] = useState(false),
    [seen, setSeen] = useState(null);

  useEffect(function () {
    open(el.current).then(
      function (world) {
        bench.current = new Scene(world);
        window.bench.scene = bench.current;
        setReady(true);
      },
      function (e) {
        console.error(e);
        setFailed(String(e && e.message ? e.message : e));
      },
    );
  }, []);

  useEffect(
    function () {
      if (!ready) return;

      keep(want);

      try {
        var made = bench.current.make(want);

        if (made !== null) setSeen(made);
      } catch (e) {
        console.error(e);
        setSeen({ error: String(e && e.message ? e.message : e) });
      }
    },
    [ready, want],
  );

  function change(what) {
    setWant(Object.assign({}, want, what));
  }

  var s = seen;

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="cities" className="gap-1.5 py-1.5">
        <Select
          title="how big"
          options={SIZE_NAMES.map(function (n) {
            return { value: n, label: SIZE_LABELS[n] || n };
          })}
          value={want.size}
          onChange={function (e) {
            change({ size: e.target.value });
          }}
        />
        {want.size === "town" && (
          <Select
            title="how the small town is laid out"
            options={[{ value: "", label: "any layout" }].concat(
              LAYOUT_NAMES.map(function (n) {
                return { value: n, label: n };
              }),
            )}
            value={want.layout}
            onChange={function (e) {
              change({ layout: e.target.value });
            }}
          />
        )}
        <Button
          className="px-1.5 py-0.5"
          title="the seed before"
          disabled={!ready}
          onClick={function () {
            change({ seed: want.seed - 1 });
          }}
        >
          ◀
        </Button>
        <Input
          className="w-20"
          title="seed"
          type="number"
          value={want.seed}
          onChange={function (e) {
            var seed = parseInt(e.target.value, 10);

            if (isFinite(seed)) change({ seed: seed });
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="the seed after"
          disabled={!ready}
          onClick={function () {
            change({ seed: want.seed + 1 });
          }}
        >
          ▶
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="any seed"
          disabled={!ready}
          onClick={function () {
            change({ seed: Math.floor(Math.random() * 100000) });
          }}
        >
          random
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn left"
          disabled={!ready || top}
          onClick={function () {
            bench.current.world.turn(-1);
          }}
        >
          ⟲
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn right"
          disabled={!ready || top}
          onClick={function () {
            bench.current.world.turn(1);
          }}
        >
          ⟳
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={top}
          disabled={!ready}
          onClick={function () {
            bench.current.world.top(!top);
            setTop(!top);
          }}
        >
          from above
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 max-[700px]:flex-col">
        <div className="relative min-h-0 min-w-0 flex-1 bg-black">
          <div ref={el} className="absolute inset-0" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-muted">
              {failed ? "could not start: " + failed : "starting…"}
            </div>
          )}
        </div>

        <aside className="w-72 flex-none overflow-y-auto border-l border-line px-2.5 py-2 max-[700px]:h-[45%] max-[700px]:w-auto max-[700px]:border-t max-[700px]:border-l-0">
          <Note>
            A town generated afresh, the way a new random town, city or
            Peepsopolis is made in the city builder, on flat grass and nothing
            else - no water, no hills, nobody in it, no traffic - for how its
            roads and buildings are laid out. Drag to look round, the wheel to
            zoom.
          </Note>

          {s && s.error && (
            <Section title="It failed">
              <Note>{s.error}</Note>
            </Section>
          )}

          {s && !s.error && (
            <>
              <Section title={s.name}>
                <Line label="planned on">{s.window} tiles</Line>
                <Line label="laid out">{s.layout}</Line>
                <Line label="blocks">{s.blocks}</Line>
                <Line label="squares">{s.squares}</Line>
                <Line label="roundabouts">{s.roundabouts}</Line>
              </Section>

              <Section title="Roads">
                <Line label="asphalt">{s.roads.asphalt}</Line>
                <Line label="cobbles">{s.roads.cobble}</Line>
                <Line label="gravel">{s.roads.gravel}</Line>
                <Line label="one way">{s.roads.oneWay}</Line>
              </Section>

              <Section title={s.buildings + " buildings"}>
                {Object.keys(s.kinds)
                  .sort(function (a, b) {
                    return s.kinds[b] - s.kinds[a];
                  })
                  .map(function (k) {
                    return (
                      <Line key={k} label={k}>
                        {s.kinds[k]}
                      </Line>
                    );
                  })}
                <Line label="beds">{s.beds}</Line>
                <Line label="jobs">{s.jobs}</Line>
              </Section>

              <Section title="Took">
                <Line label="generating">
                  {Math.round(s.took.generated)} ms
                </Line>
                <Line label="putting up">{Math.round(s.took.put)} ms</Line>
                {s.took.missed > 0 && (
                  <Line label="would not go up">{s.took.missed}</Line>
                )}
              </Section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
