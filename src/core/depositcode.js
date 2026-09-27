import Namespace from "namespace";

var Core = Namespace("Isometrica.Core");

/**
 * What the ground holds.
 *
 * These are a feature of the map, not of any city: the terrain scatters them
 * about, a tile that has one cannot be built on, and one day the gatherers
 * (see the mills and mines in data/buildings) will stand on them and bring
 * something up. What a city actually banks is ResourceCode.
 *
 * @exports DepositCode
 * @enum {string}
 */
var DepositCode = Core.DepositCode = {
    stone: "stone",
    iron: "iron",
    oil: "oil"
};

export default DepositCode;
