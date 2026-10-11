import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = function (p) {
  return path.resolve(__dirname, "src", p);
};

//every page there is: a game each (src/games), and the lighting bench at
///lab/lighting.html (src/lab/lighting.js)
var PAGES = {
  builder: app("index.html"),
  delivery: app("delivery.html"),
  lighting: app("lab/lighting.html"),
};

//the games there are, by name - each a page of its own (src/games)
var GAMES = ["builder", "delivery"];

/**
 * A game built alone is the whole site: its page is put out as index.html.
 */
function asIndex(game) {
  return {
    name: "game-as-index",
    enforce: "post",
    generateBundle: function (options, bundle) {
      var page = path.basename(PAGES[game]);

      if (page === "index.html" || bundle[page] === undefined) return;

      bundle[page].fileName = "index.html";
    },
  };
}

// These mirror the old src/js/config.js requirejs `paths`/`map` entries:
// short ids for the src's own layers. engine, events, namespace and
// reactive-property are the vendor/ packages, installed as file: dependencies
// and imported straight from their built dists (`npm run build:vendor`).
//`vite build --mode delivery` (npm run build:delivery) builds that game
//alone, into dist-delivery/ with its page as the site's index.html - nothing
//of any other game in it. Any other mode builds every page into dist/
export default defineConfig(function (env) {
  var GAME = GAMES.indexOf(env.mode) >= 0 ? env.mode : null;

  return {
    root: "src",
    build: {
      outDir: GAME === null ? "../dist" : "../dist-" + GAME,
      emptyOutDir: true,
      rollupOptions: {
        input:
          GAME === null
            ? PAGES
            : (function () {
                var one = {};

                one[GAME] = PAGES[GAME];
                return one;
              })(),
      },
    },
    plugins: GAME === null ? [] : [asIndex(GAME)],
    resolve: {
      alias: [
        { find: /^core\//, replacement: app("core") + "/" },
        { find: /^data\//, replacement: app("data") + "/" },
        { find: /^client\//, replacement: app("client/js") + "/" },
        { find: /^ui\//, replacement: app("ui") + "/" },
        { find: /^shared\//, replacement: app("shared") + "/" },
        { find: /^games\//, replacement: app("games") + "/" },
      ],
    },
  };
});
