/**
 * The demolition bench's page (scene.js): a few buildings, trees and a road
 * on flat grass, and all of it cleared by the bulldozers at the push of a
 * button - as slowly as wanted, turned round or from above - and put up
 * again.
 */
import { useEffect, useRef, useState } from "react";
import { open } from "../bench/world.js";
import { Scene } from "./scene.js";
import { Button, Header, Select } from "../ui/kit.jsx";

var SPEEDS = [
  { value: 0, label: "stopped" },
  { value: 0.1, label: "⅒×" },
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

//how long what was put up again stands before it is cleared ("again"), ms
//of the bench's own time
var STANDS = 900;

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
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [speed, setSpeed] = useState(1),
    [top, setTop] = useState(false),
    [seen, setSeen] = useState(null);

  //the world, up once
  useEffect(function () {
    var looking = null;

    open(el.current).then(
      function (world) {
        world.speed = speed;
        bench.current = new Scene(world);
        window.bench.scene = bench.current;
        setReady(true);
        looking = setInterval(function () {
          setSeen(world.status());
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

  function scene() {
    return bench.current;
  }

  //put up again, and cleared a moment after - as the bench's clock goes
  function again() {
    var s = scene(),
      time = s.world.client.game.time,
      until;

    s.put();
    until = time.time + STANDS;

    var waiting = setInterval(function () {
      if (time.time < until) return;

      clearInterval(waiting);
      s.clear();
    }, 30);
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
            setSpeed(+e.target.value);
            if (scene()) scene().world.speed = +e.target.value;
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn left"
          disabled={!ready || top}
          onClick={function () {
            scene().world.turn(-1);
          }}
        >
          ⟲
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn right"
          disabled={!ready || top}
          onClick={function () {
            scene().world.turn(1);
          }}
        >
          ⟳
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={top}
          disabled={!ready}
          onClick={function () {
            scene().world.top(!top);
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

        <aside className="w-80 flex-none overflow-y-auto border-l border-line px-2.5 py-2 max-[700px]:h-[45%] max-[700px]:w-auto max-[700px]:border-t max-[700px]:border-l-0">
          <Note>
            A few buildings, trees and a road on flat grass, with nothing else
            about, cleared the way the game clears ground: fenced off, the
            bulldozers coming, a building coming down a tile at a time as they
            get to it, the trees going over the way they are pushed, the road
            broken up into the bare earth.
          </Note>

          <Section title="The scene">
            <Row>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready}
                onClick={function () {
                  scene().clear();
                }}
              >
                destroy
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="put it all up again"
                disabled={!ready}
                onClick={function () {
                  scene().put();
                }}
              >
                reset
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="put it all up again, and destroy it a moment after"
                disabled={!ready}
                onClick={again}
              >
                again
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
                <div>stretches of fence: {s.fence}</div>
              </>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
