import namespace from "namespace";

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

export default TerrainType;
