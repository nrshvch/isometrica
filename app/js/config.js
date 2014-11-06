define(function (require) {
    requirejs.config({
        baseUrl: "./",
        enforceDefine: true,
        paths: {
            data: "data",
            ui: "ui",
            client: "client/js",
            core: "core",
            engine: "engine",
            helpers: './vendor/helpers'
        },
        hbs: { // optional
            helpers: true,            // default: true
            i18n: false,              // default: false
            templateExtension: 'hbs', // default: 'hbs'
            partialsUrl: ''           // default: ''
        },
        map: {
            "*": {
                "ui/main":"ui/js/main", //for sake of compatibility
                "jquery": "bower_components/jquery/dist/jquery",
                underscore: 'bower_components/underscore/underscore',
                backbone: 'bower_components/backbone/backbone',
                numeral: 'bower_components/numeral/numeral',
                "gl-matrix": "bower_components/gl-matrix/dist/gl-matrix",
                "simplex-noise": "vendor/simplex-noise",
                events: 'js/events-wrapper',
                "object-pool": 'vendor/object-pool',
                enumeration: 'vendor/enumeration',
                binaryheap: 'vendor/binaryheap',
                namespace: 'vendor/namespace',
                "reactive-property": 'vendor/reactive-property',
                "marionette" : "bower_components/backbone.marionette/lib/backbone.marionette",
                text: 'bower_components/requirejs-text/text',
                hbs: 'bower_components/require-handlebars-plugin/hbs'
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
            'vendor/object-pool': {
                deps: ['events'],
                exports: 'ObjectPool'
            },
            'marionette' : {
                deps: ['Backbone'],
                exports: "Backbone"
            }
        }
    });
});