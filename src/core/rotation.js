/**
 * Which way a building faces: turned a quarter turn at a time, 0 to 3 times.
 * Turned an odd number of times, its footprint is sizeY by sizeX. Saves from
 * when there were only two ways keep true for turned once.
 */

/**
 * @param rotation {number|boolean}
 * @returns {number} 0..3
 */
function turns(rotation) {
  return (rotation | 0) & 3;
}

/**
 * How many tiles along x the building covers, turned the way it is.
 */
function sizeX(data, rotation) {
  return turns(rotation) & 1 ? data.sizeY : data.sizeX;
}

/**
 * How many tiles along y the building covers, turned the way it is.
 */
function sizeY(data, rotation) {
  return turns(rotation) & 1 ? data.sizeX : data.sizeY;
}

/**
 * The way after this one, one more quarter turn round.
 */
function next(rotation) {
  return (turns(rotation) + 1) & 3;
}

export default { turns: turns, sizeX: sizeX, sizeY: sizeY, next: next };
