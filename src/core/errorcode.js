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
  TILE_TAKEN: 9,
  OUTSIDE_CITY: 10,
  TERRAFORM_TOO_LARGE: 11,
  //clearing tiles that have nothing on them to clear
  NOTHING_TO_CLEAR: 12,
  //a road down to the water's edge, where the land is all beach
  ON_SHORE: 13,
  //a road that does not fit the slope the way it runs (core/roadbits)
  SLOPED_WRONG_WAY: 14,
};

export default ErrorCode;
