import Namespace from "namespace";

var Core = Namespace("Isometrica.Core");

/**
 * What a building may want from the city it stands in.
 *
 * A building that is missing one of these is not a working building: nobody
 * moves into a house that is not part of the city, or has no road to it and
 * no water in it (see City#missing and Building#citizenCapacity). They are
 * listed in the order the player should deal with them - being part of the
 * city first, which everything wants (core/city/cityroads linked), then a
 * street, then the mains.
 *
 * @exports ServiceCode
 * @enum {string}
 */
var ServiceCode = (Core.ServiceCode = {
  linked: "linked",
  road: "road",
  water: "water",
});

export default ServiceCode;
