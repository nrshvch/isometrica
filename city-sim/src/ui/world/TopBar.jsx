/**
 * The bar along the top, once there is a city: the time and the weather on
 * the left; on the right the money - which opens the city screen, and puts
 * it away again - the sounds, the day and the night going by, the view from
 * above, the zoom, and back to the city. Kept in sight as a screen scrolls
 * under it.
 */
import { useEffect, useState } from "react";
import { useMatch } from "react-router";
import Events from "events";
import Numeral from "numeral";
import WorldView from "isometrica/client/view";
import CameraControl from "isometrica/client/cameracontrol";
import ResourceCode from "isometrica/core/resourcecode";
import { cx } from "../kit";
import { getClient, goCity, goWorld, worldScreen } from "../session";

//what the bar shows, as it reads now
function read(client, city) {
  var lighting = client.lighting,
    weather = lighting && lighting.weather,
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
    //and the weather, after the time, when it says what it is (client/
    //weather)
    time:
      client.core.time.toHM() +
      (weather && weather.name ? "  " + weather.name : ""),
    money:
      "$" +
      Numeral(city.resources.getResources()[ResourceCode.money]).format("0,0"),
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
 * What the bar shows, read again whenever any of it may have changed: the
 * clock going on, the city changing, the sounds or the day and the night
 * switched, the view, the camera moving.
 */
function useBar(client, city) {
  var [bar, setBar] = useState(function () {
    return read(client, city);
  });

  useEffect(
    function () {
      var live = true,
        time = client.core.time,
        camera = client.camera && client.camera.camera;

      function update() {
        if (!live) return;

        var now = read(client, city);

        setBar(function (was) {
          return same(was, now) ? was : now;
        });
      }

      var ticked = Events.on(time, time.constructor.events.advance, update),
        renamed = city.rename().on(update),
        changed = city.update().on(update),
        viewed = Events.on(WorldView, WorldView.events.change, update);

      //told for good - they have no way of being let go of
      if (client.sound) client.sound.onChange(update);
      if (client.lighting) client.lighting.onDayNight(update);
      if (camera) camera.addEventListener(camera.events.update, update);

      update();

      return function () {
        live = false;
        Events.off(time, time.constructor.events.advance, ticked);
        city.rename().off(renamed);
        city.update().off(changed);
        Events.off(WorldView, WorldView.events.change, viewed);
        if (camera) camera.removeEventListener(camera.events.update, update);
      };
    },
    [client, city],
  );

  return bar;
}

function Item({ title, onClick, off, className, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cx(
        "pointer-events-auto cursor-pointer px-[0.4em] whitespace-nowrap",
        off && "opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export default function TopBar() {
  var client = getClient(),
    city = client.player.city(),
    bar = useBar(client, city),
    onCity = useMatch("/:city/city/*") !== null;

  return (
    <div className="ui-block ui-shadow outlined sticky top-0 z-10 flex h-6 items-center justify-between px-[1%] text-[14px] font-bold [font-variant:small-caps]">
      <div className="whitespace-nowrap">{bar.time}</div>
      <div className="flex items-center">
        <Item
          title="Back to the city"
          className="text-[18px] leading-none"
          onClick={function () {
            //gliding there, rather than jumping
            if (client.cityman) client.cityman.locate(city, true);
          }}
        >
          ⌖
        </Item>
        <Item title="Zoom" className="cursor-default">
          {bar.zoom}
        </Item>
        <Item
          title="Top-down view (T)"
          off={!bar.top}
          onClick={function () {
            if (client.setTopView) client.setTopView(!WorldView.top());
          }}
        >
          {"▦ top"}
        </Item>
        <Item
          title="Day and night going by (N)"
          off={!bar.dayNight}
          onClick={function () {
            if (client.lighting) client.lighting.setDayNight();
          }}
        >
          ☀☾<span className="max-[480px]:hidden"> day/night</span>
        </Item>
        <Item
          title="Sounds (S)"
          off={!bar.sounds}
          onClick={function () {
            //from the click itself, so that a phone lets them play
            if (client.sound) client.sound.toggle("sounds");
          }}
        >
          {bar.sounds ? "♫ on" : "♫ off"}
        </Item>
        <Item
          title="The city"
          onClick={function () {
            //the treasury is what the city screen is mostly about - clicked
            //again, it puts it away
            if (onCity) goWorld();
            //an action owns the world while it runs - opening the city
            //screen from under it would leave the action with no buttons
            //and no way to finish
            else if (!worldScreen().busy()) goCity();
          }}
        >
          {bar.money}
        </Item>
      </div>
    </div>
  );
}
