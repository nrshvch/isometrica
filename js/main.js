require.config({
    packages: [
        {
            name: 'engine',
            location: 'engine',
            main: 'main'
        },
        {
            name: "logic",
            location: "logic",
            main: "main"
        },
        {
            name: "logicapi",
            location: "logicapi",
            main: "main"
        },
        {
            name: "ui",
            location: "ui",
            main: "main"
        }
    ],
    paths: {
        //lib: 'lib',
        //vendor: 'vendor',
        jquery: 'vendor/jquery-2.0.3.min',
        underscore: 'vendor/underscore',
        backbone: 'vendor/backbone',
        templates: '../templates',
        numeral: 'vendor/numeral.min'
    },
    shim: {
        'underscore': {
            exports: '_'
        },
        'backbone':{
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        }
    }
});

require(["./app/vkaria", "lib/helpers"], function (Vkaria, helpers) {
    new Vkaria();
});