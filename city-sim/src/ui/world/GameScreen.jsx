/**
 * The game: the world, drawn over the whole window, and over it what is
 * always there (Hud) and whatever the address says is up (router.jsx) - the world's own buttons, the
 * catalogue, the city screen - or a word asked for: by day on sky white
 * cards, by night on night blue ones (app.css .night). Starts the game on
 * the city in the address, and opens another if the address changes to it.
 */
import { useEffect, useState } from "react";
import { Outlet, useMatch, useParams } from "react-router";
import { LayeredLayout, cx } from "../kit";
import { useGame } from "../store";
import { reopen, start } from "../session";
import WorldCanvas from "./WorldCanvas";
import Hud from "./Hud";
import Prompt from "./Prompt";
import Splash from "./Splash";

//a city id in the address bar, as in /pA4b1cX9q2Rz - or one of the six
//character ones of before, /pA4b1c (core/persistence/citystore)
var CITY_ID = /^[0-9A-Za-z]{6}(?:[0-9A-Za-z]{6})?$/;

//how long the splash is up for, the game loading under it
var SPLASH_MS = 2000;

export default function GameScreen() {
  var city = useParams().city,
    asked = city && CITY_ID.test(city) ? city : null,
    phase = useGame(function (s) {
      return s.phase;
    }),
    cityId = useGame(function (s) {
      return s.cityId;
    }),
    prompt = useGame(function (s) {
      return s.prompt;
    }),
    night = useGame(function (s) {
      return s.night;
    }),
    onWorld = useMatch("/:city?") !== null,
    //a screen up over the world: the world dimmed behind it, and none of
    //it to be clicked
    covered = prompt !== null || !onWorld,
    [splash, setSplash] = useState(true);

  useEffect(function () {
    var up = setTimeout(function () {
      setSplash(false);
    }, SPLASH_MS);

    start(asked);

    return function () {
      clearTimeout(up);
    };
  }, []);

  //changing the id in the address bar asks for another city, and the world
  //is only ever put together once, on the way up - so the page goes up
  //again on the city that was asked for
  useEffect(
    function () {
      if (phase === "ready" && asked !== cityId) reopen(asked);
    },
    [asked],
  );

  return (
    <>
      <LayeredLayout
        className={cx(
          //as high as the window, not to be scrolled - a screen taller
          //than what is left of it scrolls what it holds (kit Screen)
          "pointer-events-none h-svh overflow-hidden select-none",
          night && "night",
        )}
        background={
          <div className="sticky top-0 h-svh">
            <WorldCanvas />
          </div>
        }
        wrapperProps={{
          className: cx(
            "flex flex-col transition-colors",
            covered && "pointer-events-auto bg-navy/45 backdrop-blur-sm",
          ),
        }}
      >
        {phase === "ready" && <Hud />}
        {/* the screens are of the city, and wait for it to be up */}
        {phase !== "ready" ? null : prompt ? (
          <Prompt prompt={prompt} />
        ) : (
          <Outlet />
        )}
      </LayeredLayout>
      {splash && <Splash />}
    </>
  );
}
