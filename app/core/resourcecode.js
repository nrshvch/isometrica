define(function (require) {
    var Namespace = require("namespace");
    var Core = Namespace("Isometrica.Core");

    /**
     * @exports ResourceCode
     * @enum {string}
     */
    var ResourceCode = Core.ResourceCode = {
        money: "money",
        food: "food",
        water: "water",
        electricity: "electricity",
        wood: "wood",
        stone: "stone",
        iron: "iron",
        oil: "oil",
        glass: "glass"
    };

    return ResourceCode;
    /*
    return {
        money: 0,
        food: 1,
        water: 2,
        electricity: 3,
        wood: 4,
        stone: 5,
        iron: 6,
        coal: 7,
        oil: 8,
        gas: 9,
        uranium: 10
    };
    */
});