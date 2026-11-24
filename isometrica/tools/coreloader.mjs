/**
 * The core loaded in node, through Vite's module loader, with nothing of a
 * browser: for test:core and the world's worker thread (coreworker.mjs).
 */
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

var here = path.dirname(fileURLToPath(import.meta.url));

export function loader() {
  return createServer({
    root: path.join(here, ".."),
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: {
      alias: [
        {
          //the engine's "events", not node's
          find: /^events$/,
          replacement: path.join(here, "../../engine/events/dist/events.js"),
        },
      ],
    },
  });
}
