/**
 * How far the water reaches.
 *
 * A water tower waters everything within so many tiles of itself - the radius
 * is on the tower's own building data, and the same radius is what the player
 * is shown while they are placing one. Beyond it there is no water, and a
 * house that wants water and has none holds nobody at all.
 *
 * Water is not something the city banks: there is no reservoir to fill and no
 * amount to run out of, only ground that is covered or ground that is not. So
 * a tower is bought and paid for by where it stands, and a compact city needs
 * fewer of them than a sprawling one.
 *
 * A building counts as covered by the tile it stands on, the one the player
 * put it down on, rather than by any part of its footprint - the same tile the
 * coverage highlight paints.
 */
import Events from "events";
import BuildingData from "data/buildings";
import BuildingState from "../buildingstate";
import TileIteratorRadial from "../tileiteratorradial";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Water = CityWater;

/**
 * @param city {City}
 * @constructor
 */
function CityWater(city) {
    this.city = city;
    this._covered = {};
    this._towers = 0;
    this._stale = true;
}

CityWater.prototype.init = function () {
    var buildings = this.city.world.buildings;

    Events.on(buildings, buildings.events.buildingBuilt, onChange, this);
    Events.on(buildings, buildings.events.buildingRemoved, onChange, this);
    //a tower waters nothing until it is finished
    Events.on(buildings, buildings.events.buildingStateChange, onChange, this);
};

/**
 * @param tile {number}
 * @returns {boolean} whether any of the city's towers reaches that tile
 */
CityWater.prototype.covers = function (tile) {
    update(this);
    return this._covered[tile] === true;
};

/**
 * @param building {Building}
 * @returns {boolean}
 */
CityWater.prototype.serves = function (building) {
    return this.covers(building.tile);
};

/**
 * @returns {number} how many towers are pumping
 */
CityWater.prototype.getTowerCount = function () {
    update(this);
    return this._towers;
};

/**
 * How far this building waters the ground around it - 0 for everything that is
 * not a water tower.
 *
 * @param buildingOrCode {Building|number}
 * @returns {number}
 */
CityWater.radius = function (buildingOrCode) {
    var code = buildingOrCode !== null && typeof buildingOrCode === "object"
        ? buildingOrCode.buildingCode
        : buildingOrCode;

    return BuildingData[code].waterRadius || 0;
};

/**
 * Every tile a tower standing on this one would water. Handed to the coverage
 * highlight as it is, so that what the player is shown while placing a tower
 * is the very thing this service will go on to check.
 *
 * @param tile {number}
 * @param radius {number}
 * @returns {number[]}
 */
CityWater.coverage = function (tile, radius) {
    var tiles = [];

    if (radius <= 0)
        return tiles;

    var iter = new TileIteratorRadial(tile, radius);

    while (!iter.done)
        tiles.push(TileIteratorRadial.next(iter));

    return tiles;
};

function onChange(sender, args, self) {
    self._stale = true;
}

function update(self) {
    if (!self._stale)
        return;

    var buildings = self.city.buildings.getBuildings(),
        covered = {},
        towers = 0,
        building, radius, tiles, i, j;

    for (i = 0; i < buildings.length; i++) {
        building = buildings[i];
        radius = CityWater.radius(building);

        if (radius <= 0 || building.getState() !== BuildingState.ready)
            continue;

        towers++;

        tiles = CityWater.coverage(building.tile, radius);

        for (j = 0; j < tiles.length; j++)
            covered[tiles[j]] = true;
    }

    self._covered = covered;
    self._towers = towers;
    self._stale = false;
}

export default CityWater;
