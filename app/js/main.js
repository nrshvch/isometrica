require.config({
    baseUrl: "./",
    packages: [
        {
            name: 'client',
            location: './js/client',
            main: 'main'
        },
        {
            name: 'engine',
            location: './js/engine',
            main: 'main'
        },
        {
            name: "core",
            location: "./js/core",
            main: "main"
        },
        {
            name: "ui",
            location: "./js/ui",
            main: "main"
        }
    ],
    paths: {
        jquery: 'bower_components/jquery/dist/jquery',
        underscore: 'bower_components/underscore/underscore',
        backbone: 'bower_components/backbone/backbone',
        templates: 'templates',
        numeral: 'bower_components/numeral/numeral',
        events: './js/vendor/events',
        "object-pool": './js/vendor/object-pool',
        enumeration: './js/vendor/enumeration',
        eventmanager: './js/vendor/eventmanager',
        helpers: './js/vendor/helpers',
        binaryheap: './js/vendor/binaryheap',
        namespace: './js/vendor/namespace',
        text: 'bower_components/requirejs-text/text',
        "gl-matrix": "bower_components/gl-matrix/dist/gl-matrix",
        "simplex-noise": "./js/vendor/simplex-noise"
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'events': {
            exports: 'Events'
        },
        'object-pool': {
            deps: ['events'],
            exports: 'ObjectPool'
        }
    }
});


require(["js/boot"], function (boot) {
    boot.bootstrap();
});
