/**
 * Lets the game open, and play, without a connection - from the first time
 * it was opened with one: as it is put in, it keeps everything the game is
 * (BUILT: the page, its scripts, styles, fonts and icons, and isometrica's
 * pictures - written in by tools/precache.js as the game is built), all of
 * one build, and serves the game from there:
 *
 * - the page: from the network, so that a new release is never held back by
 *   what was kept of the one before - and when the network does not answer,
 *   the page kept, whatever address it is opened at (a city, a screen of it:
 *   all the same page), at / as a home screen opens it
 * - gfx/manifest.json the same, for it says which pictures the page is to
 *   ask for - the page's own, online, the kept page's offline
 * - everything else as it was kept, else from the network: the scripts and
 *   the pictures are asked for by their hash, so what is kept of them is
 *   never other than what is asked for
 *
 * What the network brings is never kept: what was kept is all of one build,
 * the page and what it asks for, and stays so.
 *
 * Every release is a Service Worker of its own - this file, written again
 * with another build in it - which the browser puts in beside the one at
 * work, as it finds it: as the page is opened, and as the page asks it to
 * look (src/ui/updates.js). Put in, it waits for the page to tell it to take
 * over - straight away, for a page of its own release, else once the player
 * says so - or for every page of the one before to be closed: what the one
 * at work kept is of the pages it serves, and they go on asking for it. It
 * throws that away as it takes over. The saves (/api) are never kept - they
 * are the browser's own (localStorage) and the server's.
 */

//{version, entry, files}: the version of the game built, the script the
//page starts with, and every file to keep, by its address - written in by
//tools/precache.js; null where the game was not built (npm run dev, which
//never registers this)
var BUILT = null;

var CACHE = "city-sim " + (BUILT === null ? "" : BUILT.version);

var PAGE = "/",
  GFX_MANIFEST = "/gfx/manifest.json";

/**
 * Keeps every file of the build, fetched afresh - all of them, or none: one
 * that does not come, and this Service Worker is not put in, the one before
 * it goes on, and the next time the page looks it is tried again. So is a
 * page that is not of these files - another release put up meanwhile.
 */
function keep() {
  if (BUILT === null) return Promise.resolve();

  return caches.open(CACHE).then(function (cache) {
    return Promise.all(
      BUILT.files.map(function (url) {
        return fetch(url, { cache: "no-cache" })
          .then(function (response) {
            if (!response.ok) throw new Error(url + ": " + response.status);

            return url === PAGE ? samePage(response) : response;
          })
          .then(function (response) {
            return cache.put(url, response);
          });
      }),
    );
  });
}

//the page, if it starts the game with the script these files are of
function samePage(response) {
  return response
    .clone()
    .text()
    .then(function (html) {
      if (html.indexOf(BUILT.entry) === -1)
        throw new Error("the page is of another build than " + BUILT.entry);

      return response;
    });
}

function kept(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request, { ignoreVary: true });
  });
}

//from the network, else as it was kept - else as the network failed
function networkFirst(request, fallback) {
  return fetch(request).catch(function (error) {
    return kept(fallback || request).then(function (response) {
      if (response) return response;
      throw error;
    });
  });
}

self.addEventListener("install", function (event) {
  event.waitUntil(keep());
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

//what the page says (src/ui/updates.js): "version" - which release this
//is, answered on the port it came with; "take-over" - now
self.addEventListener("message", function (event) {
  var data = event.data || {};

  if (data.type === "version" && event.ports[0])
    event.ports[0].postMessage(BUILT === null ? null : BUILT.version);
  else if (data.type === "take-over") self.skipWaiting();
});

self.addEventListener("fetch", function (event) {
  var request = event.request,
    url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;

  if (request.mode === "navigate")
    event.respondWith(networkFirst(request, PAGE));
  else if (url.pathname === GFX_MANIFEST)
    event.respondWith(networkFirst(request));
  else
    event.respondWith(
      kept(request).then(function (response) {
        return response || fetch(request);
      }),
    );
});
