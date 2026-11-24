/**
 * Where city saves live in localStorage: a row per city, and a directory.
 * See isometrica/.claude/skills/buildings/city.md (Saves).
 */
import namespace from "namespace";
import {
  FORM,
  assemble,
  decode,
  encode,
  readRow,
  rowOf,
  split,
  splittable,
} from "./regions";

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

function writeRaw(self, key, text) {
  try {
    self.storage.setItem(key, text);
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
 * The row a region of a city's save is kept in (core/persistence/regions):
 * "<saves>.region.<id>.<key>"; and the row listing the regions there are,
 * "<saves>.regions.<id>". They go when the city does.
 *
 * @param id {string}
 * @param key {number}
 * @returns {string}
 */
CityStore.prototype.regionKey = function (id, key) {
  return this.saves + ".region." + id + "." + key;
};

CityStore.prototype.regionsKey = function (id) {
  return this.saves + ".regions." + id;
};

//the regions a city's save has, by their keys
function regionKeys(self, id) {
  var keys = read(self, self.regionsKey(id));

  return Array.isArray(keys) ? keys : [];
}

//a row of something kept by region - [version, bytes] - or null
function readRegion(self, key) {
  try {
    return readRow(self.storage.getItem(key));
  } catch (e) {
    console.warn("Could not read " + key + " from storage", e);
    return null;
  }
}

/**
 * Whether a city's save is kept by region (core/persistence/regions), not
 * as one row - as builds before step 8 kept it, and opened that way still.
 *
 * @param id {string}
 * @returns {boolean}
 */
CityStore.prototype.byRegion = function (id) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  var row = read(this, this.key(id));

  return row !== null && row.form === FORM;
};

/**
 * The region rows of a city's save as they are: [key, version, bytes] -
 * for the world that opens it to know what is written already.
 *
 * @param id {string}
 * @returns {Array[]}
 */
CityStore.prototype.regions = function (id) {
  var out = [];

  if (!this.byRegion(id)) return out;

  var keys = regionKeys(this, id);

  for (var i = 0; i < keys.length; i++) {
    var row = readRegion(this, this.regionKey(id, keys[i]));

    if (row !== null) out.push([keys[i], row[0], row[1]]);
  }

  return out;
};

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

  var row = read(this, this.key(id));

  if (row === null || row.form !== FORM) return row;

  //kept by region: the header and every region, put together
  var keys = regionKeys(this, id),
    parts = [];

  for (var i = 0; i < keys.length; i++) {
    var region = readRegion(this, this.regionKey(id, keys[i]));

    if (region !== null) parts.push(decode(region[1]));
    else console.warn("A region of city " + id + " is missing: " + keys[i]);
  }

  return assemble(row, parts);
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

  //of the shape a world saves today: by region, the rows that came out
  //different written
  if (splittable(data)) {
    var parts = split(data),
      was = new Map(),
      rows = [],
      keys = [];

    this.regions(id).forEach(function (r) {
      was.set(r[0], r);
    });
    parts.regions.forEach(function (p, key) {
      var bytes = encode(p),
        old = was.get(key),
        version = old ? old[1] : 0;

      was.delete(key);
      if (bytes === null) return;
      keys.push(key);
      if (old && rowOf(version, old[2]) === rowOf(version, bytes)) return;
      rows.push([key, rowOf(version + 1, bytes)]);
    });
    was.forEach(function (r, key) {
      rows.push([key, null]);
    });

    return this.writeRegions(
      id,
      { header: parts.header, rows: rows, keys: keys },
      name,
      rev,
    );
  }

  //of an older shape: whole, as it was - a world opening it saves it by
  //region (CityPersistence#open)
  dropRegions(this, id);

  return put(this, id, data, null, name, rev);
};

/**
 * Writes a save by region (core/persistence/regions CityRegions#save): the
 * regions that changed, then the list of them where it changed, then the
 * header - which makes it the city's save.
 *
 * @param id {string}
 * @param batch {{header: Object, rows: Array[], keys: number[]|null}}
 *        rows [key, row text | null]
 * @param [name] {string}
 * @param [rev] {number|boolean} the server's revision this is a copy of
 *        (#write) - or true for the same save in another form: written,
 *        but not as a change (an older save moved over)
 * @returns {boolean} false when any of it could not be written
 */
CityStore.prototype.writeRegions = function (id, batch, name, rev) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  var ok = true,
    wasWhole = !this.byRegion(id),
    i;

  for (i = 0; i < batch.rows.length; i++) {
    var key = this.regionKey(id, batch.rows[i][0]);

    if (batch.rows[i][1] === null) drop(this, key);
    else ok = writeRaw(this, key, batch.rows[i][1]) && ok;
  }

  if (batch.keys !== null && batch.keys !== undefined)
    ok = write(this, this.regionsKey(id), batch.keys) && ok;
  //what was one row is now its header: its regions all written above
  else if (wasWhole && batch.rows.length > 0)
    ok =
      write(
        this,
        this.regionsKey(id),
        batch.rows.map(function (r) {
          return r[0];
        }),
      ) && ok;

  if (!ok) return false;

  return put(
    this,
    id,
    batch.header,
    null,
    name,
    rev === true ? undefined : rev,
    rev === true,
  );
};

//a city's regions, gone
function dropRegions(self, id) {
  var keys = regionKeys(self, id);

  for (var i = 0; i < keys.length; i++) drop(self, self.regionKey(id, keys[i]));
  drop(self, self.regionsKey(id));
}

function put(self, id, data, text, name, rev, same) {
  if (self.storage === null || !CityStore.isValidId(id)) return false;

  var key = self.key(id);

  if (!(text !== null ? writeRaw(self, key, text) : write(self, key, data)))
    return false;

  var index = self.index(),
    was = index.cities[id] || {},
    //every write is counted, so that an upload knows whether what it took
    //up is still all there is (#synced) - but the same save moved over
    //into another form
    writes = (was.writes || 0) + (same ? 0 : 1);

  index.cities[id] = {
    key: key,
    name: name || "",
    updatedAt: Date.now(),
    rev: rev !== undefined ? rev : was.rev === undefined ? null : was.rev,
    writes: writes,
    syncedWrites: rev !== undefined ? writes : was.syncedWrites || 0,
  };

  //the upload still unanswered is still unanswered - unless this is the
  //server's own copy, which settles it
  if (rev === undefined && was.pending) index.cities[id].pending = was.pending;

  return writeIndex(self, index);
}

/**
 * Where a city's save stands with the server.
 *
 * @param id {string}
 * @returns {{rev: number|null, writes: number, dirty: boolean,
 *          pending: {savedAt: number, writes: number}[]}|null} rev - the
 *          server's revision the save here was made on top of, null for one
 *          never on it; dirty - whether it has changed since; pending - the
 *          uploads made on top of rev that went without an answer
 *          (#uploading); null when there is no save here at all
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
    pending: Array.isArray(city.pending) ? city.pending : [],
  };
};

//how many unanswered uploads are remembered (#uploading)
var PENDING_MOST = 10;

/**
 * Records that the save is going up - before it goes, since the answer may
 * never come back: the page closed, the browser quit, while it was on its
 * way. The server may well have taken it all the same, and the next time
 * the city is opened it can tell its latest is this one (CitySync#ours)
 * rather than the city having been saved from somewhere else.
 *
 * @param id {string}
 * @param savedAt {number} the save's own savedAt - which save it is
 * @param writes {number} syncState().writes when it was read to go up
 * @returns {boolean}
 */
CityStore.prototype.uploading = function (id, savedAt, writes) {
  var index = this.index(),
    city = index.cities[id],
    pending;

  if (city === undefined) return false;

  //every one sent on top of the same revision, the server taking whichever
  //got there first - a retry may go after one that got there unanswered
  pending = Array.isArray(city.pending) ? city.pending : [];
  pending = pending.filter(function (p) {
    return p.savedAt !== savedAt;
  });
  pending.push({ savedAt: savedAt, writes: writes });
  city.pending = pending.slice(-PENDING_MOST);

  return writeIndex(this, index);
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
  delete city.pending;

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
  delete city.pending;

  return writeIndex(this, index);
};

/**
 * @param id {string}
 * @returns {boolean}
 */
CityStore.prototype.remove = function (id) {
  if (this.storage === null || !CityStore.isValidId(id)) return false;

  drop(this, this.key(id));
  dropRegions(this, id);
  for (var k = 0; k < SIDES.length; k++) {
    //kept by region too (client/carman): {version, keys}, the rows
    //"<saves>.<kind>.<id>.<key>"
    var side = read(this, this.sideKey(SIDES[k], id));

    if (side !== null && Array.isArray(side.keys))
      for (var j = 0; j < side.keys.length; j++)
        drop(this, this.sideKey(SIDES[k], id) + "." + side.keys[j]);
    drop(this, this.sideKey(SIDES[k], id));
  }

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
