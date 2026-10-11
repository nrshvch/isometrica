define(function(require) {
    var namespace = require("namespace");
    var Engine = namespace("Isometrica.Engine");

    Engine.Config = {
        noLayerDepthSortingMask: 0,
        noLayerClearMask: 0,
        layersCount: 1,
        useOctree: false,
        renderOctree: false,
        //the layers drawn lit, and of them those of flat ground, and what
        //draws every layer instead of the canvas - in WebGL: {begin(viewport,
        //M), layer(lit, flat), collect(renderer, sprite, x0, y0),
        //flush(canvas), light(), end(context, viewport)} (see
        //Canvas2dRenderer renderGL) - null for everything drawn on the canvas
        litLayersMask: 0,
        flatLayersMask: 0,
        gl: null
    };

    return Engine.Config;
});
