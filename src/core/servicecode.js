import Namespace from "namespace";

var Core = Namespace("Isometrica.Core");

/**
 * What a building may want from the city it stands in.
 *
 * A building that is missing one of these is not a working building: nobody
 * moves into a house with no road to it and no water in it (see City#missing
 * and Building#citizenCapacity). They are listed in the order the player
 * should deal with them - a street first, then the mains.
 *
 * @exports ServiceCode
 * @enum {string}
 */
var ServiceCode = Core.ServiceCode = {
    road: "road",
    water: "water"
};

export default ServiceCode;
