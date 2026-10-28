/**
 * The building bench's page (stand.js): one building, whole, on flat grass -
 * picked, turned, given another look, brought down and put back up.
 */
import { useEffect, useRef, useState } from "react";
import { open, buildings } from "../bench/stage.js";
import { Stand } from "./stand.js";
import { Button, Header, Select, Status, cx } from "../ui/kit.jsx";

var SPEEDS = [
  { value: 0, label: "stopped" },
  { value: 0.1, label: "⅒×" },
  { value: 0.25, label: "¼×" },
  { value: 0.5, label: "½×" },
  { value: 1, label: "1×" },
  { value: 2, label: "2×" },
];

//what it opens on: a block of flats, put together out of the most parts
var FIRST = "440";

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

export default function Buildings() {
  var el = useRef(null),
    bench = useRef(null),
    options = useRef(buildings()),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [code, setCode] = useState(FIRST),
    [speed, setSpeed] = useState(1),
    [top, setTop] = useState(false),
    [down, setDown] = useState(false),
    [said, setSaid] = useState(""),
    [seen, setSeen] = useState(null);

  //the stage, up once
  useEffect(function () {
    var looking = null;

    open(el.current).then(
      function (stage) {
        stage.speed = speed;
        bench.current = new Stand(stage, code);
        window.bench.stand = bench.current;
        setReady(true);
        looking = setInterval(function () {
          setSeen(stage.status());
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

  function stand() {
    return bench.current;
  }

  //put up again, some way
  function shown() {
    setDown(false);
    setSaid("");
  }

  function pick(v) {
    setCode(v);
    stand().pick(v);
    shown();
  }

  var s = seen;

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="buildings" className="gap-1.5 py-1.5">
        <Select
          title="how fast"
          options={SPEEDS}
          value={speed}
          onChange={function (e) {
            setSpeed(+e.target.value);
            if (stand()) stand().stage.speed = +e.target.value;
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn left"
          disabled={!ready || top}
          onClick={function () {
            stand().stage.turn(-1);
          }}
        >
          ⟲
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn right"
          disabled={!ready || top}
          onClick={function () {
            stand().stage.turn(1);
          }}
        >
          ⟳
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={top}
          disabled={!ready}
          onClick={function () {
            stand().stage.top(!top);
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
            One building, whole - put together out of its parts the way the game
            puts it together - on a patch of flat grass, nothing else. Turn it,
            look at it from any side, give it another look; bring it down the
            way it comes down in the game, fenced off and every tile of it at
            once, and put it back up.
          </Note>

          <Section title="The building">
            <Row>
              <Select
                className="max-w-full"
                title="the building"
                options={options.current}
                value={code}
                disabled={!ready}
                onChange={function (e) {
                  pick(e.target.value);
                }}
              />
            </Row>
            <Row>
              <Button
                className="px-1.5 py-0.5"
                title="another look for the same kind"
                disabled={!ready}
                onClick={function () {
                  var looks = stand().another();

                  setDown(false);
                  setSaid(looks ? "" : "drawn whole: it has the one look");
                }}
              >
                random
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="any building at all"
                disabled={!ready}
                onClick={function () {
                  var any = stand().any();

                  setCode(String(any));
                  shown();
                }}
              >
                any
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="turn it a quarter turn left on its ground"
                disabled={!ready}
                onClick={function () {
                  stand().rotate(-1);
                  shown();
                }}
              >
                rotate ⟲
              </Button>
              <Button
                className="px-1.5 py-0.5"
                title="turn it a quarter turn right on its ground"
                disabled={!ready}
                onClick={function () {
                  stand().rotate(1);
                  shown();
                }}
              >
                rotate ⟳
              </Button>
            </Row>
          </Section>

          <Section title="Bring it down">
            <Row>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready || down}
                onClick={function () {
                  setDown(stand().demolish());
                }}
              >
                demolish
              </Button>
              <Button
                className="px-1.5 py-0.5"
                disabled={!ready}
                onClick={function () {
                  stand().restore();
                  shown();
                }}
              >
                restore
              </Button>
            </Row>
          </Section>

          <Section title="Going on">
            {s && (
              <>
                <div>coming down: {s.coming}</div>
                <div>heaps of rubble: {s.rubble}</div>
                <div>stretches of fence: {s.fence}</div>
              </>
            )}
            <Status className={cx("mt-1", said && "text-bad")}>{said}</Status>
          </Section>
        </aside>
      </div>
    </div>
  );
}
