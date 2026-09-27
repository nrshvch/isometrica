import Namespace from "namespace";

var Core = Namespace("Isometrica.Core");

/**
 * What a city keeps books on.
 *
 * There used to be a shelf of these - food, water, electricity, wood, stone,
 * iron, oil, glass - but nothing in the game ever produced them: the buildings
 * that would have (farms, mines, mills, power) are still commented out in
 * data/buildings, so the only thing the player ever saw of them was a build
 * cost they could not earn back and a bar of missing icons. They are gone
 * until something makes them.
 *
 * What is left is money, and the people, who are counted by CityPopulation
 * rather than here - a city is not a pile of citizens it can spend.
 *
 * What lies in the ground - stone, iron, oil - is the map's business, not the
 * city's; that is DepositCode.
 *
 * @exports ResourceCode
 * @enum {string}
 */
var ResourceCode = Core.ResourceCode = {
    money: "money"
};

export default ResourceCode;
