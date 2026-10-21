/**
 * What the game opens on, over it while it comes up: its name with its
 * maker's over it, the way the games of the nineties had them - Sid Meier's
 * Civilization, Chris Sawyer's Transport Tycoon - on the night's blue,
 * lighter in the middle - a circle as wide as the window is high, whatever
 * its shape - how far along it is under them, and along the bottom which
 * release it is, or "dev" and the commit (vite.config.js).
 *
 * Up till the world is drawn as it should be: the pictures of what is on
 * screen - the side the camera looks from, not the others, painted ahead
 * meanwhile - all painted and on the pages (isometrica client/spritecache
 * progress). Then it fades away, the game there under it.
 */
import { useEffect, useState } from "react";
import { cx } from "../kit";
import { useGame } from "../store";
import { getClient } from "../session";

//how much of the bar the game coming up takes - its code, the list of its
//pictures, the city opened - before the pictures are painted; and how much
//it shows before that is done
var LOADED = 0.1,
  LOADING = 0.04;
//how many frames the world must have been drawn, and for how many in a row
//all of it must have been there, before it is taken as drawn - not for
//longer: the cars coming on screen as they drive ask for pictures of their
//own all the while - and how long it is waited for at most, ms
var FRAMES = 3,
  SETTLED = 2,
  MOST_MS = 30000;
//how long it takes to fade away, ms - as its className has it
var FADE_MS = 500;

/**
 * How far the pictures of what is on screen are along, 0 to 1, from when the
 * world is up - and whether it is drawn as it should be.
 */
function usePainting(ready) {
  var [state, setState] = useState({ share: 0, drawn: false });

  useEffect(
    function () {
      if (!ready) return;

      var client = getClient(),
        time = client.game.time,
        //what was painted before the world went up is not what it waits for
        from = client.sprites.progress().painted,
        frame = time.frame,
        start = performance.now(),
        //the frame all of it was there from
        since = null,
        share = 0,
        raf;

      function look() {
        var p = client.sprites.progress(),
          done = p.painted - from,
          t = performance.now();

        //what is wanted grows as more of the world comes in: the bar never
        //goes back
        if (done + p.waiting > 0)
          share = Math.max(share, done / (done + p.waiting));

        if (time.frame - frame >= FRAMES && p.shown) {
          if (since === null) since = time.frame;
        } else since = null;

        if (
          (since !== null && time.frame - since >= SETTLED) ||
          t - start >= MOST_MS
        ) {
          setState({ share: 1, drawn: true });
          return;
        }

        setState(function (was) {
          return was.share === share ? was : { share: share, drawn: false };
        });
        raf = requestAnimationFrame(look);
      }

      raf = requestAnimationFrame(look);

      return function () {
        cancelAnimationFrame(raf);
      };
    },
    [ready],
  );

  return state;
}

/**
 * @param onGone {function} once it has faded away
 */
export default function Splash({ onGone }) {
  var ready = useGame(function (s) {
      return s.phase === "ready";
    }),
    painting = usePainting(ready),
    shown = ready ? LOADED + (1 - LOADED) * painting.share : LOADING;

  useEffect(
    function () {
      if (!painting.drawn) return;

      var gone = setTimeout(onGone, FADE_MS);

      return function () {
        clearTimeout(gone);
      };
    },
    [painting.drawn],
  );

  return (
    <div
      className={cx(
        "fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_60svh_at_center,#363b6c_0%,#1b2340_100%)] text-center text-paper transition-opacity duration-500",
        painting.drawn && "pointer-events-none opacity-0",
      )}
    >
      <div className="flex flex-col items-center">
        <h1 className="flex flex-col items-center">
          <span className="text-sm font-bold text-[#a9aed6]">
            Denis Narushevich&apos;s
          </span>
          <span className="mt-1 font-title text-6xl leading-none font-bold tracking-tight sm:text-7xl">
            Peepsland
          </span>
        </h1>
        <div
          role="progressbar"
          aria-label="Painting the city"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(shown * 100)}
          className="mt-8 h-1.5 w-56 overflow-hidden rounded-[2px] bg-white/12"
        >
          <div
            className="h-full bg-gold transition-[width] duration-200"
            style={{ width: shown * 100 + "%" }}
          />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs font-bold text-[#a9aed6]">
        {__VERSION__}
      </div>
    </div>
  );
}
