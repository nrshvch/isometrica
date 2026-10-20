/**
 * What goes over the top of the world, on cards: the game's logo, the
 * city's money - which opens the city screen and puts it away again - how
 * it is doing and back to it; the time, and the weather; the view from
 * above, and the menu: the sounds, the day and the night going by, a new
 * city. Under them, zooming in and out, and how close the camera is.
 *
 * On a phone the money and the time take the top, the city's name and the
 * buttons the line under it; on a desktop all of it goes along the top.
 */
import { useEffect, useRef, useState } from "react";
import { useMatch } from "react-router";
import Events from "events";
import Numeral from "numeral";
import WorldView from "isometrica/client/view";
import CameraControl from "isometrica/client/cameracontrol";
import ResourceCode from "isometrica/core/resourcecode";
import { Container, HudButton, Icon, cx } from "../kit";
import { store, useGame } from "../store";
import {
  getClient,
  goCity,
  goWorld,
  startFresh,
  worldScreen,
} from "../session";

function money(amount) {
  return "$" + Numeral(amount).format("0,0");
}

//what the HUD shows, as it reads now
function read(client) {
  var lighting = client.lighting,
    weather = lighting && lighting.weather,
    city = client.player.city(),
    camera = client.camera && client.camera.camera,
    turner = client.cameraControl && client.cameraControl.turner,
    //while the world turns, the zoom it turns at - the camera is zoomed out
    //meanwhile for pictures of it (isometrica client/turner) - as its step,
    //1x the furthest out to 5x the closest in (client/cameracontrol ZOOMS)
    zoom = camera
      ? turner && turner.active
        ? turner.zoom
        : camera.zoom
      : null,
    funds = city ? city.resources.getResources()[ResourceCode.money] || 0 : 0,
    net = city ? Math.round(city.getBudget().net) : 0;

  return {
    time: client.core.time.toHM(),
    //the weather when it says what it is (client/weather)
    weather: weather && weather.name ? weather.name : "",
    //whether the city is drawn at night, lit by its lamps (client/lighting)
    night: !!(lighting && lighting.night),
    money: city ? money(funds) : null,
    //and as short as a phone has room for: $134.1M
    shortMoney: city
      ? "$" + Numeral(funds).format("0.[0]a").toUpperCase()
      : null,
    //what comes in a tick, less what goes out
    net: (net < 0 ? "-" : "+") + money(Math.abs(net)),
    losing: net < 0,
    name: city ? city.name() : "",
    population: city
      ? Numeral(city.population.getPopulation()).format("0,0")
      : "",
    sounds: !!(client.sound && client.sound.wants.sounds),
    dayNight: !!(lighting && lighting.dayNight),
    top: WorldView.top(),
    zoom: zoom === null ? "" : CameraControl.zoomStep(zoom) + "x",
  };
}

function same(a, b) {
  for (var k in a) if (a[k] !== b[k]) return false;

  return true;
}

/**
 * What the HUD shows, read again whenever any of it may have changed: the
 * clock going on, the city changing, the sounds or the day and the night
 * switched, the view, the camera moving or zooming.
 */
function useWorld(client, hasCity) {
  var [now, setNow] = useState(function () {
    return read(client);
  });

  useEffect(
    function () {
      var live = true,
        time = client.core.time,
        city = client.player.city(),
        camera = client.camera && client.camera.camera,
        viewport = camera && camera.viewport,
        tokens = [];

      function update() {
        if (!live) return;

        var fresh = read(client);

        setNow(function (was) {
          return same(was, fresh) ? was : fresh;
        });
      }

      var ticked = Events.on(time, time.constructor.events.advance, update),
        viewed = Events.on(WorldView, WorldView.events.change, update);

      if (city) tokens = [city.rename().on(update), city.update().on(update)];

      //told for good - they have no way of being let go of
      if (client.sound) client.sound.onChange(update);
      if (client.lighting) client.lighting.onDayNight(update);
      if (camera) camera.addEventListener(camera.events.update, update);
      //and zoomed, which draws the world at another size (engine
      //CameraComponent setZoom)
      var resized = viewport
        ? Events.on(viewport, viewport.events.resize, update)
        : null;

      update();

      return function () {
        live = false;
        Events.off(time, time.constructor.events.advance, ticked);
        Events.off(WorldView, WorldView.events.change, viewed);
        if (city) {
          city.rename().off(tokens[0]);
          city.update().off(tokens[1]);
        }
        if (camera) camera.removeEventListener(camera.events.update, update);
        if (resized !== null)
          Events.off(viewport, viewport.events.resize, resized);
      };
    },
    [client, hasCity],
  );

  return now;
}

/**
 * The city's money - a click on it opens the city screen - and, given the
 * room, what comes in a tick and how many live there; and back to the city,
 * wherever the camera has got to.
 */
function Funds({ world, onMoney, onHome }) {
  return (
    <div className="card pointer-events-auto flex min-w-0 items-center gap-2.5 p-2">
      <button
        type="button"
        title="The city"
        onClick={onMoney}
        className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left"
      >
        <span className="tile tile-green">
          <Icon name="dollar" size={24} strokeWidth={2} />
        </span>
        <span className="flex min-w-0 flex-col gap-1 pr-1">
          <span className="label">Funds</span>
          <span className="figure truncate">
            <span className="sm:hidden">{world.shortMoney}</span>
            <span className="max-sm:hidden">{world.money}</span>
          </span>
        </span>
      </button>
      <span
        title="A tick"
        className={cx(
          "pill max-sm:hidden",
          world.losing ? "text-bad" : "text-good",
        )}
      >
        <Icon
          name={world.losing ? "trend-down" : "trend-up"}
          size={16}
          strokeWidth={2}
        />
        {world.net}
      </span>
      <span title="People" className="pill max-sm:hidden">
        <Icon name="people" size={16} strokeWidth={2} />
        {world.population}
      </span>
      <button
        type="button"
        title="Back to the city"
        aria-label="Back to the city"
        onClick={onHome}
        className="tile tile-home ml-auto cursor-pointer"
      >
        <Icon name="home" size={22} strokeWidth={1.75} />
      </button>
    </div>
  );
}

//the time, the weather it is in, and whether it is day or night
function Time({ world }) {
  return (
    <div className="card flex items-center gap-2 py-2 pr-3 pl-3.5">
      <div className="flex flex-col gap-1">
        <span className="label">{world.weather || "Time"}</span>
        <span className="figure">{world.time}</span>
      </div>
      <Icon
        name={world.night ? "moon" : "sun"}
        size={24}
        strokeWidth={1.75}
        className="text-gold"
      />
    </div>
  );
}

//the city's name, and how many live there - where the money has no room
function City({ world, className }) {
  return (
    <div className={cx("card pill bg-card px-3 py-2", className)}>
      <Icon name="people" size={16} strokeWidth={2} />
      <span className="truncate">{world.name}</span>
      <span className="font-semibold text-muted">· {world.population}</span>
    </div>
  );
}

//zooming in and out a step, and how close the camera is
function Zoom({ client, zoom }) {
  function step(dir) {
    if (client.cameraControl) client.cameraControl.zoomStep(dir);
  }

  return (
    <div className="card pointer-events-auto flex w-12 flex-col items-center">
      <button
        type="button"
        title="Closer"
        aria-label="Zoom in"
        onClick={function () {
          step(1);
        }}
        className="grid h-11 w-12 cursor-pointer place-items-center"
      >
        <Icon name="plus" size={22} strokeWidth={2} />
      </button>
      <span aria-live="polite" className="text-xs font-black tabular-nums">
        {zoom}
      </span>
      <button
        type="button"
        title="Further"
        aria-label="Zoom out"
        onClick={function () {
          step(-1);
        }}
        className="grid h-11 w-12 cursor-pointer place-items-center"
      >
        <Icon name="minus" size={22} strokeWidth={2} />
      </button>
    </div>
  );
}

//a line of the menu: what it does, its key, and whether it is on
function Row({ icon, label, on, shortcut, disabled, onClick }) {
  return (
    <button
      type="button"
      role={on === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="row disabled:cursor-default disabled:opacity-45"
    >
      <Icon name={icon} size={20} />
      <span className="whitespace-nowrap">{label}</span>
      {shortcut && (
        <kbd className="rounded-[2px] bg-inset px-1.5 font-sans text-[11px] text-muted">
          {shortcut}
        </kbd>
      )}
      {on === undefined ? (
        <Icon name="chevron-right" size={16} className="ml-auto text-muted" />
      ) : (
        <span className={cx("switch", on && "on")} />
      )}
    </button>
  );
}

/**
 * The menu behind the button in the top right corner: what is switched on
 * and off for the whole game, and a new city. Put away by a click anywhere
 * else, or Escape.
 */
function Menu({ client, world, busy }) {
  var [open, setOpen] = useState(false),
    box = useRef(null);

  useEffect(
    function () {
      if (!open) return;

      function away(e) {
        if (!box.current.contains(e.target)) setOpen(false);
      }

      function key(e) {
        if (e.key === "Escape") setOpen(false);
      }

      document.addEventListener("pointerdown", away, true);
      document.addEventListener("keydown", key);

      return function () {
        document.removeEventListener("pointerdown", away, true);
        document.removeEventListener("keydown", key);
      };
    },
    [open],
  );

  return (
    <div ref={box} className="pointer-events-auto relative">
      <HudButton
        icon={open ? "close" : "menu"}
        label="Menu"
        on={open}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={function () {
          setOpen(!open);
        }}
      />
      {open && (
        <div
          role="menu"
          className="card absolute top-full right-0 z-30 mt-2 w-64 overflow-hidden"
        >
          <Row
            icon={world.sounds ? "sound-on" : "sound-off"}
            label="Sounds"
            on={world.sounds}
            shortcut="S"
            onClick={function () {
              //from the click itself, so that a phone lets them play
              if (client.sound) client.sound.toggle("sounds");
            }}
          />
          <Row
            icon={world.night ? "moon" : "sun"}
            label="Day and night"
            on={world.dayNight}
            shortcut="N"
            onClick={function () {
              if (client.lighting) client.lighting.setDayNight();
            }}
          />
          <Row
            icon="found"
            label="Start a new city"
            //an action owns the world while it runs
            disabled={busy}
            onClick={function () {
              setOpen(false);
              startFresh();
            }}
          />
        </div>
      )}
    </div>
  );
}

export default function Hud() {
  var client = getClient(),
    hasCity = useGame(function (s) {
      return s.hasCity;
    }),
    busy = useGame(function (s) {
      return s.busy;
    }),
    prompt = useGame(function (s) {
      return s.prompt;
    }),
    world = useWorld(client, hasCity),
    onCity = useMatch("/:city/city/*") !== null,
    //the world itself, no screen up over it - the camera's to be zoomed
    onWorld = useMatch("/:city?") !== null && prompt === null,
    funds = hasCity && world.money !== null;

  //the game's screens, dark at night with the world (GameScreen)
  useEffect(
    function () {
      store.setState({ night: world.night });
    },
    [world.night],
  );

  function openCity() {
    //the money is what the city screen is mostly about - clicked again, it
    //puts it away
    if (onCity) goWorld();
    //an action owns the world while it runs - opening the city screen from
    //under it would leave the action with no buttons and no way to finish
    else if (!worldScreen().busy()) goCity();
  }

  function home() {
    //gliding there, rather than jumping
    if (client.cityman) client.cityman.locate(client.player.city(), true);
  }

  return (
    <Container className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 pt-2.5 [grid-template-areas:'funds_time'_'city_tools'_'._zoom'] sm:grid-cols-[auto_auto_1fr_auto_auto] sm:gap-3 sm:pt-4 sm:[grid-template-areas:'logo_funds_._time_tools'_'._._._._zoom']">
      <img
        src="/logo.png"
        alt="Peepsland"
        className="pixelated size-16 self-center drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)] [grid-area:logo] max-sm:hidden"
      />
      {funds && (
        <div className="min-w-0 [grid-area:funds]">
          <Funds world={world} onMoney={openCity} onHome={home} />
        </div>
      )}
      <div className="[grid-area:time]">
        <Time world={world} />
      </div>
      {funds && (
        <City
          world={world}
          className="justify-self-start [grid-area:city] sm:hidden"
        />
      )}
      <div className="flex gap-2 [grid-area:tools]">
        <HudButton
          icon="map"
          label="View from above (T)"
          on={world.top}
          onClick={function () {
            if (client.setTopView) client.setTopView(!WorldView.top());
          }}
        />
        <Menu client={client} world={world} busy={busy} />
      </div>
      {onWorld && (
        <div className="justify-self-end [grid-area:zoom]">
          <Zoom client={client} zoom={world.zoom} />
        </div>
      )}
    </Container>
  );
}
