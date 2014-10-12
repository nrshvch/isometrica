define(function () {
    /**
     * @exports ErrorCode
     * @enum {number}
     */
    var ErrorCode = {
        NONE: 0,
        CITY_HALL_ALREADY_BUILT: 1,
        BUILDING_NOT_AVAIL: 2,
        NOT_ENOUGH_RES: 3,
        CANT_BUILD_ON_WATER: 4,
        CANT_BUILD_HERE: 5,
        WRONG_RESOURCE_TILE: 6,
        LAND_NOT_SUITABLE: 7,
        FLAT_LAND_REQUIRED: 8,
        TILE_TAKEN: 9
    };

    return ErrorCode;
});