/**
 * The icon directions, to be decided on before the whole set is drawn: the
 * samples drawn three ways - in colour turned to show a front and a side
 * (art.js), in colour isometric as the world is drawn (iso.js), and drawn
 * for one colour (mono.js) - by day and by night, and the game's HUD made
 * up over the world each way.
 */
import { useId } from "react";
import { Header } from "../ui/kit.jsx";
import { SIGNS, WORLD } from "./art.js";
import { ISO } from "./iso.js";
import { MONO } from "./mono.js";
import { render, renderMono } from "./render.js";
import dayShot from "./world.jpg";
import dayPhone from "./world-phone.jpg";
import nightShot from "./night.jpg";
import nightPhone from "./night-phone.jpg";

var INK = "#0b1220";

var SHOTS = {
  day: { wide: dayShot, phone: dayPhone },
  night: { wide: nightShot, phone: nightPhone },
};

//what floats over the world: in colour, a shadow under its own outline; in
//one colour, white outlined in ink
var FLOAT = {
  colour: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))",
  mono:
    "drop-shadow(1.25px 0 0 " +
    INK +
    ") drop-shadow(-1.25px 0 0 " +
    INK +
    ") " +
    "drop-shadow(0 1.25px 0 " +
    INK +
    ") drop-shadow(0 -1.25px 0 " +
    INK +
    ") " +
    "drop-shadow(0 3px 5px rgba(0,0,0,0.55))",
};

function find(name) {
  return WORLD.concat(SIGNS).find(function (i) {
    return i.name === name;
  });
}

/**
 * One sample, drawn one of the ways: "turned" or "iso", in colour - dark for
 * as at night - or "mono", in one colour (white, or the colour given).
 * Isometric only what stands in the world; the signs are turned whichever.
 */
function Art({ name, way, dark, size, float, colour }) {
  var id = useId().replace(/[^a-zA-Z0-9]/g, ""),
    mono = way === "mono",
    svg = mono
      ? renderMono(MONO[name], id)
      : render(
          way === "iso" && ISO[name] ? ISO[name] : find(name).art,
          false,
          id,
          dark,
        );

  return (
    <span
      className="inline-block shrink-0 [&>svg]:block [&>svg]:size-full"
      style={{
        width: size,
        height: size,
        color: mono ? colour || "#ffffff" : undefined,
        filter: float ? FLOAT[mono ? "mono" : "colour"] : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

//a strip of the world, by day or by night, to float icons over
function Ground({ time, className, children }) {
  return (
    <div
      className={className}
      style={{
        backgroundImage: "url(" + SHOTS[time].wide + ")",
        backgroundSize: "900px",
        backgroundPosition: "40% 55%",
      }}
    >
      {children}
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[10px] tracking-wide text-muted uppercase">
      {children}
    </span>
  );
}

/**
 * What is done to the world, one icon three ways: big on white, then over
 * the world by day and by night at the size the HUD shows them - and, at
 * night, the colour ones as at night too.
 */
function WorldSample({ item }) {
  var ways = [
    ["turned", "turned"],
    ["iso", "isometric"],
    ["mono", "one colour"],
  ];

  return (
    <div className="flex flex-col gap-2 border border-line bg-panel p-2">
      <div className="text-[13px] font-bold">{item.label}</div>
      <div className="grid grid-cols-3 gap-2">
        {ways.map(function (w) {
          return (
            <div key={w[0]} className="flex flex-col items-center gap-1">
              <div className="bg-white p-1">
                <Art name={item.name} way={w[0]} size={84} colour="#1e2235" />
              </div>
              <Tag>{w[1]}</Tag>
            </div>
          );
        })}
      </div>
      {["day", "night"].map(function (time) {
        return (
          <Ground
            key={time}
            time={time}
            className="grid grid-cols-3 place-items-center py-2"
          >
            {ways.map(function (w) {
              return (
                <Art key={w[0]} name={item.name} way={w[0]} size={44} float />
              );
            })}
          </Ground>
        );
      })}
      <Ground time="night" className="flex items-center justify-around py-2">
        <Art name={item.name} way="turned" dark size={44} float />
        <Art name={item.name} way="iso" dark size={44} float />
        <span className="max-w-24 bg-ink/80 px-1.5 py-0.5 text-[10px] leading-tight text-white/85">
          painted as at night
        </span>
      </Ground>
    </div>
  );
}

function SignSample({ item }) {
  return (
    <div className="flex flex-col gap-2 border border-line bg-panel p-2">
      <div className="text-[13px] font-bold">{item.label}</div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["turned", "colour"],
          ["mono", "one colour"],
        ].map(function (w) {
          return (
            <div key={w[0]} className="flex flex-col items-center gap-1">
              <div className="bg-white p-1">
                <Art name={item.name} way={w[0]} size={72} colour="#1e2235" />
              </div>
              <Tag>{w[1]}</Tag>
            </div>
          );
        })}
      </div>
      {["day", "night"].map(function (time) {
        return (
          <Ground
            key={time}
            time={time}
            className="grid grid-cols-2 place-items-center py-2"
          >
            <Art name={item.name} way="turned" size={40} float />
            <Art name={item.name} way="mono" size={40} float />
          </Ground>
        );
      })}
    </div>
  );
}

/* --- the HUD made up --------------------------------------------------- */

//the buttons along the bottom with nothing going on
var BAR = [
  ["found", "New city"],
  ["build", "Build"],
  ["road", "Road"],
  ["clear", "Terrain"],
  ["land", "Land"],
];

var LABEL = {
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textShadow:
    "1px 0 0 " +
    INK +
    ",-1px 0 0 " +
    INK +
    ",0 1px 0 " +
    INK +
    ",0 -1px 0 " +
    INK +
    ",0 2px 5px rgba(0,0,0,0.6)",
};

//the time and the money, and the menu, in the HUD's top right corner
function Corner({ chrome, px }) {
  return (
    <div className="flex items-start" style={{ gap: px(10) }}>
      <div className="flex flex-col items-end" style={{ ...LABEL, gap: px(4) }}>
        <div
          className="flex items-center"
          style={{ gap: px(6), fontSize: px(15) }}
        >
          <Art name="clock" way={chrome} size={px(18)} float />
          23:10
        </div>
        <div
          className="flex items-center"
          style={{ gap: px(6), fontSize: px(18), color: "#ffc94a" }}
        >
          <Art name="coin" way={chrome} size={px(24)} float colour="#ffc94a" />
          $134,124,641
        </div>
      </div>
      <Art name="menu" way={chrome} size={px(38)} float />
    </div>
  );
}

function real(n) {
  return n + "px";
}

/**
 * The top and the bottom of the HUD over the world, every pixel as the
 * game would draw it: world says which way the world's buttons are drawn,
 * chrome the HUD's own.
 */
function Strips({ time, world, chrome }) {
  var shot = SHOTS[time].wide;

  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex h-[76px] items-start justify-between border border-line px-4 pt-3"
        style={{
          backgroundImage: "url(" + shot + ")",
          backgroundSize: "1280px",
          backgroundPosition: "50% 0",
        }}
      >
        <span
          className="grid size-16 place-items-center rounded-full border-2 border-dashed border-white/50 text-white/70"
          style={LABEL}
        >
          logo
        </span>
        <Corner chrome={chrome} px={real} />
      </div>
      <div
        className="flex h-[112px] items-end justify-center border border-line pb-3"
        style={{
          backgroundImage: "url(" + shot + ")",
          backgroundSize: "1280px",
          backgroundPosition: "50% 100%",
        }}
      >
        <div className="grid w-full max-w-2xl grid-cols-5">
          {BAR.map(function (b) {
            return (
              <div key={b[0]} className="flex flex-col items-center gap-1">
                <Art name={b[0]} way={world} size={56} float />
                <span
                  style={{ ...LABEL, fontSize: 11, textTransform: "uppercase" }}
                >
                  {b[1]}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

//the HUD over the world on a phone, 390 wide as the game would be, shown as
//wide as it is given
function Phone({ time, world, chrome }) {
  function px(n) {
    return (n / 390) * 100 + "cqw";
  }

  return (
    <div
      className="relative w-full overflow-hidden border border-line [container-type:inline-size]"
      style={{
        aspectRatio: "390/844",
        backgroundImage: "url(" + SHOTS[time].phone + ")",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute" style={{ top: px(12), right: px(12) }}>
        <Corner chrome={chrome} px={px} />
      </div>
      <div
        className="absolute grid grid-cols-5"
        style={{ bottom: px(24), left: px(6), right: px(6) }}
      >
        {BAR.map(function (b) {
          return (
            <div key={b[0]} className="flex justify-center">
              <Art name={b[0]} way={world} size={px(50)} float />
            </div>
          );
        })}
      </div>
    </div>
  );
}

var WAYS = [
  {
    key: "turned",
    title: "Turned, in colour - the HUD's own in one colour",
    world: "turned",
    chrome: "mono",
    about:
      "What is done to the world drawn in colour, turned to show a front and a " +
      "side; the menu, the time and the money in one colour, tinted where it says " +
      "something.",
  },
  {
    key: "iso",
    title: "Isometric, in colour - the HUD's own in one colour",
    world: "iso",
    chrome: "mono",
    about:
      "The same, drawn on the world's own grid: of a piece with the city, a little " +
      "smaller in the square, being wider than tall.",
  },
  {
    key: "colour",
    title: "All in colour",
    world: "turned",
    chrome: "turned",
    about: "Every icon a sticker, the HUD's own as loud as the world's.",
  },
  {
    key: "mono",
    title: "All in one colour, drawn for it",
    world: "mono",
    chrome: "mono",
    about:
      "Every icon drawn for one colour: the calmest, and the least like a game.",
  },
];

export default function Directions() {
  return (
    <div className="min-h-screen text-xs">
      <Header page="directions" />
      <main className="mx-auto flex max-w-6xl flex-col gap-7 px-4 py-4">
        <section className="max-w-3xl">
          <h2 className="mb-1 text-[15px] font-bold">Icon directions</h2>
          <p className="mb-2 leading-normal text-muted">
            A few of the games&apos; icons drawn by hand, to decide on before
            the whole set is drawn: flat colour, a dark outline, the light from
            the top left. What is done to the world is drawn three ways - turned
            to show a front and a side, isometric on the world&apos;s own grid,
            and in one colour - and every one over the world by day and by
            night.
          </p>
          <p className="leading-normal text-muted">
            The one-colour icons are drawn for one colour, not the colour ones
            turned white: a strong shape, as few cuts as tell what it is, every
            cut as wide, and simpler where colour told the rest.
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            What is done to the world
          </h3>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {WORLD.map(function (item) {
              return <WorldSample key={item.name} item={item} />;
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">The HUD&apos;s own</h3>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(190px,1fr))]">
            {SIGNS.map(function (item) {
              return <SignSample key={item.name} item={item} />;
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            The HUD, each way
            <span className="ml-2 font-normal text-muted">
              its top and its bottom, a pixel for a pixel as the game draws
              them, by day and by night
            </span>
          </h3>
          <div className="flex flex-col gap-6">
            {WAYS.map(function (w) {
              return (
                <div key={w.key} className="flex flex-col gap-2">
                  <div>
                    <b className="text-[13px]">{w.title}</b>
                    <span className="ml-2 text-muted">{w.about}</span>
                  </div>
                  <Strips time="day" world={w.world} chrome={w.chrome} />
                  <Strips time="night" world={w.world} chrome={w.chrome} />
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            On a phone
            <span className="ml-2 font-normal text-muted">
              each way, by day and by night
            </span>
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {WAYS.map(function (w) {
              return (
                <div key={w.key} className="flex flex-col gap-2">
                  <Phone time="day" world={w.world} chrome={w.chrome} />
                  <Phone time="night" world={w.world} chrome={w.chrome} />
                  <span className="text-center text-muted">{w.title}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
