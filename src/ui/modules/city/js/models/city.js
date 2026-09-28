import Backbone from "backbone";
import Events from "events";
import Numeral from "numeral";
import Terrain from "core/terrain";
import ResourceCode from "core/resourcecode";

function number(amount) {
    return Numeral(Math.round(amount)).format("0,0");
}

function money(amount) {
    return "$" + number(amount);
}

//with a plus for what comes in and a minus for what goes out
function signed(amount) {
    var rounded = Math.round(amount);

    return (rounded > 0 ? "+" : rounded < 0 ? "-" : "") + money(Math.abs(rounded));
}

/**
 * Everything the info tab shows, as it reads - worked out afresh every time
 * the city updates.
 *
 * @param city {City}
 * @returns {Object}
 */
function stats(city) {
    var budget = city.getBudget(),
        population = city.population.getPopulation(),
        jobs = city.jobs.getJobs(),
        filled = city.jobs.getFilled(),
        //everybody in town can hold a job, whether their house asks it of
        //them or not - whoever has none is out of work
        unemployed = Math.max(0, population - filled),
        missing = city.getMissingServices(),
        tile = city.tile();

    return {
        name: city.name(),
        x: Terrain.extractX(tile),
        y: Terrain.extractY(tile),

        balance: money(city.resources.getResources()[ResourceCode.money] || 0),
        net: signed(budget.net),
        netClass: Math.round(budget.net) < 0 ? "expense" : "income",
        income: signed(budget.income),
        taxes: money(budget.taxes),
        commerce: money(budget.commerce),
        upkeep: signed(-budget.upkeep),
        roadsUpkeep: money(budget.roads),
        waterUpkeep: money(budget.water),
        landUpkeep: money(budget.land),
        cityHallUpkeep: money(budget.cityHall),
        otherUpkeep: budget.other > 0 ? money(budget.other) : null,

        population: number(population),
        slots: number(city.getHousingSlots()),
        jobs: number(jobs),
        filled: number(filled),
        available: number(jobs - filled),
        unemployment: population === 0 ? "-"
            : Numeral(unemployed / population).format("0.0%") + " (" + number(unemployed) + " peeps)",

        towers: number(city.water.getTowerCount()),
        roads: number(city.roads.getNetworkSize()),
        unserved: missing.road === 0 && missing.water === 0
            ? "-"
            : missing.road + " without a road, " + missing.water + " without water"
    };
}

export default Backbone.Model.extend({
    initialize: function (attributes, options) {
        this.onDispose = Events.event("dispose");

        var city = this.city = options.city;

        this.set(stats(city));

        var token = city.update().on(function (s, a, d) {
            d.set(stats(city));
        }, this);

        this.onDispose().once(function () {
            city.update().off(token);
        });
    },
    dispose: function () {
        this.onDispose(this, null);
    }
});
