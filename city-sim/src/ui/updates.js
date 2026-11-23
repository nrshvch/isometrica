/**
 * The game's new releases, found and taken up: the Service Worker
 * (public/sw.js) put in, and looked for again - whenever the game is back
 * in sight, if it has not looked for a while, and every hour it stays in
 * sight - for a page can stay open for days. One found is put in by the
 * browser beside the one at work, keeping the whole of its release, and
 * then waits to be told to take over (updates.js asks it which release it
 * is):
 *
 * - of this page's release - opened from the network, while the one before
 *   was still at work - straight away, nothing said
 * - another, newer: store update is set, for the world to say so
 *   (world/UpdateReady) - till the player reloads the page on it, or puts
 *   it away for now
 *
 * And one that takes over from somewhere else - another window of the game,
 * opened on a newer release - leaves this page on what it no longer keeps:
 * that is said too.
 */
import { store } from "./store";

//every how often the game looks for a new release while it is in sight
var EVERY_MS = 60 * 60 * 1000,
  //coming back in sight, it looks if it has not for this long
  AGAIN_MS = 10 * 60 * 1000,
  //how long a Service Worker has to say which release it is
  ASK_MS = 3000,
  //how long the page waits, reloading on a new release, for it to take over
  //before reloading anyway
  TAKE_OVER_MS = 3000;

var registration = null,
  lastLooked = 0,
  //the Service Worker of the release the player put away for now
  putAway = null,
  //reloading the page on a new release, once it has taken over
  reloading = false;

//which release a Service Worker is of - null, if it does not say
function ask(worker) {
  return new Promise(function (resolve) {
    var channel = new MessageChannel(),
      late = setTimeout(function () {
        resolve(null);
      }, ASK_MS);

    channel.port1.onmessage = function (e) {
      clearTimeout(late);
      resolve(e.data);
    };
    worker.postMessage({ type: "version" }, [channel.port2]);
  });
}

//a Service Worker put in, waiting to take over: this page's own does
//straight away; another is said to be there
function waiting(worker) {
  //another one being put in after it - that one, once it is in
  if (registration.installing) return;

  ask(worker).then(function (version) {
    if (registration.waiting !== worker) return;

    if (version === __VERSION__) worker.postMessage({ type: "take-over" });
    else if (worker !== putAway) store.setState({ update: true });
  });
}

function installing(worker) {
  worker.addEventListener("statechange", function () {
    if (worker.state === "installed" && registration.waiting === worker)
      waiting(worker);
  });
}

//the browser asked to look for a new release - and the one waiting, if
//there is one, looked at again
function look() {
  lastLooked = Date.now();
  registration.update().then(
    function () {
      if (registration.waiting) waiting(registration.waiting);
    },
    function () {
      //offline: it looks again later
    },
  );
}

/**
 * Puts the Service Worker in, and from then on looks for new releases.
 */
export function watchUpdates() {
  if (!("serviceWorker" in navigator)) return;

  var sw = navigator.serviceWorker;

  sw.register("/sw.js").then(
    function (r) {
      registration = r;
      lastLooked = Date.now();

      if (r.waiting) waiting(r.waiting);
      if (r.installing) installing(r.installing);
      r.addEventListener("updatefound", function () {
        if (r.installing) installing(r.installing);
      });

      document.addEventListener("visibilitychange", function () {
        if (
          document.visibilityState === "visible" &&
          Date.now() - lastLooked > AGAIN_MS
        )
          look();
      });
      setInterval(function () {
        if (document.visibilityState === "visible") look();
      }, EVERY_MS);
    },
    function (e) {
      console.warn("The game will not open offline", e);
    },
  );

  sw.addEventListener("controllerchange", function () {
    if (reloading) {
      location.reload();
      return;
    }

    //taken over for this page's release, or from another window for a
    //newer one - this page left on what is no longer kept for it
    if (sw.controller)
      ask(sw.controller).then(function (version) {
        store.setState({ update: version !== __VERSION__ });
      });
  });
}

/**
 * The page reloaded on the new release: it takes over, then the page is
 * opened again - on what it keeps, if offline.
 */
export function reloadForUpdate() {
  var worker = registration && registration.waiting;

  if (!worker) {
    location.reload();
    return;
  }

  reloading = true;
  worker.postMessage({ type: "take-over" });
  setTimeout(function () {
    location.reload();
  }, TAKE_OVER_MS);
}

/**
 * Not now: the new release is said again only once there is a newer one,
 * or when the game is opened again - on it, then.
 */
export function putUpdateAway() {
  putAway = registration && registration.waiting;
  store.setState({ update: false });
}
