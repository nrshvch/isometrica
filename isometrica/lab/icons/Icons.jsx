/**
 * The icon kit (src/shared/icons/kit.js), drawn in the page as it is now -
 * a change to an icon shows here before it is written out - on the grounds
 * the games put them on, at the sizes they show them at. Click one for it
 * on its grid, its SVG and how a game shows it. Any icon drawn otherwise than
 * the written-out set has it (src/shared/icons/index.js) is marked, for
 * npm run generate:icons.
 */
import { useMemo, useState } from "react";
import { NAMES, SIZE, draw, svg } from "../../src/shared/icons/kit.js";
import written from "../../src/shared/icons/index.js";
import { Button, Header, Input, Select, Status, cx } from "../ui/kit.jsx";

var SIZES = [16, 24, 32, 48, 64].map(function (s) {
    return { value: s, label: s + "px" };
  }),
  //what the icons are shown on, and in what colour: a game's button, and
  //plain grounds
  GROUNDS = [
    { value: "button", label: "game button", bg: "#2e9c9c", fg: "#ffffff" },
    { value: "danger", label: "leave button", bg: "#c8553d", fg: "#ffffff" },
    { value: "dark", label: "dark", bg: "#16181a", fg: "#dddddd" },
    { value: "light", label: "light", bg: "#e8e4da", fg: "#16282a" },
    { value: "grass", label: "grass", bg: "#6a9a4a", fg: "#ffffff" },
  ];

function groundOf(value) {
  return (
    GROUNDS.find(function (g) {
      return g.value === value;
    }) || GROUNDS[0]
  );
}

//an icon as a game shows it: one colour, the text's, as big as asked
function Glyph({ icon, size, className }) {
  return (
    <svg
      viewBox={"0 0 " + SIZE + " " + SIZE}
      width={size}
      height={size}
      fill="currentColor"
      className={cx("block shrink-0", className)}
    >
      <path d={icon} />
    </svg>
  );
}

//big, on the grid it is drawn on: a line every unit, and the margin it
//keeps within
function Grid({ icon }) {
  var lines = [];

  for (var k = 1; k < SIZE; k++)
    lines.push(
      <path
        key={k}
        d={"M" + k + " 0V" + SIZE + "M0 " + k + "H" + SIZE}
        stroke="#ffffff"
        strokeOpacity="0.08"
        strokeWidth="0.04"
      />,
    );

  return (
    <svg
      viewBox={"0 0 " + SIZE + " " + SIZE}
      className="block w-full max-w-[320px] border border-line bg-ink"
    >
      {lines}
      <rect
        x="2"
        y="2"
        width={SIZE - 4}
        height={SIZE - 4}
        fill="none"
        stroke="#7fc4c4"
        strokeOpacity="0.5"
        strokeWidth="0.06"
      />
      <path d={icon} fill="#ffffff" />
    </svg>
  );
}

function Detail({ name, icon, stale, onClose }) {
  var markup = svg(icon),
    [copied, setCopied] = useState(null);

  function copy(what, text) {
    navigator.clipboard.writeText(text).then(function () {
      setCopied(what);
    });
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        className="max-h-full w-full max-w-2xl overflow-y-auto border border-line bg-panel p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold text-accent">{name}</h2>
          {stale && (
            <span className="text-bad">changed - not written out yet</span>
          )}
          <Button className="ml-auto" onClick={onClose}>
            close
          </Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Grid icon={icon} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-end gap-3">
              {GROUNDS.slice(0, 2).map(function (g) {
                return (
                  <div
                    key={g.value}
                    className="p-2"
                    style={{ background: g.bg, color: g.fg }}
                  >
                    <Glyph icon={icon} size={48} />
                  </div>
                );
              })}
              {SIZES.map(function (s) {
                return (
                  <Glyph
                    key={s.value}
                    icon={icon}
                    size={s.value}
                    className="text-text"
                  />
                );
              })}
            </div>
            <div className="text-muted">
              {"src/shared/icons/svg/" + name + ".svg"}
            </div>
            <pre className="max-h-32 overflow-auto bg-ink p-2 text-[11px] break-all whitespace-pre-wrap text-muted">
              {markup}
            </pre>
            <div className="flex flex-wrap gap-1.5">
              <Button
                onClick={function () {
                  copy("svg", markup);
                }}
              >
                {copied === "svg" ? "copied" : "copy SVG"}
              </Button>
              <Button
                onClick={function () {
                  copy(
                    "jsx",
                    '<Icon name="' + name + '" className="size-6" />',
                  );
                }}
              >
                {copied === "jsx" ? "copied" : "copy <Icon>"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Icons() {
  var [filter, setFilter] = useState(""),
    [size, setSize] = useState(32),
    [ground, setGround] = useState("button"),
    [open, setOpen] = useState(null),
    //every icon drawn now, and whether the written-out set has it the same
    icons = useMemo(function () {
      return NAMES.map(function (name) {
        var icon = draw(name),
          was = written[name];

        return {
          name: name,
          icon: icon,
          stale: was !== icon,
        };
      });
    }, []),
    words = filter.toLowerCase().split(/\s+/).filter(Boolean),
    shown = icons.filter(function (i) {
      return words.every(function (w) {
        return i.name.indexOf(w) !== -1;
      });
    }),
    stale = icons.filter(function (i) {
      return i.stale;
    }),
    gone = Object.keys(written).filter(function (name) {
      return NAMES.indexOf(name) === -1;
    }),
    g = groundOf(ground),
    opened = icons.find(function (i) {
      return i.name === open;
    });

  return (
    <div className="flex min-h-screen flex-col text-xs">
      <Header page="icons">
        <Input
          className="min-w-[120px] flex-[1_1_180px]"
          placeholder="filter: e.g. road one-way"
          value={filter}
          onChange={function (e) {
            setFilter(e.target.value);
          }}
        />
        <Select
          title="how big"
          options={SIZES}
          value={size}
          onChange={function (e) {
            setSize(+e.target.value);
          }}
        />
        <Select
          title="on what"
          options={GROUNDS}
          value={ground}
          onChange={function (e) {
            setGround(e.target.value);
          }}
        />
      </Header>

      <div className="flex flex-1 flex-wrap content-start gap-2 p-3">
        {shown.map(function (i) {
          return (
            <button
              key={i.name}
              type="button"
              title={i.name}
              onClick={function () {
                setOpen(i.name);
              }}
              className={cx(
                "flex w-28 cursor-pointer flex-col items-center gap-2 border bg-panel p-2 hover:border-accent",
                i.stale ? "border-on" : "border-line",
              )}
            >
              <div
                className="grid size-20 place-items-center"
                style={{ background: g.bg, color: g.fg }}
              >
                <Glyph icon={i.icon} size={size} />
              </div>
              <span
                className={cx(
                  "w-full truncate text-center",
                  i.stale ? "text-bad" : "text-muted",
                )}
              >
                {i.name}
              </span>
            </button>
          );
        })}
      </div>

      <Status className="border-t border-line px-3 py-1.5">
        {icons.length +
          " icons, drawn on a " +
          SIZE +
          " by " +
          SIZE +
          " grid - " +
          (stale.length === 0 && gone.length === 0
            ? "the written-out set is the same"
            : (stale.length
                ? stale.length +
                  " drawn otherwise than written out (" +
                  stale
                    .map(function (i) {
                      return i.name;
                    })
                    .join(", ") +
                  ")"
                : "") +
              (gone.length
                ? (stale.length ? ", " : "") +
                  gone.length +
                  " written out and drawn no more (" +
                  gone.join(", ") +
                  ")"
                : "") +
              " - npm run generate:icons")}
      </Status>

      {opened && (
        <Detail
          name={opened.name}
          icon={opened.icon}
          stale={opened.stale}
          onClose={function () {
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
