import InitialCity from "isometrica/data/initialcity";

/**
 * The big city the city builder can start over on, from the menu, beside the
 * one a brand new player starts on (initialcity): the one it started on
 * before that - the delivery game's, the world's own (isometrica
 * data/initialcity), grown big - called Peepstown here.
 *
 * Opened the way the initial city is: under a fresh id of its own, so the
 * moment the player changes anything it becomes their own city in their own
 * storage row. The delivery game's is left as it is, name and all.
 *
 * @type {Object}
 */
var Peepstown = Object.assign({}, InitialCity, {
  city: Object.assign({}, InitialCity.city, { name: "Peepstown" }),
});

export default Peepstown;
