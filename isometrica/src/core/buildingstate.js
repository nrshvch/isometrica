/**
 * @exports BuildingState
 * @enum BuildingState
 */
var BuildingState = {
  none: 0,
  underConstruction: 1,
  ready: 2,
  //on fire (core/building ignite): nobody in it, nothing made or paid for
  burning: 3,
  //burnt down: what is left of it, till it is cleared away
  ruin: 4,
};

export default BuildingState;
