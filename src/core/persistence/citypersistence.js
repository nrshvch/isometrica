/**
 * Keeps the player's city in localStorage.
 *
 * Which city is opened is decided once, on start up, by CityPersistence#open:
 *
 *  - the url names a city the player has saved  -> that one is loaded, and it
 *    becomes the active city
 *  - the url names a city nobody has saved      -> a blank city under that id,
 *    the player starts from nothing
 *  - the url names nobody, but there is an
 *    active city in storage                     -> that one is loaded
 *  - nothing anywhere                           -> the hardcoded initial city
 *    (data/initialcity), opened under a fresh id of its own
 *
 * From there it saves on its own, every few ticks and once more on the way
 * out. A city that was never founded is never written, so an untouched game
 * leaves no rows behind.
 */
import Events from "events";
import CityStore from "./citystore";
import CityService from "../citysrv";
import InitialCity from "data/initialcity";
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.CityPersistence = CityPersistence;

var VERSION = 1;

//a tick is a second of game time, and a save is a few hundred bytes
var SAVE_EVERY_TICKS = 5;

function onNewCity(sender, city, self) {
    //one city per save - the rest of the game assumes as much
    if (self._city === null)
        self._city = city;
}

function onTick(sender, args, self) {
    if (self._city === null)
        return;

    if (++self._ticks < SAVE_EVERY_TICKS)
        return;

    self._ticks = 0;
    self.save();
}

/**
 * @param world {Logic}
 * @param [store] {CityStore}
 * @constructor
 */
function CityPersistence(world, store) {
    this.world = world;
    this._store = store || new CityStore();
    this._id = null;
    this._city = null;
    this._ticks = 0;
    this._subscriptions = null;
    this._onUnload = null;
}

CityPersistence.VERSION = VERSION;

/**
 * The city the game is playing, whether it has been saved yet or not.
 *
 * @returns {string|null}
 */
CityPersistence.prototype.cityId = function () {
    return this._id;
};

/**
 * @returns {CityStore} for a saves listing to read and manage
 */
CityPersistence.prototype.store = function () {
    return this._store;
};

/**
 * Picks the city to play and puts it into the world.
 *
 * @param [requestedId] {string} the city id out of the url, if there was one
 * @returns {string} the id the game is now playing under - for the address bar
 */
CityPersistence.prototype.open = function (requestedId) {
    var store = this._store,
        world = this.world,
        id = CityStore.isValidId(requestedId) ? requestedId : null,
        data = null;

    if (id !== null && store.has(id)) {
        //the player followed a link to a city of theirs, so that is the one
        //they are playing from now on
        data = store.read(id);
        store.setActiveCityId(id);
    } else if (id === null) {
        var activeId = store.activeCityId();

        if (activeId !== null && store.has(activeId)) {
            id = activeId;
            data = store.read(activeId);
        } else {
            //nothing of the player's own to come back to
            id = store.newId();
            //the template may be a whole save row or just the city in it
            data = InitialCity === null ? null
                : (InitialCity.city === undefined ? {city: InitialCity} : InitialCity);
        }
    }

    this._id = id;

    //everything below has to hear about the city the restoring brings in
    this.watch();

    if (data !== null)
        restore(this, data);

    return this._id;
};

/**
 * Writes the city out. Does nothing until there is a city to write.
 *
 * @returns {boolean} whether it went to storage
 */
CityPersistence.prototype.save = function () {
    var city = this._city;

    if (city === null || this._id === null)
        return false;

    var data = {
        version: VERSION,
        id: this._id,
        savedAt: Date.now(),
        time: this.world.time.now,
        city: city.save()
    };

    if (!this._store.write(this._id, data, data.city.name))
        return false;

    //a city is only really the player's once it has been written, so this is
    //where it becomes the one they come back to
    this._store.setActiveCityId(this._id);

    return true;
};

/**
 * Starts saving. Called by #open, and safe to call twice.
 */
CityPersistence.prototype.watch = function () {
    if (this._subscriptions !== null)
        return;

    var world = this.world, self = this;

    this._subscriptions = [
        Events.on(world.cities, CityService.events.cityNew, onNewCity, this),
        Events.on(world, world.events.tick, onTick, this)
    ];

    //a closed tab is still the player leaving off where they left off
    this._onUnload = function () {
        self.save();
    };

    if (typeof window !== "undefined")
        window.addEventListener("beforeunload", this._onUnload);
};

/**
 * Saves once more and lets go of the city - for switching to another save.
 */
CityPersistence.prototype.close = function () {
    this.save();

    var world = this.world;

    if (this._subscriptions !== null) {
        Events.off(world.cities, CityService.events.cityNew, this._subscriptions[0]);
        Events.off(world, world.events.tick, this._subscriptions[1]);
        this._subscriptions = null;
    }

    if (this._onUnload !== null && typeof window !== "undefined") {
        window.removeEventListener("beforeunload", this._onUnload);
        this._onUnload = null;
    }

    this._city = null;
    this._id = null;
    this._ticks = 0;
};

/**
 * An id no saved city holds - for starting a new one.
 *
 * @returns {string}
 */
CityPersistence.prototype.newCityId = function () {
    return this._store.newId();
};

/**
 * Every city the player has saved.
 *
 * @returns {Object[]}
 */
CityPersistence.prototype.list = function () {
    return this._store.list();
};

/**
 * Throws a save away. The city being played is left alone - closing it would
 * only write it back.
 *
 * @param id {string}
 * @returns {boolean}
 */
CityPersistence.prototype.remove = function (id) {
    if (id === this._id)
        return false;

    return this._store.remove(id);
};

function restore(self, data) {
    if (data.time !== undefined && data.time !== null)
        self.world.time.load(data.time);

    if (data.city !== undefined && data.city !== null)
        self.world.cities.restoreCity(data.city);
}

export default CityPersistence;
