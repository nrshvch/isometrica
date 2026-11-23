/**
 * Lets the game open and play offline from the first time it was opened:
 * keeps one build whole (BUILT, written in by tools/precache.js), the page
 * and gfx/manifest.json network first, the rest by hash; never /api.
 * See city-sim/.claude/skills/ui/offline-and-saves.md.
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
