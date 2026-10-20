/**
 * Where city saves live in localStorage.
 *
 * Every city gets a row of its own - "isometrica.v3.city.<id>" - so that a
 * single save can be read, hand edited or thrown away without touching the
 * rest. One more row, "isometrica.v3.cities", is the directory of them: it
 * says which key each city id is stored under, and which city the game opens
 * when the url does not name one.
 *
 * Each game keeps its cities under a name of its own (games/*): the city
 * builder under "isometrica.v3" - where they always were - the delivery game
 * under its own, so that playing one never opens nor writes over the other's.
 *
 * Ids are twelve characters out of [0-9A-Za-z], short enough to carry around
 * in the address bar (/pA4b1cX9q2Rz) and too many to be guessed - the id is
 * all it takes to open a city off the server (CitySync). Cities from before
 * have six, and keep them.
 *
 * Where the game saves to a server too (CitySync), the index also says, for
 * every city, which of the server's revisions the save here was made on top
 * of, and whether it has changed since - what is still to go up.
 */
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.CityStore = CityStore;

//the keys carry a generation: saves under an older one hold buildings that
//are not there any more (the cottage, the bank - folded into the looks of the
//house and the shop), so they are left behind rather than read. Bump it again
//whenever old saves stop making sense
var SAVES = "isometrica.v3";
var ID_LENGTH = 12;
var ID_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var VERSION = 1;

//the six character ids of before still open
var ID_PATTERN = /^[0-9A-Za-z]{6}(?:[0-9A-Za-z]{6})?$/;

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
    cities: {},
  };
}

function writeIndex(self, index) {
  return write(self, self.indexKey, index);
}

/**
 * @param [storage] {Storage} defaults to localStorage
 * @param [saves] {string} what the cities are kept under - SAVES unless a
 *        game says otherwise: "<saves>.cities", "<saves>.city.<id>"
 * @constructor
 */
function CityStore(storage, saves) {
  saves = saves || SAVES;

  this.saves = saves;
  this.indexKey = saves + ".cities";
  this.cityKeyPrefix = saves + ".city.";
  this.storage =
    storage || (typeof localStorage !== "undefined" ? localStorage : null);

  if (this.storage === null)
    console.warn("No storage available, cities will not be saved");
}

CityStore.SAVES = SAVES;
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
CityStore.prototype.key = function (id) {
  return this.cityKeyPrefix + id;
};

/**
 * The row something kept beside a city's save is kept in - the traffic on
 * its roads, say (client/carman): "<saves>.<kind>.<id>". It goes when the
 * city does.
 *
 * @param kind {string}
 * @param id {string}
 * @returns {string}
 */
CityStore.prototype.sideKey = function (kind, id) {
  return this.saves + "." + kind + "." + id;
};

//what is kept beside every city's save (sideKey)
var SIDES = ["traffic"];

/**
 * @returns {{version: number, activeCityId: string|null, cities: Object}}
 */
CityStore.prototype.index = function () {
  if (this.storage === null) return emptyIndex();

  var index = read(this, this.indexKey);

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

  if (index.activeCityId === id) return true;

  index.activeCityId = id;

  return writeIndex(this, index);
};

/**
 * @param id {string}
 * @returns {boolean} whether there is a save under that id
 */
CityStore.prototype.has = function (id) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  return (
    this.index().cities[id] !== undefined && read(this, this.key(id)) !== null
  );
};

/**
 * @param id {string}
 * @returns {Object|null} the saved city data
 */
CityStore.prototype.read = function (id) {
  if (this.storage === null || !CityStore.isValidId(id)) return null;

  return read(this, this.key(id));
};

/**
 * Stores a city and records it in the index - as changed since it was last
 * on the server, unless it is the server's own copy.
 *
 * @param id {string}
 * @param data {Object}
 * @param [name] {string} shown by the saves listing, so it need not open them
 * @param [rev] {number} the server's revision this is a copy of, as it came
 *        down - it has nothing new to go up
 * @returns {boolean}
 */
CityStore.prototype.write = function (id, data, name, rev) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  var key = this.key(id);

  if (!write(this, key, data)) return false;

  var index = this.index(),
    was = index.cities[id] || {},
    //every write is counted, so that an upload knows whether what it took
    //up is still all there is (#synced)
    writes = (was.writes || 0) + 1;

  index.cities[id] = {
    key: key,
    name: name || "",
    updatedAt: Date.now(),
    rev: rev !== undefined ? rev : was.rev === undefined ? null : was.rev,
    writes: writes,
    syncedWrites: rev !== undefined ? writes : was.syncedWrites || 0,
  };

  return writeIndex(this, index);
};

/**
 * Where a city's save stands with the server.
 *
 * @param id {string}
 * @returns {{rev: number|null, writes: number, dirty: boolean}|null} rev -
 *          the server's revision the save here was made on top of, null for
 *          one never on it; dirty - whether it has changed since; null when
 *          there is no save here at all
 */
CityStore.prototype.syncState = function (id) {
  if (!this.has(id)) return null;

  var city = this.index().cities[id],
    rev = city.rev === undefined ? null : city.rev,
    writes = city.writes || 0;

  return {
    rev: rev,
    writes: writes,
    dirty: rev === null || writes !== (city.syncedWrites || 0),
  };
};

/**
 * Records that the save went up and became the server's revision rev. Only
 * what was there when it went up is on the server - writes is the count it
 * was taken at, and anything written since is still to go.
 *
 * @param id {string}
 * @param rev {number}
 * @param writes {number} syncState().writes when the save was read to go up
 * @returns {boolean}
 */
CityStore.prototype.synced = function (id, rev, writes) {
  var index = this.index(),
    city = index.cities[id];

  if (city === undefined) return false;

  city.rev = rev;
  city.syncedWrites = writes;

  return writeIndex(this, index);
};

/**
 * Makes the save here as if it had been made on top of the server's revision
 * rev - so that it goes up over that one, for the player who chose it over
 * what was saved from elsewhere. Null for a server that has none: it goes up
 * as a new city.
 *
 * @param id {string}
 * @param rev {number|null}
 * @returns {boolean}
 */
CityStore.prototype.rebase = function (id, rev) {
  var index = this.index(),
    city = index.cities[id];

  if (city === undefined) return false;

  city.rev = rev;
  //changed, whatever it was: it has to go up
  city.syncedWrites = -1;

  return writeIndex(this, index);
};

/**
 * @param id {string}
 * @returns {boolean}
 */
CityStore.prototype.remove = function (id) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  drop(this, this.key(id));
  for (var k = 0; k < SIDES.length; k++) drop(this, this.sideKey(SIDES[k], id));

  var index = this.index();

  delete index.cities[id];

  if (index.activeCityId === id) index.activeCityId = null;

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
      active: index.activeCityId === id,
    });
  }

  return r;
};

/**
 * @returns {string} an id no saved city holds yet
 */
CityStore.prototype.newId = function () {
  var index = this.index(),
    id;

  do {
    id = "";
    for (var i = 0; i < ID_LENGTH; i++)
      id += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
  } while (index.cities[id] !== undefined);

  return id;
};

export default CityStore;
