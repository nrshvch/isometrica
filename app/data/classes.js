define(function (require) {
    var BuildingClassCode = require("data/classcode");

    var data = {};

    data[BuildingClassCode.municipal] = {
        hidden: false,
        name: "municipal",
    };

    data[BuildingClassCode.road] = {
        hidden: true,
        name: "road"
    };

    data[BuildingClassCode.tree] = {
        hidden: true,
        name: "tree"
    };

    data[BuildingClassCode.house] = {
        hidden: false,
        name: "house"
    };

    data[BuildingClassCode.industry] = {
        hidden: false,
        name: "industry"
    };

    data[BuildingClassCode.commerce] = {
        hidden: false,
        name: "commerce"
    };

    return data;

});