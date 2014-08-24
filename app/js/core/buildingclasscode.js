//ENUM of codes of different building kinds. e.g. house1,house2,house3 all are of house class(group).
define(function () {
    /**
     * @exports BuildingClassCode
     * @enum BuildingClassCode
     */
    var BuildingClassCode = {
        municipal: 0,
        road: 1,
        tree: 2,
        house: 3,
        industry: 4,
        commerce: 5
    }

    return BuildingClassCode;
});
