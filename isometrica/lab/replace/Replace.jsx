/**
 * The replacement bench's page (scene.js): one building on flat grass, a
 * road along its front, put up in the place of itself - another look of
 * the same - or of anything else that covers its ground, the way the game
 * does it: it comes down as the bulldozers get to it, and a building site
 * goes up on its ground once they are done. As slowly as wanted, the sites
 * faster than the game has them if asked, turned round or from above.
 */
import { useEffect, useRef, useState } from "react";
import BuildingData from "../../src/data/buildings";
import { open } from "../bench/world.js";
import { Scene, kinds } from "./scene.js";
import { Button, Field, Header, Select, Status } from "../ui/kit.jsx";

var SPEEDS = [
  { value: 0, label: "stopped" },
  { value: 0.1, label: "⅒×" },
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

//how much faster than the game the sites go up
var SITE_PACES = [
  { value: 1, label: "as the game" },
  { value: 4, label: "4× quicker" },
  { value: 10, label: "10× quicker" },
  { value: 30, label: "30× quicker" },
];

//why a replacement was turned down, by ErrorCode (core/errorcode)
var TURNED_DOWN = {
  2: "not available",
  3: "not enough money",
  12: "nothing standing to replace",
  15: "does not fit its ground",
};

//"the same" in the list of what to put up: another look of what stands
var SAME = "";

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

//a short name for a look, to see it is another one: a hash of it
function lookName(look) {
  if (!look) return "-";

  var s = JSON.stringify(look),
    h = 0;

  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;

  return (h >>> 0).toString(16).slice(0, 6);
}

//what stands, as the page says it
function describe(b) {
  if (!b) return null;

  var data = BuildingData[b.buildingCode];

  return {
    name: data.name,
    code: b.buildingCode,
    rotation: b.rotation,
    look: lookName(b.look),
    progress: b.getProgress(),
  };
}

export default function Replace() {
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [speed, setSpeed] = useState(1),
    [sitePace, setSitePace] = useState(4),
    [top, setTop] = useState(false),
    [kind, setKind] = useState(""),
    [replaceWith, setReplaceWith] = useState(SAME),
    [said, setSaid] = useState(""),
    [seen, setSeen] = useState(null),
    //what stood before the last replacement, and what stands now
    [before, setBefore] = useState(null),
    [now, setNow] = useState(null);

  //the world, up once
  useEffect(function () {
    var looking = null;

    open(el.current).then(
      function (world) {
        world.speed = speed;
        world.sitePace = sitePace;
        bench.current = new Scene(world);
        window.bench.scene = bench.current;
        setKind(String(bench.current.code));
        setReady(true);
        looking = setInterval(function () {
          setSeen(world.status());
          setNow(describe(bench.current.standing()));
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

  function replace() {
    var s = scene(),
      was = describe(s.standing()),
      error = s.replace(replaceWith || null);

    if (error === 0) {
      setBefore(was);
      setSaid("");
      setKind(String(s.code));
      setReplaceWith(SAME);
    } else setSaid("turned down: " + (TURNED_DOWN[error] || "error " + error));
  }

  var s = seen,
    //the bulldozers still at it, or the site waiting for them: nothing to
    //put up again or replace till they are done
    busy = !!s && (s.dozers > 0 || s.waiting > 0 || s.replacing > 0),
    candidates = ready ? scene().candidates() : [];

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="replace" className="gap-1.5 py-1.5">
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
            One building on a patch of flat grass, a road along its front,
            replaced the way the game replaces one: fenced off, the bulldozers
            coming, coming down a tile at a time as they get to it - and a
            building site on its ground as soon as they are done, going up into
            another look of the same, or whatever was picked to go up instead.
          </Note>

          <Section title="What stands">
            <Row>
              <Select
                className="max-w-full"
                title="what stands to begin with"
                options={kinds()}
                value={kind}
                disabled={!ready || busy}
                onChange={function (e) {
                  if (scene().pick(e.target.value)) {
                    setKind(e.target.value);
                    setReplaceWith(SAME);
                    setBefore(null);
                  }
                }}
              />
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="put it up again turned a quarter turn, the road along its front"
                disabled={!ready || busy}
                onClick={function () {
                  scene().turn();
                }}
              >
                turn it
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="put it up again, finished, once the bulldozers are done"
                disabled={!ready || busy}
                onClick={function () {
                  scene().put();
                  setBefore(null);
                }}
              >
                reset
              </Button>
            </Row>
            {now ? (
              <div>
                {now.name} ({now.code}), turned {now.rotation}, look {now.look}
                {now.progress < 1 &&
                  " - going up, " + Math.floor(now.progress * 100) + "%"}
              </div>
            ) : (
              <div>nothing - the ground is being cleared</div>
            )}
            {before && (
              <div className="text-muted">
                before: {before.name} ({before.code}), turned {before.rotation},
                look {before.look}
              </div>
            )}
          </Section>

          <Section title="Replace">
            <Row>
              <Field label="with">
                <Select
                  className="max-w-52"
                  options={[
                    { value: SAME, label: "the same, another look" },
                  ].concat(candidates)}
                  value={replaceWith}
                  disabled={!ready || busy}
                  onChange={function (e) {
                    setReplaceWith(e.target.value);
                  }}
                />
              </Field>
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready || busy || !now}
                onClick={replace}
              >
                replace
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="the building site finished there and then"
                disabled={!ready || !s || s.sites.length === 0}
                onClick={function () {
                  scene().world.finish();
                }}
              >
                finish the site
              </Button>
            </Row>
            <Row>
              <Field label="sites go up">
                <Select
                  options={SITE_PACES}
                  value={sitePace}
                  onChange={function (e) {
                    setSitePace(+e.target.value);
                    if (scene()) scene().world.sitePace = +e.target.value;
                  }}
                />
              </Field>
            </Row>
            <Status className="text-bad">{said}</Status>
          </Section>

          <Section title="Going on">
            {s && (
              <>
                <div>bulldozers out: {s.dozers}</div>
                <div>tiles waiting for one: {s.waiting}</div>
                <div>buildings coming down: {s.coming}</div>
                <div>heaps of rubble: {s.rubble}</div>
                <div>stretches of fence: {s.fence}</div>
                <div>waiting to go up: {s.replacing}</div>
                <div>
                  sites going up:{" "}
                  {s.sites.length === 0
                    ? "none"
                    : s.sites
                        .map(function (p) {
                          return Math.floor(p * 100) + "%";
                        })
                        .join(", ")}
                </div>
              </>
            )}
          </Section>
        </aside>
      </div>
    </div>
  );
}
