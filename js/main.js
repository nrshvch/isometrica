require.config({
    packages: [
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

// a convenience function for parsing string namespaces and
// automatically generating nested namespaces
function extend( ns, ns_string ) {
    var parts = ns_string.split("."),
        parent = ns,
        pl;

    pl = parts.length;

    for ( var i = 0; i < pl; i++ ) {
        // create a property if it doesn't exist
        if ( typeof parent[parts[i]] === "undefined" ) {
            parent[parts[i]] = {};
        }

        parent = parent[parts[i]];
    }

    return parent;
}

function namespace(nsString, f){
    var ns = extend(window, nsString);

    if(f !== undefined)
        f.call(ns, ns, global);

    return ns;
}

require(["./app/vkaria", "lib/helpers"], function (Vkaria, helpers) {
    new Vkaria();
});