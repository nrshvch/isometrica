/**
 * The sprite gallery: every picture the generators paint (shared/gen/
 * catalog), a generator at a time - painted in the page, off its thread
 * (painters.js), the way the game paints them, and only as they come into
 * sight. Filter by name, see them lit or at night, bigger, on another
 * ground; click one to see it big, with its name and size. The generator
 * open is in the address: sprites.html#trees.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as Catalog from "../../src/shared/gen/catalog.js";
import { Button, Header, Input, Select, Status, cx } from "../ui/kit.jsx";
import { describe, paint, put } from "./painters.js";

//how many cards a page of them is
var PAGE = 240;

var LOOKS = [
    { value: "", label: "lit" },
    { value: "night", label: "night" },
  ],
  SCALES = [
    { value: 1, label: "1x" },
    { value: 2, label: "2x" },
    { value: 3, label: "3x" },
  ],
  GROUNDS = [
    { value: "#26292d", label: "dark" },
    { value: "#e8e4da", label: "light" },
    { value: "#6a9a4a", label: "grass" },
  ];

function fromHash() {
  var gen = decodeURIComponent(location.hash.slice(1));

  return Catalog.GENERATORS.indexOf(gen) !== -1 ? gen : null;
}

/**
 * Tells a card when it comes into sight (or near it) in the grid - one
 * IntersectionObserver for all of them.
 */
function useSightings(rootRef) {
  var ref = useRef(null);

  if (ref.current === null) {
    var told = new Map(),
      observer = null;

    ref.current = function watch(el, seen) {
      if (observer === null)
        observer = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (e) {
              if (e.isIntersecting && told.has(e.target)) told.get(e.target)();
            });
          },
          { root: rootRef.current, rootMargin: "300px" },
        );

      told.set(el, seen);
      observer.observe(el);

      return function () {
        told.delete(el);
        observer.unobserve(el);
      };
    };
  }

  return ref.current;
}

/**
 * A card for a sprite, its canvas the size the picture will be - painted
 * once it comes into sight.
 */
function Card({ gen, sprite, look, scale, watch, onZoom }) {
  var box = useRef(null),
    canvas = useRef(null),
    [error, setError] = useState(null);

  useEffect(
    function () {
      var live = true,
        stop = watch(box.current, function () {
          stop();
          paint(gen, sprite[3], look).then(function (p) {
            if (!live) return;
            if (p.error) setError(p.error);
            else put(canvas.current, p);
          });
        });

      setError(null);

      return function () {
        live = false;
        stop();
      };
    },
    [gen, sprite, look, watch],
  );

  return (
    <div
      ref={box}
      title={
        sprite[0] +
        "  " +
        sprite[1] +
        "x" +
        sprite[2] +
        (error ? "\n" + error : "")
      }
      onClick={onZoom}
      className={cx(
        "flex cursor-pointer flex-col items-center justify-end border bg-(--bg) p-1 hover:border-accent",
        error ? "border-on" : "border-line",
      )}
    >
      <canvas
        ref={canvas}
        className="block [image-rendering:pixelated]"
        style={{ width: sprite[1] * scale, height: sprite[2] * scale }}
      />
    </div>
  );
}

//a sprite big, over the page, with its name and size; a click puts it away
function Zoom({ gen, sprite, look, onClose }) {
  var canvas = useRef(null),
    [size, setSize] = useState(null);

  useEffect(
    function () {
      var live = true;

      setSize(null);
      paint(gen, sprite[3], look).then(function (p) {
        if (!live || p.error) return;

        var scale = Math.max(
          2,
          Math.floor(
            Math.min(
              (innerWidth * 0.9) / p.width,
              (innerHeight * 0.75) / p.height,
            ),
          ),
        );

        put(canvas.current, p);
        setSize([p.width * scale, p.height * scale]);
      });

      return function () {
        live = false;
      };
    },
    [gen, sprite, look],
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 flex cursor-zoom-out flex-col items-center justify-center gap-2.5 bg-black/75"
    >
      <canvas
        ref={canvas}
        className="max-h-[80vh] max-w-[92vw] bg-(--bg) [image-rendering:pixelated]"
        style={size ? { width: size[0], height: size[1] } : { width: 0 }}
      />
      <div className="px-4 text-center break-all text-text">
        {sprite[0] +
          " - " +
          sprite[1] +
          "x" +
          sprite[2] +
          (sprite[3] !== sprite[0] ? " - " + sprite[3] : "")}
      </div>
    </div>
  );
}

export default function Sprites() {
  var [gen, setGen] = useState(function () {
      return fromHash() || "vehicles";
    }),
    //what each generator paints, once it has said
    [described, setDescribed] = useState({}),
    [filter, setFilter] = useState(""),
    [words, setWords] = useState([]),
    [look, setLook] = useState(""),
    [scale, setScale] = useState(2),
    [bg, setBg] = useState(GROUNDS[0].value),
    [shown, setShown] = useState(PAGE),
    [zoomed, setZoomed] = useState(null),
    grid = useRef(null),
    watch = useSightings(grid),
    d = described[gen];

  useEffect(
    function () {
      var live = true;

      describe(gen).then(function (m) {
        if (live)
          setDescribed(function (was) {
            return Object.assign({}, was, { [gen]: m });
          });
      });

      return function () {
        live = false;
      };
    },
    [gen],
  );

  //a generator named in the address
  useEffect(function () {
    function named() {
      var g = fromHash();

      if (g !== null) setGen(g);
    }

    window.addEventListener("hashchange", named);

    return function () {
      window.removeEventListener("hashchange", named);
    };
  }, []);

  //the filter, once typing stops
  useEffect(
    function () {
      var typing = setTimeout(function () {
        setWords(filter.toLowerCase().split(/\s+/).filter(Boolean));
      }, 200);

      return function () {
        clearTimeout(typing);
      };
    },
    [filter],
  );

  //the sprites of the generator open that match the filter
  var matches = useMemo(
    function () {
      if (!d) return [];

      return d.sprites.filter(function (s) {
        var name = s[0].toLowerCase();

        return words.every(function (w) {
          return name.indexOf(w) !== -1;
        });
      });
    },
    [d, words],
  );

  //a page of them, from the top, whenever what is listed changes
  useEffect(
    function () {
      setShown(PAGE);
      if (grid.current) grid.current.scrollTop = 0;
    },
    [gen, words, look],
  );

  function open(g) {
    setGen(g);
    history.replaceState(null, "", "#" + g);
  }

  var upto = Math.min(matches.length, shown);

  return (
    <div className="flex h-screen flex-col text-xs" style={{ "--bg": bg }}>
      <Header page="sprites">
        <Input
          className="min-w-[120px] flex-[1_1_180px]"
          placeholder="filter: e.g. cottage thatch r0"
          value={filter}
          onChange={function (e) {
            setFilter(e.target.value);
          }}
        />
        <Select
          title="how it is painted"
          options={LOOKS}
          value={look}
          onChange={function (e) {
            setLook(e.target.value);
          }}
        />
        <Select
          title="how big"
          options={SCALES}
          value={scale}
          onChange={function (e) {
            setScale(+e.target.value);
          }}
        />
        <Select
          title="behind it"
          options={GROUNDS}
          value={bg}
          onChange={function (e) {
            setBg(e.target.value);
          }}
        />
      </Header>

      <div className="flex min-h-0 flex-1">
        <nav className="w-[170px] flex-none overflow-y-auto border-r border-line max-sm:w-[120px]">
          {Catalog.GENERATORS.map(function (g) {
            return (
              <button
                key={g}
                type="button"
                onClick={function () {
                  open(g);
                }}
                className={cx(
                  "flex w-full cursor-pointer justify-between border-b border-[#2a2d31] px-2.5 py-[7px] text-left",
                  g === gen
                    ? "bg-act text-white"
                    : "text-[#ccc] hover:bg-panel",
                )}
              >
                {g}
                <small className={g === gen ? "text-white/70" : "text-dim"}>
                  {described[g] ? described[g].sprites.length : ""}
                </small>
              </button>
            );
          })}
        </nav>

        <div
          ref={grid}
          className="flex flex-1 flex-wrap content-start gap-2 overflow-y-auto p-2.5"
        >
          {matches.slice(0, upto).map(function (s) {
            return (
              <Card
                key={s[0]}
                gen={gen}
                sprite={s}
                look={look || undefined}
                scale={scale}
                watch={watch}
                onZoom={function () {
                  setZoomed(s);
                }}
              />
            );
          })}
          {upto < matches.length && (
            <Button
              className="mt-1.5 w-full"
              onClick={function () {
                setShown(upto + PAGE);
              }}
            >
              {"show " +
                Math.min(PAGE, matches.length - upto) +
                " more of " +
                (matches.length - upto)}
            </Button>
          )}
        </div>
      </div>

      <Status className="border-t border-line px-3 py-1.5 text-muted">
        {d
          ? gen +
            ": " +
            matches.length +
            " of " +
            d.sprites.length +
            " pictures" +
            (words.length ? " match" : "") +
            " - described in " +
            Math.round(d.ms) +
            " ms" +
            (d.faced ? "" : " - painted lit only")
          : "describing " + gen + "..."}
      </Status>

      {zoomed && (
        <Zoom
          gen={gen}
          sprite={zoomed}
          look={look || undefined}
          onClose={function () {
            setZoomed(null);
          }}
        />
      )}
    </div>
  );
}
