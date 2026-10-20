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
import { Container, Icon, IconButton, cx } from "../kit";
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
        "ui-float outlined fixed top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 px-4 py-2 text-[22px] font-bold transition-opacity duration-300",
        pinching || moved ? "opacity-100" : "opacity-0",
      )}
    >
      <Icon name="zoom" className="outlined-icon size-6" />
      {zoom}
    </div>
  );
}

//a line of the menu: what it does, whether it is on, and its key
function Item({ icon, label, on, shortcut, onClick }) {
  return (
    <button
      type="button"
      role={on === undefined ? "menuitem" : "menuitemcheckbox"}
      aria-checked={on}
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none"
    >
      <Icon name={icon} className="size-5" />
      <span className="flex-1 whitespace-nowrap">{label}</span>
      {on !== undefined && (
        <span
          className={cx(
            "rounded px-1.5 text-[9pt] font-bold uppercase",
            on ? "bg-ok text-white" : "bg-white/15 text-white/70",
          )}
        >
          {on ? "on" : "off"}
        </span>
      )}
      {shortcut && (
        <kbd className="w-4 text-center text-[9pt] text-white/50">
          {shortcut}
        </kbd>
      )}
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
      <IconButton
        icon="menu"
        title="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        on={open}
        className="size-11"
        onClick={function () {
          setOpen(!open);
        }}
      />
      {open && (
        <div
          role="menu"
          className="ui-float absolute top-full right-0 z-30 mt-2 w-64 overflow-hidden border border-block-dark py-1 text-[11pt] shadow-xl"
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
          className="pixelated size-16 shrink-0 drop-shadow-[2px_3px_0_rgba(0,0,0,0.35)]"
        />
        <div className="flex items-start gap-2">
          <div className="ui-float outlined flex flex-col items-end px-3 py-1.5 text-[14px] leading-snug font-bold">
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              {world.weather && (
                <span className="font-normal text-white/80 max-[400px]:hidden">
                  {world.weather}
                </span>
              )}
              <Icon name="clock" className="outlined-icon size-4" />
              {world.time}
            </div>
            {hasCity && world.money !== null && (
              <button
                type="button"
                title="The city"
                onClick={money}
                className="pointer-events-auto flex cursor-pointer items-center gap-1.5 whitespace-nowrap hover:text-block-light"
              >
                <Icon name="coin" className="outlined-icon size-4" />
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
