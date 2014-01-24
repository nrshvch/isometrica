define(function (require) {
    var Enumerator = require("lib/enumerator");

    return Enumerator.create({
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
    });
});