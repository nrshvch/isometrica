/**
 * Keeps the player's city in localStorage - and on the server too, for a game
 * that has one (CitySync).
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
 *    (the game's own, or data/initialcity), opened under a fresh id of its
 *    own
 *  - asked to start from the initial city       -> the same, under the id
 *    the url names - one nobody has saved - or a fresh one - or from
 *    another city the game hands it, in its place
 *
 * With a server, #prepare goes first: it settles whether the save here or the
 * server's is the one to open, and puts the server's here if it is - so that
 * #open opens whatever is here, server or not.
 *
 * From there it saves on its own, every few ticks and once more on the way
 * out. A city that was never founded is never written, so an untouched game
 * leaves no rows behind.
 */
import Events from "events";
import CityStore from "./citystore";
import CitySync from "./citysync";
import CityService from "../citysrv";
import InitialCity from "../../data/initialcity";
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.CityPersistence = CityPersistence;

var VERSION = 1;

//a tick is a second of game time, and a save is a few hundred bytes
var SAVE_EVERY_TICKS = 5;

function onNewCity(sender, city, self) {
  //one city per save - the rest of the game assumes as much
  if (self._city === null) self._city = city;
}

function onTick(sender, args, self) {
  if (self._city === null) return;

  if (++self._ticks < SAVE_EVERY_TICKS) return;

  self._ticks = 0;
  self.save();
}

/**
 * @param world {Logic}
 * @param [store] {CityStore}
 * @param [sync] {CitySync} the server the city is kept on as well, if any
 * @param [initial] {Object|null} the city a brand new player starts on, for
 *        a game that has one of its own - data/initialcity otherwise
 * @constructor
 */
function CityPersistence(world, store, sync, initial) {
  this.world = world;
  this._store = store || new CityStore();
  this._sync = sync || null;
  this._initial = initial === undefined ? InitialCity : initial;
  this._id = null;
  this._city = null;
  //how the player was looking at the city - the client's, kept as it is
  //(see #view)
  this._view = null;
  this._ticks = 0;
  this._subscriptions = null;
  this._onUnload = null;
  this._onHide = null;
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
 * How the player was looking at the city when it was saved - {turns}, the
 * camera's quarter turns (client/view) - for the client to open it the same
 * way. Core does not look into it. null for a save from before it was kept,
 * or a city never looked at: the client's own default, then.
 *
 * @returns {Object|null}
 */
CityPersistence.prototype.view = function () {
  return this._view;
};

/**
 * How the player is looking at the city now, to go into the next save.
 *
 * @param view {Object|null}
 */
CityPersistence.prototype.setView = function (view) {
  this._view = view;
};

/**
 * @returns {CityStore} for a saves listing to read and manage
 */
CityPersistence.prototype.store = function () {
  return this._store;
};

/**
 * Gets the city the url asks for - or, asking for none, the one played last -
 * from the server, when it has a newer save of it than there is here. Before
 * #open, which opens what is here.
 *
 * @param [requestedId] {string} the city id out of the url, if there was one
 * @returns {Promise} resolved when the city can be opened, whatever the
 *          server said - or failed to
 */
CityPersistence.prototype.prepare = function (requestedId) {
  var id = CityStore.isValidId(requestedId)
    ? requestedId
    : this._store.activeCityId();

  if (this._sync === null || id === null) return Promise.resolve();

  return this._sync.reconcile(id);
};

/**
 * Picks the city to play and puts it into the world.
 *
 * @param [requestedId] {string} the city id out of the url, if there was one
 * @param [fromInitial] {boolean|Object} a city nobody has saved to start
 *        from the initial city, rather than from nothing - a new game
 *        started over on it - or from the city given, in its place: a save
 *        as data/initialcity is
 * @returns {string} the id the game is now playing under - for the address bar
 */
CityPersistence.prototype.open = function (requestedId, fromInitial) {
  var store = this._store,
    world = this.world,
    id = CityStore.isValidId(requestedId) ? requestedId : null,
    data = null;

  if (id !== null && store.has(id)) {
    //the player followed a link to a city of theirs, so that is the one
    //they are playing from now on
    data = store.read(id);
    store.setActiveCityId(id);
  } else if (id === null || fromInitial) {
    var activeId = store.activeCityId();

    if (!fromInitial && activeId !== null && store.has(activeId)) {
      id = activeId;
      data = store.read(activeId);
    } else {
      //nothing of the player's own to come back to - or the initial city
      //asked for, or another in its place
      var initial =
        fromInitial && typeof fromInitial === "object"
          ? fromInitial
          : this._initial;

      if (id === null) id = store.newId();
      //the template may be a whole save row or just the city in it
      data =
        initial === null
          ? null
          : initial.city === undefined
            ? { city: initial }
            : initial;
    }
  }

  this._id = id;

  //everything below has to hear about the city the restoring brings in
  this.watch();

  if (data !== null) restore(this, data);

  if (this._sync !== null) this._sync.start(this._id);

  return this._id;
};

/**
 * Writes the city out. Does nothing until there is a city to write.
 *
 * @returns {boolean} whether it went to storage
 */
CityPersistence.prototype.save = function () {
  var data = this.snapshot();

  if (data === null) return false;

  if (!this._store.write(this._id, data, data.city.name)) return false;

  //a city is only really the player's once it has been written, so this is
  //where it becomes the one they come back to
  this._store.setActiveCityId(this._id);

  if (this._sync !== null) this._sync.changed();

  return true;
};

/**
 * The city as it goes into a save - or into data/initialcity, for another
 * game to start on (games/builder/ui/city).
 *
 * @returns {Object|null} null until there is a city
 */
CityPersistence.prototype.snapshot = function () {
  var city = this._city;

  if (city === null || this._id === null) return null;

  var data = {
    version: VERSION,
    id: this._id,
    savedAt: Date.now(),
    time: this.world.time.now,
    //the ground is the world's, whoever paid for shaping it
    terrain: this.world.terrain.save(),
    city: city.save(),
  };

  if (this._view !== null) data.view = this._view;

  return data;
};

/**
 * Starts saving. Called by #open, and safe to call twice.
 */
CityPersistence.prototype.watch = function () {
  if (this._subscriptions !== null) return;

  var world = this.world,
    self = this;

  this._subscriptions = [
    Events.on(world.cities, CityService.events.cityNew, onNewCity, this),
    Events.on(world, world.events.tick, onTick, this),
  ];

  //a closed tab is still the player leaving off where they left off
  this._onUnload = function () {
    self.save();
  };

  //and a page put away may never come back - phones close them unasked - so
  //the save goes up as it goes out of sight
  this._onHide = function () {
    if (document.visibilityState !== "hidden") return;

    self.save();
    if (self._sync !== null) self._sync.flush(true);
  };

  if (this._sync !== null) {
    //the server's save was put here in place of the one played: the page
    //starts over on it, with nothing of the old one written over it
    this._sync.onReplaced = function () {
      self.halt();
      window.location.reload();
    };
  }

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", this._onUnload);
    document.addEventListener("visibilitychange", this._onHide);
  }
};

/**
 * Saves once more and lets go of the city - for switching to another save.
 */
CityPersistence.prototype.close = function () {
  this.save();
  if (this._sync !== null) this._sync.flush(true);

  this.halt();
};

/**
 * Lets go of the city without saving it.
 */
CityPersistence.prototype.halt = function () {
  var world = this.world;

  if (this._sync !== null) this._sync.stop();

  if (this._subscriptions !== null) {
    Events.off(
      world.cities,
      CityService.events.cityNew,
      this._subscriptions[0],
    );
    Events.off(world, world.events.tick, this._subscriptions[1]);
    this._subscriptions = null;
  }

  if (this._onUnload !== null && typeof window !== "undefined") {
    window.removeEventListener("beforeunload", this._onUnload);
    document.removeEventListener("visibilitychange", this._onHide);
    this._onUnload = null;
    this._onHide = null;
  }

  this._city = null;
  this._id = null;
  this._ticks = 0;
};

/**
 * The name of the city a new player starts on (see open), or null for none -
 * for a game to say what starting over on it starts on.
 *
 * @returns {string|null}
 */
CityPersistence.prototype.initialName = function () {
  var initial = this._initial,
    city = initial && (initial.city === undefined ? initial : initial.city);

  return (city && city.name) || null;
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
  if (id === this._id) return false;

  return this._store.remove(id);
};

function restore(self, data) {
  if (data.time !== undefined && data.time !== null)
    self.world.time.load(data.time);

  //the ground goes back first - everything else stands on it
  if (data.terrain !== undefined && data.terrain !== null)
    self.world.terrain.load(data.terrain);

  if (data.city !== undefined && data.city !== null)
    self.world.cities.restoreCity(data.city);

  //saves from before it was kept have none
  self._view =
    data.view !== null && typeof data.view === "object" ? data.view : null;
}

export default CityPersistence;
