/**
 * Where city saves live in localStorage.
 *
 * Every city gets a row of its own - "isometrica.city.<id>" - so that a single
 * save can be read, hand edited or thrown away without touching the rest. One
 * more row, "isometrica.cities", is the directory of them: it says which key
 * each city id is stored under, and which city the game opens when the url
 * does not name one.
 *
 * Ids are six characters out of [0-9A-Za-z], short enough to carry around in
 * the address bar (/#/pA4b1c).
 */
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.CityStore = CityStore;

var INDEX_KEY = "isometrica.cities";
var CITY_KEY_PREFIX = "isometrica.city.";
var ID_LENGTH = 6;
var ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var VERSION = 1;

var ID_PATTERN = new RegExp("^[0-9A-Za-z]{" + ID_LENGTH + "}$");

/**
 * localStorage throws on its own whenever it feels like it - a private window
 * that has it switched off, a quota that is full - and a game that cannot save
 * should still be a game one can play, so every access goes through here and
 * a failure is reported rather than raised.
 */
function read(self, key) {
    try {
        var raw = self.storage.getItem(key);
        return raw === null ? null : JSON.parse(raw);
    } catch (e) {
        console.warn("Could not read " + key + " from storage", e);
        return null;
    }
}

function write(self, key, value) {
    try {
        self.storage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.warn("Could not write " + key + " to storage", e);
        return false;
    }
}

function drop(self, key) {
    try {
        self.storage.removeItem(key);
        return true;
    } catch (e) {
        console.warn("Could not remove " + key + " from storage", e);
        return false;
    }
}

function emptyIndex() {
    return {
        version: VERSION,
        activeCityId: null,
        cities: {}
    };
}

function writeIndex(self, index) {
    return write(self, INDEX_KEY, index);
}

/**
 * @param [storage] {Storage} defaults to localStorage
 * @constructor
 */
function CityStore(storage) {
    this.storage = storage || (typeof localStorage !== "undefined" ? localStorage : null);

    if (this.storage === null)
        console.warn("No storage available, cities will not be saved");
}

CityStore.INDEX_KEY = INDEX_KEY;
CityStore.CITY_KEY_PREFIX = CITY_KEY_PREFIX;
CityStore.ID_LENGTH = ID_LENGTH;

/**
 * @param id {string}
 * @returns {boolean} whether the string could be a city id at all
 */
CityStore.isValidId = function (id) {
    return typeof id === "string" && ID_PATTERN.test(id);
};

/**
 * The row a city's save is kept in. This is the one thing the index is there
 * for - everything else about a city is in the row itself.
 *
 * @param id {string}
 * @returns {string}
 */
CityStore.key = function (id) {
    return CITY_KEY_PREFIX + id;
};

/**
 * @returns {{version: number, activeCityId: string|null, cities: Object}}
 */
CityStore.prototype.index = function () {
    if (this.storage === null)
        return emptyIndex();

    var index = read(this, INDEX_KEY);

    if (index === null || typeof index !== "object" || index.cities === undefined)
        return emptyIndex();

    return index;
};

/**
 * @returns {string|null} the city to open when the url names none
 */
CityStore.prototype.activeCityId = function () {
    return this.index().activeCityId || null;
};

/**
 * @param id {string}
 */
CityStore.prototype.setActiveCityId = function (id) {
    var index = this.index();

    if (index.activeCityId === id)
        return true;

    index.activeCityId = id;

    return writeIndex(this, index);
};

/**
 * @param id {string}
 * @returns {boolean} whether there is a save under that id
 */
CityStore.prototype.has = function (id) {
    if (this.storage === null || !CityStore.isValidId(id))
        return false;

    return this.index().cities[id] !== undefined && read(this, CityStore.key(id)) !== null;
};

/**
 * @param id {string}
 * @returns {Object|null} the saved city data
 */
CityStore.prototype.read = function (id) {
    if (this.storage === null || !CityStore.isValidId(id))
        return null;

    return read(this, CityStore.key(id));
};

/**
 * Stores a city and records it in the index.
 *
 * @param id {string}
 * @param data {Object}
 * @param [name] {string} shown by the saves listing, so it need not open them
 * @returns {boolean}
 */
CityStore.prototype.write = function (id, data, name) {
    if (this.storage === null || !CityStore.isValidId(id))
        return false;

    var key = CityStore.key(id);

    if (!write(this, key, data))
        return false;

    var index = this.index();

    index.cities[id] = {
        key: key,
        name: name || "",
        updatedAt: Date.now()
    };

    return writeIndex(this, index);
};

/**
 * @param id {string}
 * @returns {boolean}
 */
CityStore.prototype.remove = function (id) {
    if (this.storage === null || !CityStore.isValidId(id))
        return false;

    drop(this, CityStore.key(id));

    var index = this.index();

    delete index.cities[id];

    if (index.activeCityId === id)
        index.activeCityId = null;

    return writeIndex(this, index);
};

/**
 * Every saved city, for a saves listing to show.
 *
 * @returns {Object[]} {id, key, name, updatedAt, active}
 */
CityStore.prototype.list = function () {
    var index = this.index(),
        cities = index.cities,
        r = [];

    for (var id in cities) {
        r.push({
            id: id,
            key: cities[id].key,
            name: cities[id].name || "",
            updatedAt: cities[id].updatedAt || 0,
            active: index.activeCityId === id
        });
    }

    return r;
};

/**
 * @returns {string} an id no saved city holds yet
 */
CityStore.prototype.newId = function () {
    var index = this.index(), id;

    do {
        id = "";
        for (var i = 0; i < ID_LENGTH; i++)
            id += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
    } while (index.cities[id] !== undefined);

    return id;
};

export default CityStore;
