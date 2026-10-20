/**
 * A study of the games' HUD in the look of a city game's found on the web
 * (hud.css): every part on a card of its own, line icons in one colour -
 * Lucide's, and the game's own drawn as Lucide draws (icons.js) - colour
 * kept for what it means. Made up over the world on a phone and on a
 * desktop, by day and by night, with nothing going on and with a road
 * being laid; then its parts, and the icons it takes.
 */
import "@fontsource-variable/nunito";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  BrickWall,
  Check,
  ChevronRight,
  Clock,
  Dice5,
  DollarSign,
  Grip,
  House,
  HousePlus,
  LandPlot,
  Landmark,
  Map,
  Menu,
  Minus,
  Moon,
  Plus,
  RotateCw,
  Sun,
  TrendingUp,
  TriangleAlert,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { Header } from "../ui/kit.jsx";
import { Bulldozer, LandSale, Road } from "./icons.js";
import dayShot from "../directions/world.jpg";
import dayPhone from "../directions/world-phone.jpg";
import nightShot from "../directions/night.jpg";
import nightPhone from "../directions/night-phone.jpg";
import "./hud.css";

var SHOTS = {
  day: { wide: dayShot, phone: dayPhone },
  night: { wide: nightShot, phone: nightPhone },
};

/* --- the HUD's parts ---------------------------------------------------- */

//the city's money, and back to the city - with how it is doing, given room
function Funds({ wide }) {
  return (
    <div className="hud-card flex min-w-0 items-center gap-2.5 p-2">
      <span className="hud-tile green">
        <DollarSign size={24} strokeWidth={2.5} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5 pr-1">
        <span className="hud-label">Funds</span>
        <span className="hud-value">{wide ? "$134,124,641" : "$134.1M"}</span>
      </div>
      {wide && (
        <>
          <span className="hud-pill good">
            <TrendingUp size={15} strokeWidth={2.5} />
            +$1,240
          </span>
          <span className="hud-pill">
            <Users size={15} strokeWidth={2.5} />
            2,898
          </span>
        </>
      )}
      <span className="hud-tile home ml-auto">
        <House size={22} strokeWidth={2.25} />
      </span>
    </div>
  );
}

function Time({ night }) {
  var Now = night ? Moon : Sun;

  return (
    <div className="hud-card flex items-center gap-2 py-2 pr-3 pl-3.5">
      <div className="flex flex-col gap-0.5">
        <span className="hud-label">Time</span>
        <span className="hud-value">{night ? "23:10" : "14:20"}</span>
      </div>
      <Now size={24} strokeWidth={2.25} color="#e2ae3e" />
    </div>
  );
}

//the city, by name, and how many live in it
function City() {
  return (
    <div className="hud-card hud-pill rounded-full! px-3.5 py-2">
      <Users size={16} strokeWidth={2.5} />
      Miniville
      <span className="font-semibold text-[var(--muted)]">· 2,898</span>
    </div>
  );
}

function Button({ icon: I, on }) {
  return (
    <span className={"hud-card hud-button" + (on ? " on" : "")}>
      <I size={22} strokeWidth={2.25} />
    </span>
  );
}

function Zoom() {
  return (
    <div className="hud-card flex w-12 flex-col items-center">
      <span className="hud-button h-11">
        <Plus size={22} strokeWidth={2.5} />
      </span>
      <span className="text-[12px] font-black tabular-nums">3x</span>
      <span className="hud-button h-11">
        <Minus size={22} strokeWidth={2.5} />
      </span>
    </div>
  );
}

//the menu, open: the sounds, the day and the night going by, a new city
function MenuCard({ night }) {
  return (
    <div className="hud-card w-[240px] py-1">
      <div className="hud-row">
        <Volume2 size={20} strokeWidth={2.25} />
        Sounds
        <span className="hud-switch on" />
      </div>
      <div className="hud-row">
        {night ? (
          <Moon size={20} strokeWidth={2.25} />
        ) : (
          <Sun size={20} strokeWidth={2.25} />
        )}
        Day and night
        <span className="hud-switch on" />
      </div>
      <div className="hud-row">
        <LandPlot size={20} strokeWidth={2.25} />
        Start a new city
        <ChevronRight
          size={18}
          strokeWidth={2.5}
          className="ml-auto text-[var(--muted)]"
        />
      </div>
    </div>
  );
}

//what an action asks for and tells, over the bar
function Hint({ tone, icon: I, label, title, text }) {
  return (
    <div className="hud-card flex items-center gap-3 p-3">
      <span className={"hud-tile " + tone}>
        <I size={24} strokeWidth={2.25} />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="hud-label">{label}</span>
        <span className="hud-title">{title}</span>
        {text && <span className="hud-text">{text}</span>}
      </div>
    </div>
  );
}

function RoadHint() {
  return (
    <Hint
      tone="gold"
      icon={Road}
      label="Road · Asphalt"
      title="Drag to place, pull arrows to resize"
      text="12 tiles · $480"
    />
  );
}

//the bar along the bottom with nothing going on, and while a road is laid
var IDLE = [
  [Landmark, "City"],
  [HousePlus, "Build"],
  [Road, "Road"],
  [Bulldozer, "Terrain"],
  [LandSale, "Land"],
];

var ROAD = [
  [X, "Cancel"],
  [Road, "Asphalt", "on"],
  [Grip, "Gravel"],
  [BrickWall, "Cobbles"],
  [Check, "Done", "go"],
];

function Bar({ items }) {
  return (
    <div className="hud-card hud-tabs">
      {items.map(function (t) {
        var I = t[0];

        return (
          <div key={t[1]} className={"hud-tab " + (t[2] || "")}>
            <span className="well">
              <I size={22} strokeWidth={2} />
            </span>
            {t[1]}
            {t[3] && <span className="hud-badge">{t[3]}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* --- the HUD made up ---------------------------------------------------- */

/**
 * The HUD over the world on a phone, 390 by 844 as the game would draw it.
 *
 * @param time {string} "day" or "night", the world under it
 * @param dusk {boolean} on the night's dark cards
 * @param road {boolean} a road being laid - or else nothing going on
 * @param menu {boolean} the menu open
 */
function Phone({ time, dusk, road, menu }) {
  return (
    <div
      className={
        "hud relative h-[844px] w-[390px] shrink-0 overflow-hidden rounded-[28px] border border-line" +
        (dusk ? " dusk" : "")
      }
      style={{ backgroundImage: "url(" + SHOTS[time].phone + ")" }}
    >
      <div className="absolute inset-x-0 top-0 flex flex-col gap-2 p-2.5">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Funds />
          </div>
          <Time night={time === "night"} />
        </div>
        <div className="flex items-start justify-between">
          <City />
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <Button icon={Map} />
              <Button icon={menu ? X : Menu} on={menu} />
            </div>
            {menu ? <MenuCard night={time === "night"} /> : <Zoom />}
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-2.5 pb-5">
        {road && <RoadHint />}
        <Bar items={road ? ROAD : IDLE} />
      </div>
    </div>
  );
}

//the HUD over the world on a desktop, 1280 by 800, kept to a container
function Desktop({ time, dusk, road }) {
  return (
    <div
      className={
        "hud relative h-[800px] w-[1280px] shrink-0 overflow-hidden border border-line" +
        (dusk ? " dusk" : "")
      }
      style={{ backgroundImage: "url(" + SHOTS[time].wide + ")" }}
    >
      <div className="absolute inset-x-0 top-0 mx-auto flex max-w-[1100px] items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-16 place-items-center rounded-full border-2 border-dashed border-white/60 text-[12px] font-bold text-white/80">
            logo
          </span>
          <Funds wide />
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <Time night={time === "night"} />
            <Button icon={Map} />
            <Button icon={Menu} />
          </div>
          <Zoom />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-w-[560px] flex-col gap-2 p-4 pb-5">
        {road && <RoadHint />}
        <Bar items={road ? ROAD : IDLE} />
      </div>
    </div>
  );
}

function Caption({ children }) {
  return <div className="mt-1.5 text-center text-muted">{children}</div>;
}

/* --- the parts, and the icons ------------------------------------------- */

var PALETTE = [
  ["#fbf0d6", "cream", "the cards by day"],
  ["#f1e2bf", "cream, set in", "pills, wells, switches off"],
  ["#22312a", "dusk", "the cards by night"],
  ["#1f2a22", "ink", "words and icons"],
  ["#69705f", "muted", "what a thing is"],
  ["#3e7a55", "green", "money, go"],
  ["#1f3b2e", "deep green", "what is picked"],
  ["#e2ae3e", "gold", "what is on, the time of day"],
  ["#c2482f", "red", "what wants seeing to"],
];

function Parts({ dusk, time }) {
  return (
    <div
      className={
        "hud flex flex-col gap-3 border border-line p-4" + (dusk ? " dusk" : "")
      }
      style={{
        backgroundImage: "url(" + SHOTS[time].wide + ")",
        backgroundPosition: "30% 40%",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="hud-tile green">
          <DollarSign size={24} strokeWidth={2.5} />
        </span>
        <span className="hud-tile home">
          <House size={22} strokeWidth={2.25} />
        </span>
        <span className="hud-tile gold">
          <Road size={24} strokeWidth={2.25} />
        </span>
        <span className="hud-tile red">
          <TriangleAlert size={22} strokeWidth={2.25} />
        </span>
        <Button icon={Map} />
        <Button icon={Map} on />
        <div className="hud-card flex gap-2 p-2">
          <span className="hud-pill good">
            <TrendingUp size={15} strokeWidth={2.5} />
            +$1,240
          </span>
          <span className="hud-pill">
            <Clock size={15} strokeWidth={2.5} />
            12 days
          </span>
        </div>
      </div>
      <Bar
        items={[
          [Landmark, "City", "", "!"],
          [HousePlus, "Build", "on"],
          [Road, "Road"],
          [Bulldozer, "Terrain"],
          [LandSale, "Land", "", "3"],
        ]}
      />
      <Hint
        tone="red"
        icon={TriangleAlert}
        label="Can't build here"
        title="You cannot afford $480 for this!"
        text="Sell something, or wait for the taxes to come in."
      />
      <div className="flex items-start gap-3">
        <MenuCard night={time === "night"} />
        <div className="hud-card flex flex-col gap-1 p-3">
          <span className="hud-label">Label · 10 tracked</span>
          <span className="hud-value">$134,124,641</span>
          <span className="hud-title">Title, 16 black</span>
          <span className="hud-text">Text, 13 semibold</span>
        </div>
      </div>
    </div>
  );
}

//what the games show, and the icon that shows it
var ICONS = [
  ["City", Landmark, "lucide landmark"],
  ["Build", HousePlus, "lucide house-plus"],
  ["Road", Road, "ours"],
  ["Terrain, clear", Bulldozer, "ours"],
  ["Buy land", LandSale, "ours, after land-plot"],
  ["Found a city", LandPlot, "lucide land-plot"],
  ["Raise", ArrowUpToLine, "lucide arrow-up-to-line"],
  ["Lower", ArrowDownToLine, "lucide arrow-down-to-line"],
  ["Gravel", Grip, "lucide grip"],
  ["Cobbles", BrickWall, "lucide brick-wall"],
  ["Cancel", X, "lucide x"],
  ["Done", Check, "lucide check"],
  ["Turn", RotateCw, "lucide rotate-cw"],
  ["Another", Dice5, "lucide dice-5"],
  ["Money", DollarSign, "lucide dollar-sign"],
  ["People", Users, "lucide users"],
  ["Back to the city", House, "lucide house"],
  ["Time", Clock, "lucide clock"],
  ["Day", Sun, "lucide sun"],
  ["Night", Moon, "lucide moon"],
  ["View from above", Map, "lucide map"],
  ["Menu", Menu, "lucide menu"],
  ["Sounds", Volume2, "lucide volume-2"],
  ["Zoom", Plus, "lucide plus, minus"],
];

function IconCard({ name, icon: I, from }) {
  return (
    <div className="flex items-center gap-3 border border-line bg-panel p-2">
      <span className="hud grid size-14 shrink-0 place-items-center bg-[#fbf0d6] text-[#1f2a22]">
        <I size={32} strokeWidth={2} />
      </span>
      <span className="hud dusk grid size-10 shrink-0 place-items-center bg-[#22312a] text-[#f3e7cb]">
        <I size={22} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-col">
        <b>{name}</b>
        <span
          className={from.indexOf("ours") === 0 ? "text-accent" : "text-muted"}
        >
          {from}
        </span>
      </span>
    </div>
  );
}

export default function Hud() {
  return (
    <div className="min-h-screen text-xs">
      <Header page="hud" />
      <main className="mx-auto flex max-w-[1660px] flex-col gap-7 px-4 py-4">
        <section className="max-w-3xl">
          <h2 className="mb-1 text-[15px] font-bold">HUD study</h2>
          <p className="mb-2 leading-normal text-muted">
            The games&apos; HUD made up in the look of a city game&apos;s found
            on the web. What makes it work:
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5 leading-normal text-muted">
            <li>
              Every part on a card of its own - it reads over any part of the
              world, busy or quiet, light or dark, with no outlines or glows.
            </li>
            <li>
              So the icons can be plain lines in one colour - Lucide&apos;s,
              with the few the games need and Lucide has not drawn the way it
              draws them.
            </li>
            <li>
              Colour only for what it means: green for money and going ahead,
              gold for what is on, red for what wants seeing to - on a square
              tile where it matters.
            </li>
            <li>
              Small tracked capitals to say what a thing is, big black figures
              for how much: read at a glance.
            </li>
            <li>
              Grouped by what it is for: how the city stands along the top, the
              camera down the right, what to do along the bottom - where a thumb
              is.
            </li>
            <li>
              Soft and solid: round corners, a lip along the bottom, a shadow
              under.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            On a phone
            <span className="ml-2 font-normal text-muted">
              390 by 844, a pixel for a pixel
            </span>
          </h3>
          <div className="flex flex-wrap gap-4">
            <div>
              <Phone time="day" />
              <Caption>By day, nothing going on</Caption>
            </div>
            <div>
              <Phone time="day" road />
              <Caption>By day, laying a road</Caption>
            </div>
            <div>
              <Phone time="night" menu />
              <Caption>By night, cream - the menu open</Caption>
            </div>
            <div>
              <Phone time="night" dusk road />
              <Caption>By night, dusk - laying a road</Caption>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            On a desktop
            <span className="ml-2 font-normal text-muted">
              1280 by 800, the HUD kept to a container
            </span>
          </h3>
          <div className="flex flex-col gap-4">
            <div>
              <Desktop time="day" />
              <Caption>By day, nothing going on</Caption>
            </div>
            <div>
              <Desktop time="night" dusk road />
              <Caption>By night, dusk - laying a road</Caption>
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">Its parts</h3>
          <div className="mb-3 flex flex-wrap gap-2">
            {PALETTE.map(function (c) {
              return (
                <div
                  key={c[1]}
                  className="flex w-40 items-center gap-2 border border-line bg-panel p-1.5"
                >
                  <span
                    className="size-8 shrink-0 border border-line"
                    style={{ background: c[0] }}
                  />
                  <span className="flex min-w-0 flex-col leading-tight">
                    <b>{c[1]}</b>
                    <span className="text-muted">{c[2]}</span>
                    <span className="text-dim">{c[0]}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Parts time="day" />
            <Parts time="night" dusk />
          </div>
        </section>

        <section>
          <h3 className="mb-2 font-bold text-accent">
            The icons it takes
            <span className="ml-2 font-normal text-muted">
              lines 2 wide on a 24 grid - Lucide&apos;s, and ours drawn as
              Lucide draws
            </span>
          </h3>
          <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {ICONS.map(function (i) {
              return (
                <IconCard key={i[0]} name={i[0]} icon={i[1]} from={i[2]} />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
