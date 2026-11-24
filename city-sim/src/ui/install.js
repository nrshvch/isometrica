/**
 * The game put on the home screen: store install says how here - "prompt",
 * "ios", "mac", or null.
 * See city-sim/.claude/skills/ui/offline-and-saves.md (Home screen).
 */
import { store } from "./store";

//the browser's beforeinstallprompt, till it is used - it asks once
var asked = null;

//opened from the home screen, as an app of its own
function standalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    navigator.standalone === true
  );
}

//how it is put there by hand, in this browser - if it is
function byHand() {
  var ua = navigator.userAgent,
    //an iPad says it is a Mac, but a Mac has no touch screen
    ios =
      /iPhone|iPad|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

  if (ios) return "ios";
  if (
    /Macintosh/.test(ua) &&
    /Version\/\d+.*Safari\//.test(ua) &&
    !/Chrome|Chromium|CriOS|Edg|Firefox|FxiOS|OPR/.test(ua)
  )
    return "mac";

  return null;
}

/**
 * Finds out how the game is put on the home screen here, and listens for
 * the browser to say it can do it itself, or that it has - from the start,
 * before the screens are up: the browser says so when it likes.
 */
export function watchInstall() {
  store.setState({ install: standalone() ? null : byHand() });

  window.addEventListener("beforeinstallprompt", function (e) {
    //the browser's own bar along the bottom kept away - the menu says it
    e.preventDefault();
    asked = e;
    store.setState({ install: "prompt" });
  });

  window.addEventListener("appinstalled", function () {
    asked = null;
    store.setState({ install: null });
  });
}

/**
 * Has the browser ask to put the game on the home screen ("prompt"). It
 * asks the once; if put away, it may well say again, another time, that it
 * can.
 *
 * @returns {Promise<boolean>} whether it was put there
 */
export function install() {
  var e = asked;

  if (e === null) return Promise.resolve(false);

  asked = null;
  store.setState({ install: null });

  return e
    .prompt()
    .then(function () {
      return e.userChoice;
    })
    .then(
      function (choice) {
        return choice.outcome === "accepted";
      },
      function () {
        return false;
      },
    );
}
