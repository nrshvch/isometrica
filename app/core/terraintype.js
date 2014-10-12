define(function (require) {
    var namespace = require("namespace");
    var Core = namespace("Isometrica.Core");

    /**
     * @enum TerrainType
     * @exports TerrainType
     */
    var TerrainType = {
        water: 0,
        grass: 1,
        shore: 2
    };

    Core.TerrainType = TerrainType;

    return TerrainType;
});
