/**
 * The traffic testbed's page (lab/trafficbed): the game's own traffic on a
 * few roads, seen from above, going (view.js draws it). Pick a scenario, or
 * draw roads of your own; put cars on where you like, of the kind you like,
 * going where you like; follow one to see what it is doing and why; and see
 * what has gone wrong so far - turning round mid-road, standing too long,
 * locking up, driving into each other. "check" runs the scenario through as
 * the headless runner does (tools/traffictest.mjs). A scenario can be named
 * in the address: traffic.html#city.
 */
import { useEffect, useRef, useState } from "react";
import { TYPES } from "../trafficbed/bed.js";
import { SCENARIOS, start, check } from "../trafficbed/scenarios.js";
import { Button, Header, Input, Select, TextArea, cx } from "../ui/kit.jsx";
import { HELD, carUnder, draw, fit, tileUnder, toText } from "./view.js";

var FRAME = 33;

var PICKS = SCENARIOS.map(function (s, i) {
    return { value: String(i), label: s.name };
  }).concat([{ value: "custom", label: "your roads" }]),
  SPEEDS = [
    { value: 0.5, label: "½×" },
    { value: 1, label: "1×" },
    { value: 2, label: "2×" },
    { value: 4, label: "4×" },
    { value: 8, label: "8×" },
  ],
  THENS = [
    { value: "gone", label: "then gone" },
    { value: "stop", label: "then stops" },
    { value: "park", label: "then parks" },
    { value: "again", label: "park, go again" },
    { value: "bus", label: "bus round them" },
    { value: "wander", label: "anywhere, on and on" },
  ],
  KEY = [
    [HELD.queue, "queue"],
    [HELD.junction, "junction"],
    [HELD.merge, "lane change"],
    ["#777", "parked"],
  ];

//a scenario named in the address: traffic.html#city
function fromHash() {
  var named = SCENARIOS.findIndex(function (s) {
    return s.name === decodeURIComponent(location.hash.slice(1));
  });

  return named !== -1 ? String(named) : "0";
}

function mine(map) {
  return {
    name: "your roads",
    about: "Roads of your own, and the cars you put on them.",
    map: map.split("\n"),
    setup: function () {},
    seconds: 120,
  };
}

/**
 * What is going on, as lines to show - each [text, "bad" | "good" | ""] -
 * for the page's panel: so far, the car followed, the log, the picks.
 */
function look(sim) {
  var bed = sim.bed,
    r = bed.report(),
    u = r.uturns,
    report = [
      [
        r.seconds +
          " s, " +
          r.cars +
          " on the roads, " +
          r.arrived +
          " got where they were going",
      ],
      [
        "turned round: " +
          u.junction +
          " at junctions, " +
          u.deadEnd +
          " at dead ends, " +
          u.road +
          " mid-road",
        u.road ? "bad" : "",
      ],
      [
        "longest stood in the traffic: " +
          r.mostStood +
          " s" +
          (r.mostStoodBy
            ? " (#" + r.mostStoodBy.id + " " + r.mostStoodBy.type + ")"
            : ""),
        r.mostStood > 25 ? "bad" : "",
      ],
      ["locked: " + r.locks.length, r.locks.length ? "bad" : ""],
      [
        "on top of each other: " + r.overlaps.length,
        r.overlaps.length ? "bad" : "",
      ],
      [
        "no way to where it was going: " + r.noRoute.length,
        r.noRoute.length ? "bad" : "",
      ],
    ],
    c = sim.followed,
    car = null;

  if (sim.checked)
    report.push([
      "check (" +
        sim.scenario.seconds +
        " s, seed " +
        sim.checked.seed +
        "): " +
        (sim.checked.ok ? "holds" : sim.checked.failed.join("; ")),
      sim.checked.ok ? "good" : "bad",
    ]);

  if (c && bed.cars.indexOf(c) !== -1) {
    var d = c.driver,
      tiles = [];

    for (var i = d.target; i < d.wps.length && tiles.length < 6; i++)
      if (tiles[tiles.length - 1] !== d.wps[i].tile) tiles.push(d.wps[i].tile);

    car = [
      ["#" + c.id + " " + c.type + (c.bus ? " (bus)" : "")],
      [
        "at " +
          d.x.toFixed(2) +
          ", " +
          d.y.toFixed(2) +
          ", going " +
          d.v.toFixed(2) +
          " of " +
          d.v0.toFixed(2) +
          " tiles/s",
      ],
      [
        "held: " +
          (d.held || "-") +
          (d.leader ? ", behind #" + d.leader.id : "") +
          (c.stood > 0 ? ", " + (c.stood / 1000).toFixed(1) + " s" : ""),
        c.stood > 10000 ? "bad" : "",
      ],
      [
        (d.parked
          ? "parked"
          : d.standing()
            ? "standing at the end of its way"
            : "") +
          (d.overtaking ? " going round #" + d.overtaking.id : "") +
          (d.merging
            ? " changing lanes" +
              (d.merging.waiting ? ", waiting for room" : "")
            : ""),
      ],
      [
        "next: " +
          tiles
            .map(function (t) {
              return bed.world.xy(t).join(",");
            })
            .join(" → "),
      ],
    ];
  }

  var at = function (t) {
    return bed.world.xy(t).join(",");
  };

  return {
    about: sim.scenario.about,
    report: report,
    car: car,
    log: bed.log.slice(-60).reverse().join("\n"),
    picks: sim.picks.length
      ? "from " +
        at(sim.picks[0]) +
        (sim.picks.length > 1
          ? " to " + sim.picks.slice(1).map(at).join(", then ")
          : " - now where to")
      : "nothing picked",
  };
}

function Lines({ lines }) {
  return lines.map(function (l, i) {
    return (
      <div
        key={i}
        className={cx(
          "my-px",
          l[1] === "bad" && "text-bad",
          l[1] === "good" && "text-good",
        )}
      >
        {l[0]}
      </div>
    );
  });
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

function Row({ children }) {
  return (
    <div className="my-[3px] flex flex-wrap items-center gap-1">{children}</div>
  );
}

export default function Traffic() {
  var canvas = useRef(null),
    [pick, setPick] = useState(fromHash),
    [seed, setSeed] = useState("1"),
    [playing, setPlaying] = useState(true),
    [speed, setSpeed] = useState(1),
    [type, setType] = useState(Object.keys(TYPES)[0]),
    [then, setThen] = useState("gone"),
    [mapText, setMapText] = useState(""),
    [checking, setChecking] = useState(false),
    //what the panel shows of what is going on, looked at a few times a second
    [seen, setSeen] = useState(null),
    //what goes on: the bed and its scenario, the tiles picked, the car
    //followed, roads of your own, the last check, and where it is seen from
    sim = useRef({
      scenario: null,
      bed: null,
      picks: [],
      followed: null,
      custom: null,
      checked: null,
      view: { x: 0, y: 0, s: 24 },
      dragging: null,
    }),
    //how it goes, for the loop
    going = useRef(null);

  going.current = { playing: playing, speed: speed };

  function refresh() {
    if (sim.current.bed) setSeen(look(sim.current));
  }

  function reset(which) {
    var s = sim.current;

    if (which === "custom") s.scenario = s.custom || mine(mapText);
    else s.scenario = SCENARIOS[+which];

    s.bed = start(s.scenario, +seed || 1);
    s.followed = null;
    s.picks = [];
    s.checked = null;
    setMapText(toText(s.bed.world));
    fit(s.view, s.bed.world, canvas.current);
    refresh();
  }

  function tick() {
    var s = sim.current;

    s.bed.step(FRAME);
    if (s.scenario.later) s.scenario.later(s.bed);
  }

  //the scenario the page opens on; and for the console:
  //trafficbed.bed.add({...}), trafficbed.bed.report()
  useEffect(function () {
    reset(pick);

    window.trafficbed = {
      get bed() {
        return sim.current.bed;
      },
      view: sim.current.view,
    };
  }, []);

  //going, a frame at a time, as fast as asked; drawn every frame
  useEffect(function () {
    var last = 0,
      owed = 0,
      ask = requestAnimationFrame(frame);

    function frame(now) {
      var dt = last ? Math.min(250, now - last) : 0,
        s = sim.current;

      last = now;

      if (going.current.playing && s.bed) {
        owed += dt * going.current.speed;

        for (var n = 0; owed >= FRAME && n < 40; n++) {
          owed -= FRAME;
          tick();
        }

        if (owed > FRAME * 40) owed = 0;
      }

      draw(canvas.current, s.view, s);
      ask = requestAnimationFrame(frame);
    }

    var looking = setInterval(refresh, 250);

    return function () {
      cancelAnimationFrame(ask);
      clearInterval(looking);
    };
  }, []);

  //dragged to look round, wheeled to come closer; clicked to pick a tile
  //or follow a car
  useEffect(function () {
    var c = canvas.current;

    function move(e) {
      var s = sim.current,
        was = s.dragging;

      if (!was) return;

      var dx = e.clientX - was.x,
        dy = e.clientY - was.y;

      if (Math.abs(dx) + Math.abs(dy) > 4) was.moved = true;
      if (was.moved) {
        s.view.x = was.vx - dx / s.view.s;
        s.view.y = was.vy - dy / s.view.s;
      }
    }

    function up(e) {
      var s = sim.current,
        was = s.dragging;

      s.dragging = null;
      if (!was || was.moved || !s.bed || e.target !== c) return;

      var at = tileUnder(c, s.view, s.bed, e),
        car = carUnder(s.bed, at);

      if (car && !e.shiftKey) {
        s.followed = car;
        refresh();
        return;
      }

      if (s.bed.world.roadman.getRoad(at.tile) === null) return;

      if (s.picks.length === 0) s.picks = [at.tile];
      else if (e.shiftKey || s.picks.length === 1) s.picks.push(at.tile);
      else s.picks = [s.picks[0], at.tile];

      refresh();
    }

    function wheel(e) {
      e.preventDefault();

      var view = sim.current.view,
        r = c.getBoundingClientRect(),
        mx = e.clientX - r.left - c.width / 2,
        my = e.clientY - r.top - c.height / 2,
        before = view.s;

      view.s = Math.max(
        4,
        Math.min(96, view.s * (e.deltaY < 0 ? 1.15 : 1 / 1.15)),
      );
      view.x += mx / before - mx / view.s;
      view.y += my / before - my / view.s;
    }

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    c.addEventListener("wheel", wheel, { passive: false });

    return function () {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      c.removeEventListener("wheel", wheel);
    };
  }, []);

  function down(e) {
    var view = sim.current.view;

    sim.current.dragging = {
      x: e.clientX,
      y: e.clientY,
      vx: view.x,
      vy: view.y,
      moved: false,
    };
  }

  function add() {
    var s = sim.current;

    if (s.picks.length === 0) return;

    var spec = { type: type, at: s.picks[0] };

    if (then === "bus") {
      spec.bus = true;
      spec.to = s.picks.length > 1 ? s.picks.slice(1) : [s.picks[0]];
    } else if (then !== "wander") {
      if (s.picks.length < 2) return;
      spec.to = s.picks.slice(1);
      spec.then = then;
    }

    var car = s.bed.add(spec);

    if (car) s.followed = car;
    else s.bed.note("no room there, or no way from there");
    refresh();
  }

  function addTen() {
    var bed = sim.current.bed;

    for (var i = 0, n = 0; i < 100 && n < 10; i++)
      if (bed.add({ type: type, at: bed.anyTile() })) n++;
  }

  function runCheck() {
    setChecking(true);

    //let the page show it is busy before the work starts
    setTimeout(function () {
      var s = sim.current,
        at = +seed || 1;

      s.checked = Object.assign(check(s.scenario, at), { seed: at });
      setChecking(false);
      refresh();
    }, 20);
  }

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="traffic" className="gap-1.5 py-1.5">
        <Select
          title="scenario"
          options={PICKS}
          value={pick}
          onChange={function (e) {
            setPick(e.target.value);
            reset(e.target.value);
          }}
        />
        <label className="inline-flex items-center gap-1">
          seed
          <Input
            type="number"
            className="w-16"
            value={seed}
            onChange={function (e) {
              setSeed(e.target.value);
            }}
          />
        </label>
        <Button
          className="px-1.5 py-0.5"
          onClick={function () {
            reset(pick);
          }}
        >
          reset
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={!playing}
          onClick={function () {
            setPlaying(!playing);
          }}
        >
          {playing ? "pause" : "play"}
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="one frame"
          onClick={function () {
            if (sim.current.bed) tick();
          }}
        >
          step
        </Button>
        <Select
          title="how fast"
          options={SPEEDS}
          value={speed}
          onChange={function (e) {
            setSpeed(+e.target.value);
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="run it through, headless, and check it"
          disabled={checking}
          onClick={runCheck}
        >
          {checking ? "checking..." : "check"}
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 max-[700px]:flex-col">
        <div className="relative min-h-0 min-w-0 flex-1">
          <canvas
            ref={canvas}
            className="absolute inset-0 size-full cursor-crosshair"
            onMouseDown={down}
          />
        </div>

        <aside className="w-80 flex-none overflow-y-auto border-l border-line px-2.5 py-2 max-[700px]:h-[45%] max-[700px]:w-auto max-[700px]:border-t max-[700px]:border-l-0">
          <Note>{seen && seen.about}</Note>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            held:
            {KEY.map(function (k) {
              return (
                <span key={k[1]} className="inline-flex items-center gap-1">
                  <i
                    className="inline-block size-2.5"
                    style={{ background: k[0] }}
                  />
                  {k[1]}
                </span>
              );
            })}
          </div>

          <Section title="Put a car on">
            <Note>
              Click the road where it starts, then where it goes - shift-click
              for more places after that - and put it on. Click a car to follow
              it.
            </Note>
            <Row>
              <Select
                options={Object.keys(TYPES)}
                value={type}
                onChange={function (e) {
                  setType(e.target.value);
                }}
              />
              <Select
                title="at the end"
                options={THENS}
                value={then}
                onChange={function (e) {
                  setThen(e.target.value);
                }}
              />
            </Row>
            <Row>
              <Button className="px-1.5 py-0.5" onClick={add}>
                put it on
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="ten of these, anywhere"
                onClick={addTen}
              >
                10 anywhere
              </Button>
              <Button
                className="px-1.5 py-0.5"
                onClick={function () {
                  sim.current.picks = [];
                  refresh();
                }}
              >
                clear picks
              </Button>
            </Row>
            <Row>{seen && seen.picks}</Row>
          </Section>

          <Section title="Car">
            {seen && seen.car ? (
              <Lines lines={seen.car} />
            ) : (
              <Note>none followed</Note>
            )}
          </Section>

          <Section title="So far">
            {seen && <Lines lines={seen.report} />}
          </Section>

          <Section title="Roads">
            <Note>
              # both ways, S a bus stop, c cobbles, g gravel, &lt; ^ &gt; v one
              way (-x, -y, +x, +y); a line a row, +y down.
            </Note>
            <TextArea
              spellCheck={false}
              className="h-[120px] w-full whitespace-pre"
              value={mapText}
              onChange={function (e) {
                setMapText(e.target.value);
              }}
            />
            <Row>
              <Button
                className="px-1.5 py-0.5"
                onClick={function () {
                  sim.current.custom = mine(mapText);
                  setPick("custom");
                  reset("custom");
                }}
              >
                use these roads, no cars
              </Button>
            </Row>
          </Section>

          <Section title="Log">
            <div className="max-h-40 overflow-y-auto whitespace-pre-wrap text-muted">
              {seen && seen.log}
            </div>
          </Section>
        </aside>
      </div>
    </div>
  );
}
