define(function(require) {
    var namespace = require("namespace");
    var Engine = namespace("Isometrica.Engine");

    Engine.Config = {
        noLayerDepthSortingMask: 0,
        noLayerClearMask: 0,
        layersCount: 1,
        useOctree: false,
        renderOctree: false
    };

    return Engine.Config;
});
