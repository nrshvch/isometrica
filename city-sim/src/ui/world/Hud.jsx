/**
 * What floats over the top of the world: the game's logo on the left; on
 * the right the time - and the weather - over the city's money, which opens
 * the city screen and puts it away again, and the menu: the sounds, the day
 * and the night going by, the view from above, back to the city. And, for
 * a moment while the camera zooms, how close it is.
 */
import { useEffect, useRef, useState } from "react";
import { useMatch } from "react-router";
import Events from "events";
import Numeral from "numeral";
import WorldView from "isometrica/client/view";
import CameraControl from "isometrica/client/cameracontrol";
import ResourceCode from "isometrica/core/resourcecode";
import { Container, Icon, cx } from "../kit";
import { useGame } from "../store";
import { getClient, goCity, goWorld, worldScreen } from "../session";

//how long how close the camera is stays up once it stops zooming
var ZOOM_SHOWN_MS = 900;

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
      : null;

  return {
    time: client.core.time.toHM(),
    //the weather when it says what it is (client/weather)
    weather: weather && weather.name ? weather.name : "",
    money: city
      ? "$" +
        Numeral(city.resources.getResources()[ResourceCode.money]).format("0,0")
      : null,
    sounds: !!(client.sound && client.sound.wants.sounds),
    dayNight: !!(lighting && lighting.dayNight),
    top: WorldView.top(),
    zoom: zoom === null ? "" : CameraControl.zoomStep(zoom) + "x",
    //and how close it is exactly, to tell it is zooming
    zoomedTo: zoom,
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
 * How close the camera is, while it zooms and a moment after: up as fingers
 * pinch (or ctrl and the wheel, the way a trackpad pinches) and whenever it
 * zooms otherwise - a double tap - and gone once it has stayed where it is
 * a while.
 */
function Zoom({ client, zoom, at }) {
  var [pinching, setPinching] = useState(false),
    [moved, setMoved] = useState(false),
    was = useRef(at);

  //the pinches, on the canvas the world is drawn on (engine Viewport)
  useEffect(
    function () {
      var viewport = client.camera && client.camera.camera.viewport;

      if (!viewport) return;

      var e = viewport.events,
        on = [
          Events.on(viewport, e.pinchstart, function () {
            setPinching(true);
          }),
          Events.on(viewport, e.pinchend, function () {
            setPinching(false);
            setMoved(true);
          }),
        ];

      return function () {
        Events.off(viewport, e.pinchstart, on[0]);
        Events.off(viewport, e.pinchend, on[1]);
      };
    },
    [client],
  );

  useEffect(
    function () {
      if (at !== was.current) {
        was.current = at;
        setMoved(true);
      }
    },
    [at],
  );

  //gone a while after the last of it
  useEffect(
    function () {
      if (!moved || pinching) return;

      var gone = setTimeout(function () {
        setMoved(false);
      }, ZOOM_SHOWN_MS);

      return function () {
        clearTimeout(gone);
      };
    },
    [moved, pinching, at],
  );

  return (
    <div
      aria-live="polite"
      className={cx(
        "text-float fixed top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 text-4xl font-bold tabular-nums transition-all duration-300",
        pinching || moved ? "scale-100 opacity-100" : "scale-90 opacity-0",
      )}
    >
      <Icon name="zoom" className="icon-float size-9" />
      {zoom}
    </div>
  );
}

//a switch, on or off
function Switch({ on }) {
  return (
    <span
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        on ? "bg-gold" : "bg-white/20",
      )}
    >
      <span
        className={cx(
          "absolute top-0.5 size-4 rounded-full bg-white shadow transition-all",
          on ? "left-[18px]" : "left-0.5",
        )}
      />
    </span>
  );
}

//a line of the menu: what it does, its key, and whether it is on
function Item({ icon, label, on, shortcut, onClick }) {
  return (
    <button
      type="button"
      role={on === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={on}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/8 focus-visible:bg-white/8 focus-visible:outline-none"
    >
      <Icon
        name={icon}
        className={cx("size-6", on ? "text-gold" : "text-white/85")}
      />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {shortcut && (
        <kbd className="rounded bg-white/8 px-1.5 font-sans text-xs text-muted">
          {shortcut}
        </kbd>
      )}
      {on !== undefined && <Switch on={on} />}
    </button>
  );
}

/**
 * The menu behind the button in the top right corner: what is switched on
 * and off for the whole game. Put away by a click anywhere else, or Escape.
 */
function Menu({ client, world, hasCity }) {
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
      <button
        type="button"
        title="Menu"
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={function () {
          setOpen(!open);
        }}
        className="group cursor-pointer p-1 focus-visible:outline-none"
      >
        <Icon
          name="menu"
          className={cx(
            "size-9 transition-transform group-hover:scale-110",
            open ? "icon-glow text-gold" : "icon-float text-white",
          )}
        />
      </button>
      {open && (
        <div
          role="menu"
          className="glass absolute top-full right-0 z-30 mt-2 w-72 p-1.5"
        >
          <Item
            icon={world.sounds ? "sound-on" : "sound-off"}
            label="Sounds"
            on={world.sounds}
            shortcut="S"
            onClick={function () {
              //from the click itself, so that a phone lets them play
              if (client.sound) client.sound.toggle("sounds");
            }}
          />
          <Item
            icon="day-night"
            label="Day and night"
            on={world.dayNight}
            shortcut="N"
            onClick={function () {
              if (client.lighting) client.lighting.setDayNight();
            }}
          />
          <Item
            icon="top-view"
            label="View from above"
            on={world.top}
            shortcut="T"
            onClick={function () {
              if (client.setTopView) client.setTopView(!WorldView.top());
            }}
          />
          {hasCity && (
            <>
              <div className="mx-3 my-1 h-px bg-line" />
              <Item
                icon="locate"
                label="Back to the city"
                onClick={function () {
                  setOpen(false);
                  //gliding there, rather than jumping
                  if (client.cityman)
                    client.cityman.locate(client.player.city(), true);
                }}
              />
            </>
          )}
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
    world = useWorld(client, hasCity),
    onCity = useMatch("/:city/city/*") !== null;

  function money() {
    //the money is what the city screen is mostly about - clicked again, it
    //puts it away
    if (onCity) goWorld();
    //an action owns the world while it runs - opening the city screen from
    //under it would leave the action with no buttons and no way to finish
    else if (!worldScreen().busy()) goCity();
  }

  return (
    <>
      <Container className="flex items-start justify-between gap-3 pt-3">
        <img
          src="/logo.png"
          alt="Peepsland"
          className="pixelated size-16 shrink-0 drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
        />
        <div className="flex items-start gap-3">
          <div className="text-float flex flex-col items-end pt-0.5 leading-tight font-semibold tabular-nums">
            <div className="flex items-center gap-1.5 text-[15px] whitespace-nowrap">
              {world.weather && (
                <span className="font-normal text-white/80 capitalize max-[400px]:hidden">
                  {world.weather}
                </span>
              )}
              <Icon name="clock" className="icon-float size-[18px]" />
              {world.time}
            </div>
            {hasCity && world.money !== null && (
              <button
                type="button"
                title="The city"
                onClick={money}
                className="pointer-events-auto mt-1 flex cursor-pointer items-center gap-1.5 text-lg whitespace-nowrap text-gold transition-transform hover:scale-105"
              >
                <Icon name="coin" className="icon-float size-6" />
                {world.money}
              </button>
            )}
          </div>
          <Menu client={client} world={world} hasCity={hasCity} />
        </div>
      </Container>
      <Zoom client={client} zoom={world.zoom} at={world.zoomedTo} />
    </>
  );
}
