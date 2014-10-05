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
          location: "./ui/js",
          main: "main"
        }
    ],
    paths: {
        jquery: 'bower_components/jquery/dist/jquery',
        underscore: 'bower_components/underscore/underscore',
        backbone: 'bower_components/backbone/backbone',
        templates: 'templates',
        numeral: 'bower_components/numeral/numeral',
        events: './vendor/events',
        "object-pool": './vendor/object-pool',
        enumeration: './vendor/enumeration',
        eventmanager: './vendor/eventmanager',
        helpers: './vendor/helpers',
        binaryheap: './vendor/binaryheap',
        namespace: './vendor/namespace',
        text: 'bower_components/requirejs-text/text',
        "gl-matrix": "bower_components/gl-matrix/dist/gl-matrix",
        "simplex-noise": "./vendor/simplex-noise",
        handlebars: "bower_components/handlebars/handlebars.min"
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
        },
        'handlebars':{
            exports: 'Handlebars'
        }
    }
});


require(["js/boot"], function (boot) {
    boot.bootstrap();
});
