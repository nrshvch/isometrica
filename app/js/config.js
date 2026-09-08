define(function (require) {
    requirejs.config({
        baseUrl: "./",
        enforceDefine: true,
        paths: {
            // --- application layers ---------------------------------------
            data: "data",
            ui: "ui",
            client: "client/js",
            core: "core",

            // --- npm dependencies -----------------------------------------
            // Served straight out of the repo root's node_modules/, which is
            // why the dev server is rooted at the repo and the page lives at
            // /app/. Versions are pinned exactly in package.json.
            jquery: "../node_modules/jquery/dist/jquery",
            underscore: "../node_modules/underscore/underscore",
            backbone: "../node_modules/backbone/backbone",
            numeral: "../node_modules/numeral/numeral",
            "gl-matrix": "../node_modules/gl-matrix/dist/gl-matrix",
            "simplex-noise": "../node_modules/simplex-noise/simplex-noise",
            yabh: "../node_modules/yabh/dist/yabh",
            hbs: "../node_modules/require-handlebars-plugin/hbs",

            // --- own dependencies -----------------------------------------
            // One package per directory under vendor/, each built by
            // `npm run build:vendor` into its own dist/. Single-module packages
            // publish a bare id and need nothing else. The three below have
            // internal modules, so their entry id is <package>/main and the
            // path points that id at the single built file.
            "engine/main": "../vendor/engine/dist/engine",
            "events/main": "../vendor/events/dist/events",
            "reactive-property/main": "../vendor/reactive-property/dist/reactive-property",
            "object-pool": "../vendor/object-pool/dist/object-pool",
            enumeration: "../vendor/enumeration/dist/enumeration",
            namespace: "../vendor/namespace/dist/namespace",
            helpers: "../vendor/helpers/dist/helpers",
            "seeded-simplex": "../vendor/seeded-simplex/dist/seeded-simplex"
        },
        hbs: { // optional
            helpers: true,            // default: true
            i18n: false,              // default: false
            templateExtension: 'hbs', // default: 'hbs'
            partialsUrl: ''           // default: ''
        },
        // Only ids that genuinely need renaming live here. They have to be map
        // entries rather than paths, because the built packages carry *named*
        // defines: paths would keep the short id while the file declares
        // `reactive-property/main`, and the module would never resolve.
        map: {
            "*": {
                "ui/main": "ui/js/main", //for sake of compatibility
                events: 'js/events-wrapper',
                "reactive-property": 'reactive-property/main'
            },
            // map matching is prefix-based, so the two aliases above also match
            // those packages' own internal ids (`events/event` would be
            // rewritten to `js/events-wrapper/event`). Mapping each name to
            // itself for referrers inside the package cancels the alias there.
            "js/events-wrapper": {
                events: 'events'
            },
            events: {
                events: 'events'
            },
            "reactive-property": {
                "reactive-property": 'reactive-property'
            }
        },
        shim: {
            jquery: {
                exports: "$"
            },
            underscore: {
                exports: '_'
            },
            backbone: {
                deps: ['underscore', 'jquery'],
                exports: 'Backbone'
            },
            // object-pool reaches for a global Events that the events wrapper
            // installs as a side effect.
            'object-pool': {
                deps: ['events'],
                exports: 'ObjectPool'
            }
        }
    });
});
