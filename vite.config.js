import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = function (p) {
  return path.resolve(__dirname, "src", p);
};

// These mirror the old src/js/config.js requirejs `paths`/`map` entries:
// short ids for the src's own layers. engine, events, namespace and
// reactive-property are the vendor/ packages, installed as file: dependencies
// and imported straight from their built dists (`npm run build:vendor`).
export default defineConfig({
  root: "src",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: app("index.html"),
        //the lighting bench, at /lab/lighting.html (src/lab/lighting.js)
        lighting: app("lab/lighting.html"),
      },
    },
  },
  resolve: {
    alias: [
      { find: /^core\//, replacement: app("core") + "/" },
      { find: /^data\//, replacement: app("data") + "/" },
      { find: /^client\//, replacement: app("client/js") + "/" },
      { find: /^ui\//, replacement: app("ui") + "/" },
      { find: /^shared\//, replacement: app("shared") + "/" },
    ],
  },
});
