/**
 * The demolition bench's page (bench.js): the game itself, on the city every
 * new player starts on, with a stage next to it to put things up on and
 * clear - and any ground at all to pick and clear, the woods round the city
 * among it - as slowly as wanted, turned round or from above.
 */
import { useEffect, useRef, useState } from "react";
import { boot, buildings } from "./bench.js";
import { Button, Header, Select, Status, cx } from "../ui/kit.jsx";

var SPEEDS = [
  { value: 0, label: "stopped" },
  { value: 0.1, label: "⅒×" },
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

//what can go up on the stage, besides a building
var PIECES = [
  { value: "building", label: "the building" },
  { value: "trees", label: "trees, planted" },
  { value: "roads", label: "roads, crossing" },
  { value: "all", label: "all of them" },
];

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

export default function Demolition() {
  var world = useRef(null),
    bench = useRef(null),
    options = useRef(buildings()),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [code, setCode] = useState("2126"),
    [piece, setPiece] = useState("building"),
    [speed, setSpeed] = useState(0.5),
    [picking, setPicking] = useState(false),
    [top, setTop] = useState(false),
    [seen, setSeen] = useState(null);

  //the game, up once
  useEffect(function () {
    var looking = null;

    boot(world.current).then(
      function (b) {
        bench.current = b;
        b.speed = speed;
        b.code = code;
        setReady(true);
        looking = setInterval(function () {
          setSeen(Object.assign({ said: b.said }, b.status()));
        }, 250);
      },
      function (e) {
        console.error(e);
        setFailed(String(e && e.message ? e.message : e));
      },
    );

    return function () {
      if (looking !== null) clearInterval(looking);
    };
  }, []);

  function b() {
    return bench.current;
  }

  function put() {
    if (b()) b().put(piece === "building" ? code : piece);
  }

  function changeSpeed(v) {
    setSpeed(v);
    if (b()) b().speed = v;
  }

  function changeCode(v) {
    setCode(v);
    if (b()) b().code = v;
  }

  function pick(on) {
    setPicking(on);
    if (b()) b().pick(on);
  }

  var s = seen;

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="demolition" className="gap-1.5 py-1.5">
        <Select
          title="how fast"
          options={SPEEDS}
          value={speed}
          onChange={function (e) {
            changeSpeed(+e.target.value);
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn left"
          disabled={!ready || top}
          onClick={function () {
            b().turn(-1);
          }}
        >
          ⟲
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn right"
          disabled={!ready || top}
          onClick={function () {
            b().turn(1);
          }}
        >
          ⟳
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={top}
          disabled={!ready}
          onClick={function () {
            b().top(!top);
            setTop(!top);
          }}
        >
          from above
        </Button>
        <Button
          className="px-1.5 py-0.5"
          disabled={!ready}
          onClick={function () {
            b().look();
          }}
        >
          to the stage
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 max-[700px]:flex-col">
        <div className="relative min-h-0 min-w-0 flex-1 bg-black">
          <div ref={world} className="absolute inset-0" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-muted">
              {failed ? "could not start: " + failed : "starting the game…"}
            </div>
          )}
        </div>

        <aside className="w-80 flex-none overflow-y-auto border-l border-line px-2.5 py-2 max-[700px]:h-[45%] max-[700px]:w-auto max-[700px]:border-t max-[700px]:border-l-0">
          <Note>
            The game itself, on the city every new player starts on - nothing
            done here is kept. Next to the city is a stage of open ground to put
            things up on and clear, the way the game clears ground: the
            bulldozers come, a building comes down a tile at a time as they get
            to it, a tree goes over the way it is pushed, a road is broken up
            into the bare earth.
          </Note>

          <Section title="The stage">
            <Row>
              <Select
                className="max-w-full"
                title="the building to put up"
                options={options.current}
                value={code}
                onChange={function (e) {
                  changeCode(e.target.value);
                }}
              />
            </Row>
            <Row>
              <Select
                title="what to put up"
                options={PIECES}
                value={piece}
                onChange={function (e) {
                  setPiece(e.target.value);
                }}
              />
              <Button className="px-1.5 py-0.5" disabled={!ready} onClick={put}>
                put up
              </Button>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready}
                onClick={function () {
                  b().clearStage();
                }}
              >
                clear it
              </Button>
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="what was put up last, up again and cleared a moment after"
                disabled={!ready}
                onClick={function () {
                  b().again();
                }}
              >
                again
              </Button>
            </Row>
          </Section>

          <Section title="Any ground">
            <Note>
              Pick tiles the way the game does - drag them, pull the handles
              round them, tap a building for the ground it stands on - and clear
              them. Or go to the nearest woods, picked.
            </Note>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                on={picking}
                disabled={!ready}
                onClick={function () {
                  pick(!picking);
                }}
              >
                {picking ? "stop picking" : "pick ground"}
              </Button>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready}
                onClick={function () {
                  if (b().woods()) setPicking(true);
                }}
              >
                woods
              </Button>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready || !picking}
                onClick={function () {
                  b().clearPicked();
                }}
              >
                clear picked
              </Button>
            </Row>
          </Section>

          <Section title="Going on">
            {s && (
              <>
                <div>bulldozers out: {s.dozers}</div>
                <div>tiles waiting for one: {s.waiting}</div>
                <div>buildings coming down: {s.coming}</div>
                <div>trees going over: {s.falling}</div>
                <div>roads still to break up: {s.roads}</div>
                <div>heaps of rubble: {s.rubble}</div>
              </>
            )}
            <Status className={cx("mt-1", s && s.said && "text-bad")}>
              {s && s.said}
            </Status>
          </Section>
        </aside>
      </div>
    </div>
  );
}
