/**
 * The icon directions, to be decided on before the whole set is drawn: the
 * samples (art.js) in colour and in one colour, side by side, and the
 * game's HUD made up over the world each way - all in colour, all in one
 * colour, and the world's in colour with the rest in one.
 */
import { useId } from "react";
import { Header, cx } from "../ui/kit.jsx";
import { SIGNS, WORLD } from "./art.js";
import { render } from "./render.js";
import worldShot from "./world.jpg";
import phoneShot from "./world-phone.jpg";

var INK = "#0b1220";

//what floats over the world: in colour, a shadow under its own outline; in
//one colour, white outlined in ink - and lit gold, while on
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

//one sample, as big as asked, in colour or not, and floating or not
function Art({ name, mono, size, float, colour }) {
  var id = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <span
      className="inline-block shrink-0 [&>svg]:block [&>svg]:size-full"
      style={{
        width: size,
        height: size,
        color: colour || (mono ? "#ffffff" : undefined),
        filter: float ? FLOAT[mono ? "mono" : "colour"] : undefined,
      }}
      dangerouslySetInnerHTML={{ __html: render(find(name).art, mono, id) }}
    />
  );
}

function Sample({ item }) {
  return (
    <div className="flex flex-col gap-2 border border-line bg-panel p-2">
      <div className="flex gap-2">
        <div className="bg-white p-1">
          <Art name={item.name} size={88} />
        </div>
        <div className="bg-white p-1">
          <Art name={item.name} mono size={88} colour="#1e2235" />
        </div>
      </div>
      <div
        className="flex items-center justify-around py-2"
        style={{
          backgroundImage: "url(" + worldShot + ")",
          backgroundSize: "900px",
          backgroundPosition: "40% 55%",
        }}
      >
        <Art name={item.name} size={44} float />
        <Art name={item.name} mono size={44} float />
      </div>
      <div className="text-center text-muted">{item.label}</div>
    </div>
  );
}

//the buttons along the bottom with nothing going on, and the HUD's own
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
  textTransform: "uppercase",
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

/**
 * The HUD made up over a picture of the world on a phone, w pixels wide as
 * the game would be, shown as wide as it is given: world tells whether the
 * world's buttons are in colour, chrome whether the HUD's own are.
 */
function Mock({ shot, w, h, world, chrome }) {
  //a size on the game's screen, as a share of the made-up one's width
  function px(n) {
    return (n / w) * 100 + "cqw";
  }

  return (
    <div
      className="relative w-full overflow-hidden border border-line [container-type:inline-size]"
      style={{
        aspectRatio: w + "/" + h,
        backgroundImage: "url(" + shot + ")",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute" style={{ top: px(12), right: px(12) }}>
        <Corner chrome={chrome} px={px} />
      </div>

      <div
        className="absolute grid grid-cols-5"
        style={{
          bottom: px(24),
          left: px(6),
          right: px(6),
        }}
      >
        {BAR.map(function (b) {
          return (
            <div
              key={b[0]}
              className="flex flex-col items-center"
              style={{ gap: px(3) }}
            >
              <Art name={b[0]} mono={!world} size={px(50)} float />
            </div>
          );
        })}
      </div>
    </div>
  );
}

//the time and the money, and the menu, as the HUD has them in its top
//right corner - at the game's own size
function Corner({ chrome, px }) {
  return (
    <div className="flex items-start" style={{ gap: px(10) }}>
      <div
        className="flex flex-col items-end"
        style={{ ...LABEL, textTransform: "none", gap: px(4) }}
      >
        <div
          className="flex items-center"
          style={{ gap: px(6), fontSize: px(15) }}
        >
          <Art name="clock" mono={!chrome} size={px(18)} float />
          23:10
        </div>
        <div
          className="flex items-center"
          style={{ gap: px(6), fontSize: px(18), color: "#ffc94a" }}
        >
          <Art
            name="coin"
            mono={!chrome}
            size={px(24)}
            float
            colour={chrome ? undefined : "#ffc94a"}
          />
          $134,124,641
        </div>
      </div>
      <Art name="menu" mono={!chrome} size={px(38)} float />
    </div>
  );
}

function real(n) {
  return n + "px";
}

/**
 * The top and the bottom of the HUD over the world, every pixel as the
 * game would draw it.
 */
function Strips({ world, chrome }) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="flex h-[76px] items-start justify-between border border-line px-4 pt-3"
        style={{
          backgroundImage: "url(" + worldShot + ")",
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
          backgroundImage: "url(" + worldShot + ")",
          backgroundSize: "1280px",
          backgroundPosition: "50% 100%",
        }}
      >
        <div className="grid w-full max-w-2xl grid-cols-5">
          {BAR.map(function (b) {
            return (
              <div key={b[0]} className="flex flex-col items-center gap-1">
                <Art name={b[0]} mono={!world} size={56} float />
                <span style={{ ...LABEL, fontSize: 11 }}>{b[1]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

var WAYS = [
  {
    key: "colour",
    title: "All in colour",
    world: true,
    chrome: true,
    about:
      "Every icon a sticker: the most game-like, and the busiest - the HUD's own " +
      "buttons as loud as the world's.",
  },
  {
    key: "mono",
    title: "All in one colour",
    world: false,
    chrome: false,
    about:
      "Every icon white, outlined in ink, gold while on: the calmest, and the " +
      "least like a game - the world's buttons lose most of what tells them apart.",
  },
  {
    key: "hybrid",
    title: "World in colour, the rest in one",
    world: true,
    chrome: false,
    about:
      "What is done to the world - building, roads, land, the ground - in colour; " +
      "the HUD's own - menu, time, money, sound, close - in one colour, tinted " +
      "where it says something (the money's gold).",
  },
];

export default function Directions() {
  return (
    <div className="min-h-screen text-xs">
      <Header page="directions" />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-4">
        <section>
          <h2 className="mb-1 text-[15px] font-bold">Icon directions</h2>
          <p className="max-w-3xl leading-normal text-muted">
            A few of the games&apos; icons drawn by hand in the direction picked
            - flat colour, a dark outline, the light from the top left, seen
            from a little above - and rendered both ways from the same drawing:
            in colour, and in one colour (any colour, by CSS), its pieces cut
            apart where they meet. Decide here, before the whole set is drawn.
          </p>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            The HUD, each way
            <span className="ml-2 font-normal text-muted">
              its top and its bottom, a pixel for a pixel as the game draws them
            </span>
          </h3>
          <div className="flex flex-col gap-5">
            {WAYS.map(function (w) {
              return (
                <div key={w.key} className="flex flex-col gap-2">
                  <div>
                    <b className="text-[13px]">{w.title}</b>
                    <span className="ml-2 text-muted">{w.about}</span>
                  </div>
                  <Strips world={w.world} chrome={w.chrome} />
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            On a phone
            <span className="ml-2 font-normal text-muted">
              each way, left to right
            </span>
          </h3>
          <div className="flex flex-wrap gap-4">
            {WAYS.map(function (w) {
              return (
                <div key={w.key} className="flex w-[340px] flex-col gap-1">
                  <Mock
                    shot={phoneShot}
                    w={390}
                    h={844}
                    world={w.world}
                    chrome={w.chrome}
                  />
                  <span className="text-center text-muted">{w.title}</span>
                </div>
              );
            })}
          </div>
        </section>

        {[
          ["What is done to the world", WORLD],
          ["The HUD's own", SIGNS],
        ].map(function (group) {
          return (
            <section key={group[0]}>
              <h3 className="mb-2 font-bold text-accent">
                {group[0]}
                <span className="ml-2 font-normal text-muted">
                  in colour and in one colour, then over the world at the size
                  the HUD shows them
                </span>
              </h3>
              <div
                className={cx(
                  "grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]",
                )}
              >
                {group[1].map(function (item) {
                  return <Sample key={item.name} item={item} />;
                })}
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
