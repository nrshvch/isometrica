/**
 * Lets the game open without a connection: everything of it fetched while
 * online is kept, and served from there when the network does not answer.
 * Online the network always goes first, so a new release is never held back
 * by what was kept of the one before.
 *
 * Registered as sw.js?v=<version> (src/main.js): every release is a Service
 * Worker of its own, which throws away what the one before it kept. The saves
 * (/api) are never kept - they are the browser's own (localStorage) and the
 * server's.
 */
var CACHE = "city-sim " + (new URL(self.location).searchParams.get("v") || "");

self.addEventListener("install", function () {
  self.skipWaiting();
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

self.addEventListener("fetch", function (event) {
  var request = event.request,
    url = new URL(request.url);

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;

  event.respondWith(
    fetch(request).then(
      function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      },
      function (error) {
        //the page itself is kept as / - whatever city the address names
        return caches
          .match(request, { ignoreSearch: request.mode === "navigate" })
          .then(function (kept) {
            if (kept) return kept;
            if (request.mode === "navigate") return caches.match("/");
            throw error;
          });
      },
    ),
  );
});
