/**
 * What a building is worth to its city, as the player is told it: what it
 * goes without, said over it while it does, in a word (client/serviceman),
 * and, while it is looked at, all of it - for the game played to show on
 * its own screens (describe). It draws nothing and takes nothing of the client
 * with it, so a game's screens can show it without loading the client.
 */
import ServiceCode from "../core/servicecode";
import BuildingState from "../core/buildingstate";

var text = {};
text[ServiceCode.road] = "no road";
text[ServiceCode.water] = "no water";
//not a service, but the same kind of trouble: a business nobody works in
var NO_WORKERS = "noWorkers";
text[NO_WORKERS] = "no workers";
//and a house whose people would have nowhere to work
var NO_JOBS = "noJobs";
text[NO_JOBS] = "no jobs";
//and anything that wants to be part of the city and is not (core/city/
//cityroads cutOff): abandoned, till it is joined up again
var CUT_OFF = "cutOff";
text[CUT_OFF] = "cut off";
text[ServiceCode.linked] = text[CUT_OFF];

/**
 * What is said over a building going without, on the world: only what it
 * goes without - "no road", whatever road it wants (wordsFor says which).
 */
export function wordFor(missing) {
  return text[missing];
}

/**
 * What a building goes without, all of it, on its card: for a road, the
 * least of one it wants - "no road (cobble)" for a shop on a gravel lane.
 */
export function wordsFor(building, missing) {
  var wants =
    missing === ServiceCode.road && building.data.requires
      ? building.data.requires[ServiceCode.road]
      : undefined;

  return typeof wants === "string"
    ? text[missing] + " (" + wants + ")"
    : text[missing];
}

/**
 * What a building standing goes without, the first of it that counts -
 * being part of the city at all before anything it has or not, then a
 * road, water (City#missing), workers, jobs for its people - or null for
 * nothing.
 *
 * @returns {string|null} a ServiceCode, or CUT_OFF, NO_WORKERS, NO_JOBS
 */
export function wantOf(city, model) {
  var missing = city.missing(model);

  if (city.roadService.cutOff(model) !== null) return CUT_OFF;
  if (missing === null && model.jobs() > 0 && city.jobs.getWorkers(model) === 0)
    return NO_WORKERS;
  if (missing === null && city.population.isShortOfJobs(model)) return NO_JOBS;

  return missing;
}

/**
 * What a building is worth, for the game played to show while it is looked
 * at (its play's inspecting): its name, as it heads its card in the
 * catalogue; going up, how far along it is; standing, the money it makes or
 * costs a tick, how full it is - residents for a house, workers for a
 * business - and what it goes without, said as it is over it.
 *
 * @param city {City}
 * @param building {Building} the core's
 * @returns {{name: string, classCode: number, progress: number|null,
 *          income: number, residents: number, capacity: number,
 *          workers: number, jobs: number, wants: string|null}} progress
 *          0..1 while it is going up, null once it stands; income money a
 *          tick, rounded; capacity and jobs 0 for none
 */
export function describe(city, building) {
  var data = building.data,
    up = building.getState() !== BuildingState.underConstruction,
    missing = up && city ? wantOf(city, building) : null;

  return {
    name: data.name.charAt(0).toUpperCase() + data.name.slice(1),
    classCode: data.classCode,
    progress: up ? null : building.getProgress(),
    income: up && city ? Math.round(city.getBuildingIncome(building)) : 0,
    residents:
      up && city && data.citizenCapacity
        ? city.population.getResidents(building)
        : 0,
    capacity: data.citizenCapacity || 0,
    workers: up && city && data.jobs ? city.jobs.getWorkers(building) : 0,
    jobs: data.jobs || 0,
    wants: missing === null ? null : wordsFor(building, missing),
  };
}
