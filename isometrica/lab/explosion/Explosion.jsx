/**
 * The explosion bench's page (scene.js): one building on flat grass, a road
 * along its front and a few trees about it, blown up the way the game blows
 * one up - no fence, no bulldozer: the charges at its foot, then all of it
 * torn off it in a fireball, what is left of it coming down a tile at a
 * time, heaps of rubble left where it stood and its yard wrecked, dust
 * rolling down the road - as slowly as wanted, turned round or from above;
 * with its neighbours round it, the blast bringing down the near ones; the
 * rubble cleared away by the bulldozers, and all of it put up again.
 */
import { useEffect, useRef, useState } from "react";
import BuildingData from "../../src/data/buildings";
import { kinds, open } from "../bench/world.js";
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

//how long what was put up again stands before it goes up ("again"), ms of
//the bench's own time
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

export default function Explosion() {
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [speed, setSpeed] = useState(1),
    [top, setTop] = useState(false),
    [kind, setKind] = useState(""),
    [seen, setSeen] = useState(null),
    [standing, setStanding] = useState(null),
    [left, setLeft] = useState(0),
    [piles, setPiles] = useState(0),
    [beside, setBeside] = useState(false),
    [hill, setHill] = useState(false),
    [around, setAround] = useState(false),
    [near, setNear] = useState([]);

  //the world, up once
  useEffect(function () {
    var looking = null;

    open(el.current).then(
      function (world) {
        world.speed = speed;
        bench.current = new Scene(world);
        window.bench.scene = bench.current;
        setKind(String(bench.current.code));
        setReady(true);
        looking = setInterval(function () {
          var b = bench.current.standing();

          setSeen(world.status());
          setStanding(b ? BuildingData[b.buildingCode].name : null);
          setLeft(bench.current.left().length);
          setPiles(bench.current.piles());
          setNear(bench.current.neighbourhood());
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

  //put up again, and blown up a moment after - as the bench's clock goes
  function again() {
    var s = scene(),
      time = s.world.client.game.time,
      until;

    if (!s.put()) return;
    until = time.time + STANDS;

    var waiting = setInterval(function () {
      if (time.time < until) return;

      clearInterval(waiting);
      s.explode();
    }, 30);
  }

  var s = seen,
    //something going on still: nothing to put up again till it is over
    busy =
      !!s &&
      (s.blowing > 0 || s.collapsing > 0 || s.dozers > 0 || s.waiting > 0);

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="explosion" className="gap-1.5 py-1.5">
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
            One building on a patch of flat grass, a road along its front and a
            few trees about it, blown up the way the game blows one up: no
            fence, no bulldozer - the charges going off at its foot, a fireball
            and pieces torn off it thrown all round, then what is left of it,
            blackened, coming down a tile at a time, a cloud of dust rolling out
            and down the road. Heaps of rubble are left where the building
            stood, smouldering, and its yard wrecked, till the bulldozers clear
            them away. With its neighbours, the blast brings down whatever is
            next to it or across the road, and knocks about what is further off.
          </Note>

          <Section title="What stands">
            <Row>
              <Select
                className="max-w-full"
                title="what stands"
                options={kinds()}
                value={kind}
                disabled={!ready || busy}
                onChange={function (e) {
                  if (scene().pick(e.target.value)) setKind(e.target.value);
                }}
              />
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="put it up again turned a quarter turn"
                disabled={!ready || busy}
                onClick={function () {
                  scene().turn();
                }}
              >
                turn it
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="another of it beside it, to blow up after it - a pile of rubble each"
                on={beside}
                disabled={!ready || busy || around}
                onClick={function () {
                  if (scene().setBeside(!beside)) setBeside(!beside);
                }}
              >
                two side by side
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="a house next to it, a park on its other side, a house across the road and one further along - for the blast to bring down the near ones"
                on={around}
                disabled={!ready || busy}
                onClick={function () {
                  if (scene().setAround(!around)) setAround(!around);
                }}
              >
                neighbours
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="the ground a hillside, for the rubble to lie on it as it slopes"
                on={hill}
                disabled={!ready || busy}
                onClick={function () {
                  if (scene().setHill(!hill)) setHill(!hill);
                }}
              >
                on a slope
              </Button>
            </Row>
            <div>
              {standing ? standing : "blown up - its rubble lies there"}
            </div>
          </Section>

          <Section title="The scene">
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="blow up the one in the middle - and then the one beside it"
                disabled={!ready || busy || left === 0}
                onClick={function () {
                  scene().explode();
                }}
              >
                blow up
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="the rubble pushed away by the bulldozers, for the clearing fee"
                disabled={!ready || busy || !s || s.heaps === 0}
                onClick={function () {
                  scene().clearRubble();
                }}
              >
                clear the rubble
              </Button>
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="put it all up again, once nothing is going on"
                disabled={!ready || busy}
                onClick={function () {
                  scene().put();
                }}
              >
                reset
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="put it all up again, and blow it up a moment after"
                disabled={!ready || busy}
                onClick={again}
              >
                again
              </Button>
            </Row>
          </Section>

          <Section title="Going on">
            {s && (
              <>
                <div>blowing up: {s.blowing}</div>
                <div>coming down by itself: {s.collapsing}</div>
                <div>pieces flying or lying about: {s.pieces}</div>
                <div>
                  heaps of rubble left: {s.heaps}, in {piles}{" "}
                  {piles === 1 ? "pile" : "piles"}
                </div>
                <div>wrecked yards: {s.wrecks}</div>
                {near.map(function (n) {
                  return (
                    <div key={n.what}>
                      {n.what} ({n.name}):{" "}
                      {n.health === null ? "down" : n.health + "% sound"}
                    </div>
                  );
                })}
                <div>bulldozers out: {s.dozers}</div>
                <div>tiles waiting for one: {s.waiting}</div>
              </>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
