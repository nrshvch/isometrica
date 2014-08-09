require.config({
    packages: [
        {
            name: 'client',
            location: 'client',
            main: 'main'
        },
        {
            name: 'engine',
            location: 'engine',
            main: 'main'
        },
        {
            name: "core",
            location: "core",
            main: "main"
        },
        {
            name: "ui",
            location: "ui",
            main: "main"
        }
    ],
    paths: {
        jquery: 'vendor/jquery-2.0.3.min',
        underscore: 'vendor/underscore',
        backbone: 'vendor/backbone',
        templates: '../templates',
        numeral: 'vendor/numeral.min',
        events: 'vendor/events',
        enumeration: 'vendor/enumeration',
        eventmanager: 'vendor/eventmanager',
        helpers: 'vendor/helpers',
        binaryheap: 'vendor/binaryheap',
        namespace: 'vendor/namespace'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone':{
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'events':{
            exports: 'Events'
        }
    }
});


require(["./boot"], function (boot) {
    boot.bootstrap();
});
