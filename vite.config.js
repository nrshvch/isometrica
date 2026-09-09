import {defineConfig} from "vite";
import path from "node:path";
import {fileURLToPath} from "node:url";

var __dirname = path.dirname(fileURLToPath(import.meta.url));
var app = function (p) {
    return path.resolve(__dirname, "src", p);
};

// These mirror the old src/js/config.js requirejs `paths`/`map` entries:
// short ids for the src's own layers, plus the vendor/ packages (built by
// `npm run build:vendor`, see vendor/build.js) which src/js/vendor/*.js
// exposes as plain ES modules via a tiny AMD shim.
export default defineConfig({
    root: "src",
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: app("index.html")
            }
        }
    },
    resolve: {
        alias: [
            {find: /^core\//, replacement: app("core") + "/"},
            {find: /^data\//, replacement: app("data") + "/"},
            {find: /^client\//, replacement: app("client/js") + "/"},
            {find: /^ui\//, replacement: app("ui") + "/"},

            {find: "namespace", replacement: app("js/vendor/namespace.js")},
            {find: "events/main", replacement: app("js/vendor/events-main.js")},
            {find: "events", replacement: app("js/events-wrapper.js")},
            {find: "engine/main", replacement: app("js/vendor/engine-main.js")},
            {find: "reactive-property", replacement: app("js/vendor/reactive-property.js")},
            {find: "object-pool", replacement: app("js/vendor/object-pool.js")},
            {find: "enumeration", replacement: app("js/vendor/enumeration.js")},
            {find: "helpers", replacement: app("js/vendor/helpers.js")},
            {find: "seeded-simplex", replacement: app("js/vendor/seeded-simplex.js")}
        ]
    }
});
