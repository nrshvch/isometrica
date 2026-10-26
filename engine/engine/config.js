define(function(require) {
    var namespace = require("namespace");
    var Engine = namespace("Isometrica.Engine");

    Engine.Config = {
        noLayerDepthSortingMask: 0,
        noLayerClearMask: 0,
        layersCount: 1,
        //what each layer is called, by number - for a debug panel (Stats)
        layerNames: null,
        useOctree: false,
        renderOctree: false,
        //the layers drawn lit, and of them those of flat ground, and what
        //draws every layer instead of the canvas - in WebGL: {canvas,
        //context, begin(viewport, M), layer(lit, flat), collect(renderer,
        //sprite, x0, y0), flush(), light(), end()} - its canvas the one
        //shown, its context what lines, shapes and words are drawn with
        //(see Canvas2dRenderer renderGL, Viewport) - null for everything
        //drawn on the canvas
        litLayersMask: 0,
        flatLayersMask: 0,
        gl: null,
        //how far off the screen, in its pixels, a picture is still drawn -
        //for what it does to what is on the screen: the shadow it casts
        cullMargin: 0
    };

    return Engine.Config;
});
