/**
 * The fire bench's page (scene.js): one building on flat grass, a road along
 * its front and a few trees about it, set on fire the way the game sets one
 * on fire - catching in a window low down, the fire spreading along that
 * floor of that tile, then to the next tile and the floor over it, black
 * smoke rolling up off it, till it is burnt out - gutted, its walls
 * standing or fallen in, by what it is built of - and what is left of it
 * burns on and smoulders, a burnt-out ruin - over a
 * day of the game's time, as fast as wanted, by day or at night, turned
 * round or from above; and put up again.
 */
import { useEffect, useRef, useState } from "react";
import { kinds, open } from "../bench/world.js";
import { Scene } from "./scene.js";
import { Button, Header, Select } from "../ui/kit.jsx";

var SPEEDS = [
  { value: 0, label: "stopped" },
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

//how many hours of the game's time the fire goes on by a second
var RATES = [
  { value: 1 / 12, label: "as in the game: 5 min a second" },
  { value: 1 / 6, label: "10 min a second" },
  { value: 1 / 3, label: "20 min a second" },
  { value: 1, label: "an hour a second" },
  { value: 3, label: "3 hours a second" },
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

export default function Fire() {
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [speed, setSpeed] = useState(1),
    [rate, setRate] = useState(1 / 3),
    [top, setTop] = useState(false),
    [night, setNight] = useState(false),
    [kind, setKind] = useState(""),
    [seen, setSeen] = useState(null);

  //the world, up once
  useEffect(function () {
    var looking = null;

    open(el.current).then(
      function (world) {
        world.speed = speed;
        bench.current = new Scene(world);
        bench.current.rate = rate;
        window.bench.scene = bench.current;
        setKind(String(bench.current.code));
        setReady(true);
        looking = setInterval(function () {
          setSeen(bench.current.status());
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

  var s = seen,
    standing = !!s && s.state === "standing",
    alight = !!s && s.hours !== null,
    //coming down: nothing to put up again till it is down
    busy = !!s && s.falling;

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="fire" className="gap-1.5 py-1.5">
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
        <Button
          className="px-1.5 py-0.5"
          title="ten at night, or ten in the morning"
          on={night}
          disabled={!ready}
          onClick={function () {
            scene().setNight(!night);
            setNight(!night);
          }}
        >
          at night
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
            One building on a patch of flat grass, a road along its front and a
            few trees about it, set on fire the way the game sets one on fire:
            it catches in a window low down and spreads along that floor of that
            tile, then on to the same floor of the next tile and to the floor
            over it, and so on - down only slowly - black smoke rolling up off
            it, thicker as more of it burns, till it is burnt out, seven hours
            on: a block on a frame of concrete gutted, roof and all, and likely
            to come down some hours after; one of brick or stone its walls
            standing, roofless; one of timber, or a house of two storeys under a
            roof of tiles, fallen in. What is left of it burns on and smoulders,
            a burnt-out ruin by the end of the day.
          </Note>

          <Section title="What stands">
            <Row>
              <Select
                className="max-w-full"
                title="what stands"
                options={kinds()}
                value={kind}
                disabled={!ready || busy || alight}
                onChange={function (e) {
                  if (scene().pick(e.target.value)) setKind(e.target.value);
                }}
              />
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="put it up again turned a quarter turn"
                disabled={!ready || busy || alight}
                onClick={function () {
                  scene().turn();
                }}
              >
                turn it
              </Button>
            </Row>
            <div>{s && s.name ? s.name + ": " + s.state : "-"}</div>
          </Section>

          <Section title="The fire">
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="set it on fire"
                disabled={!ready || !standing}
                onClick={function () {
                  scene().fireUp();
                }}
              >
                fire up
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="the fire's clock on an hour"
                disabled={!ready || !alight || busy}
                onClick={function () {
                  scene().skip(1);
                }}
              >
                +1 hour
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="the fire's clock on to a moment before it comes down"
                disabled={!ready || !alight || busy || s.state !== "on fire"}
                onClick={function () {
                  scene().toFall();
                }}
              >
                to its fall
              </Button>
            </Row>
            <Row>
              <Select
                className="max-w-full"
                title="how fast the fire goes, of the game's time"
                options={RATES}
                value={rate}
                onChange={function (e) {
                  setRate(+e.target.value);
                  if (scene()) scene().rate = +e.target.value;
                }}
              />
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="put it up again, once it is not coming down"
                disabled={!ready || busy}
                onClick={function () {
                  scene().put();
                }}
              >
                reset
              </Button>
            </Row>
          </Section>

          <Section title="Going on">
            {s && (
              <>
                <div>
                  burning for:{" "}
                  {s.hours === null ? "-" : s.hours.toFixed(1) + " hours"}
                </div>
                <div>
                  windows ablaze: {s.ablaze} of {s.windows}
                </div>
                <div>sparks flying: {s.sparks}</div>
                <div>coming down: {s.falling ? "yes" : "no"}</div>
              </>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
