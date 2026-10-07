define(function(require) {
    var namespace = require("namespace");
    var Engine = namespace("Isometrica.Engine");

    Engine.Config = {
        noLayerDepthSortingMask: 0,
        noLayerClearMask: 0,
        layersCount: 1,
        useOctree: false,
        renderOctree: false,
        //the layers drawn lit, and of them those of flat ground (see
        //Canvas2dRenderer drawLit), and whatever lights them: {enabled,
        //passes, contexts, begin(viewport), end(context, viewport)} - null
        //for everything drawn as it is
        litLayersMask: 0,
        flatLayersMask: 0,
        lighting: null
    };

    return Engine.Config;
});
