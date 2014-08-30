//ENUM of codes of different building kinds. e.g. house1,house2,house3 all are of house class(group).
define(function (require) {
    var namespace = require("namespace");
    var Core = namespace("Isometrica.Core");

    /**
     * @exports BuildingClassCode
     * @enum BuildingClassCode
     */
    var BuildingClassCode = Core.BuildingClassCode = {
        municipal: 0,
        road: 1,
        tree: 2,
        house: 3,
        industry: 4,
        commerce: 5
    };

    return BuildingClassCode;
});
