/**
 * The woods map's page: the map (map.js), which of it to see and where,
 * what each colour is, and what is on the tile under the pointer. Drag to
 * look round; the shares are of the trees in sight.
 */
import { useEffect, useRef, useState } from "react";
import {
  Article,
  Button,
  Choice,
  Field,
  Input,
  Select,
  Status,
  cx,
} from "../ui/kit.jsx";
import {
  HOME,
  KINDS,
  KIND_COLOURS,
  SEA,
  SHORE,
  WOODS,
  WOOD_COLOURS,
  at,
  draw,
  rgb,
} from "./map.js";

var VIEWS = [
    { value: "trees", label: "Trees" },
    { value: "woods", label: "Woods" },
  ],
  SCALES = [1, 2, 3, 4, 6].map(function (s) {
    return { value: s, label: s + "px" };
  });

/**
 * A number to type in, taken once it is changed - let go of, entered, or
 * stepped - not at every key.
 */
function Coordinate({ label, value, onChange }) {
  var input = useRef(null),
    told = useRef(onChange);

  told.current = onChange;

  useEffect(
    function () {
      input.current.value = value;
    },
    [value],
  );

  useEffect(function () {
    var el = input.current;

    function changed() {
      var v = Math.round(+el.value);

      if (isFinite(v)) told.current(Math.max(0, Math.min(65535, v)));
    }

    el.addEventListener("change", changed);

    return function () {
      el.removeEventListener("change", changed);
    };
  }, []);

  return (
    <Field label={label}>
      <Input ref={input} type="number" className="w-24" />
    </Field>
  );
}

function Swatch({ colour, name, note }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <i
        className="inline-block size-3 border border-black/40"
        style={{ background: rgb(colour) }}
      />
      {name}
      {note && <small className="text-dim">{note}</small>}
    </span>
  );
}

export default function WoodsPage() {
  var canvas = useRef(null),
    [view, setView] = useState("trees"),
    [scale, setScale] = useState(2),
    [centre, setCentre] = useState(HOME),
    [size, setSize] = useState(0),
    [drawn, setDrawn] = useState(null),
    [under, setUnder] = useState(null),
    //where a drag started, and how far it has gone
    [drag, setDrag] = useState(null);

  //drawn again when the window is
  useEffect(function () {
    function resized() {
      setSize(function (n) {
        return n + 1;
      });
    }

    window.addEventListener("resize", resized);

    return function () {
      window.removeEventListener("resize", resized);
    };
  }, []);

  useEffect(
    function () {
      setDrawn(draw(canvas.current, centre, scale, view));
      setUnder(null);
    },
    [centre, scale, view, size],
  );

  function hover(e) {
    if (drawn === null) return;

    var r = canvas.current.getBoundingClientRect(),
      d = drawn.drawn,
      x = Math.floor(((e.clientX - r.left) / r.width) * d.w),
      y = Math.floor(((e.clientY - r.top) / r.height) * d.h);

    if (x < 0 || y < 0 || x >= d.w || y >= d.h) return;

    setUnder(at(d, x, y));
  }

  //dragged round, the map follows the pointer and is drawn again once let go
  function down(e) {
    canvas.current.setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
  }

  function move(e) {
    if (drag === null) return hover(e);

    setDrag(
      Object.assign({}, drag, {
        dx: e.clientX - drag.x,
        dy: e.clientY - drag.y,
      }),
    );
  }

  function up(e) {
    if (drag === null) return;

    var per = canvas.current.getBoundingClientRect().width / drawn.drawn.w;

    setDrag(null);
    setCentre([
      Math.round(centre[0] - (e.clientX - drag.x) / per),
      Math.round(centre[1] - (e.clientY - drag.y) / per),
    ]);
  }

  var status = "";

  if (under !== null) status = under;
  else if (drawn !== null)
    status =
      drawn.drawn.w +
      " by " +
      drawn.drawn.h +
      " tiles in " +
      Math.round(drawn.ms) +
      " ms" +
      (view === "trees" && drawn.land > 0
        ? ", trees on " +
          Math.round((100 * drawn.trees) / drawn.land) +
          "% of the land"
        : "");

  return (
    <Article
      page="woods"
      wide
      title="Woods map"
      about="Where the world grows its trees, and which, a pixel or a few for every tile - worked out here in the page from the same code the games use (src/core/woods.js, on the ground of src/core/terrain.js). Drag to look round; the shares are of the trees in sight."
    >
      <div className="mb-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <Choice values={VIEWS} value={view} onChange={setView} />
        <Field label="tile">
          <Select
            options={SCALES}
            value={scale}
            onChange={function (e) {
              setScale(+e.target.value);
            }}
          />
        </Field>
        <Coordinate
          label="x"
          value={centre[0]}
          onChange={function (x) {
            setCentre([x, centre[1]]);
          }}
        />
        <Coordinate
          label="y"
          value={centre[1]}
          onChange={function (y) {
            setCentre([centre[0], y]);
          }}
        />
        <Button
          onClick={function () {
            setCentre(HOME.slice());
          }}
        >
          The starting city
        </Button>
      </div>

      <div className="overflow-hidden">
        <canvas
          ref={canvas}
          className={cx(
            "block h-[560px] w-full touch-none bg-well [image-rendering:pixelated]",
            drag ? "cursor-grabbing" : "cursor-grab",
          )}
          style={
            drag
              ? { transform: "translate(" + drag.dx + "px," + drag.dy + "px)" }
              : undefined
          }
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onPointerLeave={function () {
            if (drag === null) setUnder(null);
          }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {view === "woods"
          ? WOODS.map(function (wood, w) {
              return (
                <Swatch
                  key={wood.name}
                  colour={WOOD_COLOURS[w]}
                  name={wood.name}
                />
              );
            })
          : KINDS.map(function (kind) {
              var trees = drawn ? drawn.trees : 0;

              return (
                <Swatch
                  key={kind}
                  colour={KIND_COLOURS[kind]}
                  name={kind}
                  note={
                    trees > 0
                      ? Math.round((100 * (drawn.count[kind] || 0)) / trees) +
                        "%"
                      : ""
                  }
                />
              );
            })}
        <Swatch colour={SEA} name="sea" />
        <Swatch colour={SHORE} name="shore" />
      </div>

      <Status className="mt-2">{status}</Status>
    </Article>
  );
}
