define("config", ["require"], function (require) {
    requirejs.config({
        baseUrl: "/",
        enforceDefine: true,
        paths: {
            ui: "js",
            client: "js/client",
            core: "core",
            engine: "engine",
            jquery_dist: '',
            templates: 'templates',
            helpers: './vendor/helpers'
        },
        map: {
            "*": {
                "jquery": "bower_components/jquery/dist/jquery",
                underscore: 'bower_components/underscore/underscore',
                backbone: 'bower_components/backbone/backbone',
                numeral: 'bower_components/numeral/numeral',
                text: 'bower_components/requirejs-text/text',
                "gl-matrix": "bower_components/gl-matrix/dist/gl-matrix",
                "simplex-noise": "vendor/simplex-noise",
                handlebars: "bower_components/handlebars/handlebars.min",
                events: 'vendor/events',
                "object-pool": 'vendor/object-pool',
                enumeration: 'vendor/enumeration',
                eventmanager: 'vendor/eventmanager',
                binaryheap: 'vendor/binaryheap',
                namespace: 'vendor/namespace'
            }
        },
        shim: {
            "bower_components/jquery/dist/jquery": {
                exports: "$"
            },
            'bower_components/underscore/underscore': {
                exports: '_'
            },
            'bower_components/backbone/backbone': {
                deps: ['underscore', 'jquery'],
                exports: 'Backbone'
            },
            'vendor/events': {
                exports: 'Events'
            },
            'vendor/object-pool': {
                deps: ['events'],
                exports: 'ObjectPool'
            },
            'bower_components/handlebars/handlebars.min': {
                exports: 'Handlebars'
            }
        }
    });
});