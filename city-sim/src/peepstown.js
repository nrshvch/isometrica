import InitialCity from "isometrica/data/initialcity";

/**
 * The big city to start over on from the menu - isometrica's
 * data/initialcity, called Peepstown here - opened under a fresh id.
 * See city-sim/.claude/skills/ui/SKILL.md (Where).
 *
 * @type {Object}
 */
var Peepstown = Object.assign({}, InitialCity, {
  city: Object.assign({}, InitialCity.city, { name: "Peepstown" }),
});

export default Peepstown;
