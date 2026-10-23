/**
 * Keeps a city's save on the server as well as in the browser, for a game
 * that has one (city-sim's Worker, city-sim/worker/saves): the city can then
 * be opened anywhere by its address alone.
 *
 * The save in the browser (CityStore) is still the one played: it is written
 * as it always was, offline or not, and goes up from there - half a minute
 * after it changes, once more when the page is put away, and as soon as the
 * browser is back online after it was not. Nothing is lost for a save that
 * did not make it up: it is still here, and goes up next time.
 *
 * Every save goes up on top of the server's revision the one here was made
 * on, and the server takes it only while that is still its latest. When it is
 * not, the city was saved from somewhere else in the meantime - another tab,
 * another device - and the player is asked which of the two to keep.
 *
 * The same happens on the way in (#reconcile), before the city is opened:
 *
 *  - nothing here                         -> the server's, if it has one
 *  - here, the server has nothing         -> here, and it goes up as new
 *  - here made on the server's latest     -> here: the same, or newer
 *  - here unchanged, the server has moved -> the server's
 *  - both changed                         -> the player chooses
 */
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.CitySync = CitySync;

//how long after a change the save goes up, ms - a city changes all the time
//it is played, and is tens of kilobytes gzipped
var UPLOAD_AFTER = 30000;
//for a save left over from before, that did not make it up then
var SOON = 2000;
//when the server could not be reached, tried again after this, doubled
//every time up to RETRY_MAX
var RETRY_MIN = 15000,
  RETRY_MAX = 300000;
//how long to wait on the server, ms, before playing on what is here
var TIMEOUT = 8000;
//a request sent as the page goes away may only be this big, bytes - browsers
//allow 64 KiB in flight for all of them together
var KEEPALIVE_MAX = 60000;

var ASK =
  "This city has been saved from somewhere else - another tab or another " +
  "device - since it was last saved here.\n\n" +
  "OK: open that one.\n" +
  "Cancel: carry on with the one here, and save it over that one.";

function hidden() {
  return (
    typeof document !== "undefined" && document.visibilityState === "hidden"
  );
}

/**
 * @param api {string} where the saves are, as in "/api" - the cities under
 *        <api>/cities/<id>
 * @param store {CityStore}
 * @param [ask] {function(): Promise<boolean>} which of two saves to keep:
 *        true for the server's. window.confirm with ASK unless said otherwise
 * @constructor
 */
function CitySync(api, store, ask) {
  this.api = api.replace(/\/$/, "");
  this.store = store;
  this.ask = ask || confirmed;
  //false once it turns out nothing answers at api - a dev server with no
  //Worker behind it - and the game is saved in the browser only
  this.available = typeof fetch === "function";
  //called when the server's save has been put in place of the one being
  //played (CityPersistence: the page starts over on it)
  this.onReplaced = null;

  this._id = null;
  this._timer = null;
  this._retry = RETRY_MIN;
  this._busy = null;
  this._stalled = false;
  this._listeners = null;
  //how long ago the server last had the city being opened (#awayFor)
  this._away = null;
}

function confirmed() {
  return Promise.resolve(typeof window !== "undefined" && window.confirm(ASK));
}

CitySync.prototype.url = function (id) {
  return this.api + "/cities/" + id;
};

function request(self, id, init) {
  var controller =
      typeof AbortController !== "undefined" ? new AbortController() : null,
    timer = null;

  if (controller !== null) {
    init.signal = controller.signal;
    timer = setTimeout(function () {
      controller.abort();
    }, TIMEOUT);
  }

  return fetch(self.url(id), init).then(
    function (response) {
      clearTimeout(timer);

      if (response.headers.get("Saves-Api") === null) {
        self.available = false;
        throw new Error(
          "No saves at " + self.api + ", saving in the browser only",
        );
      }

      return response;
    },
    function (e) {
      clearTimeout(timer);
      throw e;
    },
  );
}

//a save goes up gzipped where the browser can, as JSON where it cannot
function encode(json) {
  if (typeof CompressionStream === "undefined") {
    return Promise.resolve({
      type: "application/json",
      body: json,
      size: new Blob([json]).size,
    });
  }

  var stream = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));

  return new Response(stream).arrayBuffer().then(function (buffer) {
    return { type: "application/gzip", body: buffer, size: buffer.byteLength };
  });
}

function decode(response) {
  var type = (response.headers.get("Content-Type") || "").split(";")[0];

  if (type !== "application/gzip") return response.json();

  var stream = response.body.pipeThrough(new DecompressionStream("gzip"));

  return new Response(stream).text().then(JSON.parse);
}

/**
 * The server's save of a city.
 *
 * @param id {string}
 * @returns {Promise<{rev: number, data: Object, away: number|null}|null>}
 *          null for a city it does not have; rejected when it cannot be
 *          reached. away is how long ago the server had it, ms, by the
 *          server's own clock - null where it does not say
 */
CitySync.prototype.download = function (id) {
  if (!this.available) return Promise.reject(new Error("No saves"));

  return request(this, id, { method: "GET" }).then(function (response) {
    if (response.status === 404) return null;

    if (response.status !== 200)
      throw new Error("Could not load the city: " + response.status);

    var rev = +response.headers.get("Save-Rev"),
      savedAt = +response.headers.get("Saved-At"),
      now = Date.parse(response.headers.get("Date") || ""),
      away = savedAt > 0 && isFinite(now) ? Math.max(now - savedAt, 0) : null;

    return decode(response).then(function (data) {
      return { rev: rev, data: data, away: away };
    });
  });
};

/**
 * How long ago the server last had the city, ms, by its own clock - as it
 * said when the city was opened (#reconcile) - or null, where it did not.
 *
 * @param id {string}
 * @returns {number|null}
 */
CitySync.prototype.awayFor = function (id) {
  return this._away !== null && this._away.id === id ? this._away.ms : null;
};

//the server's save, in place of the one here
function keep(self, id, remote) {
  var data = remote.data,
    name = data && data.city ? data.city.name : "";

  return self.store.write(id, data, name, remote.rev);
}

/**
 * Settles which save of the city is the one to open - this one or the
 * server's - before it is opened. Whatever the server says, or does not, it
 * resolves: a city that cannot be reached is played from here.
 *
 * @param id {string}
 * @returns {Promise}
 */
CitySync.prototype.reconcile = function (id) {
  var self = this,
    store = this.store;

  if (!this.available) return Promise.resolve();

  return this.download(id)
    .then(function (remote) {
      var local = store.syncState(id);

      self._away =
        remote !== null && remote.away !== null
          ? { id: id, ms: remote.away }
          : null;

      if (remote === null) {
        //the server has none: what is here goes up as a new city
        if (local !== null && local.rev !== null) store.rebase(id, null);
        return;
      }

      if (local === null || (!local.dirty && local.rev !== remote.rev)) {
        keep(self, id, remote);
        return;
      }

      //what is here was made on the server's latest
      if (local.rev === remote.rev) return;

      return self.ask().then(function (theirs) {
        if (theirs) keep(self, id, remote);
        else store.rebase(id, remote.rev);
      });
    })
    .catch(function (e) {
      console.warn("Could not reach the saves, playing what is here", e);
    });
};

function schedule(self, delay) {
  if (self._timer !== null) clearTimeout(self._timer);

  self._timer = setTimeout(function () {
    self._timer = null;
    self.flush();
  }, delay);
}

/**
 * Starts keeping the city being played on the server.
 *
 * @param id {string}
 */
CitySync.prototype.start = function (id) {
  var self = this;

  this.stop();
  this._id = id;

  if (!this.available || typeof window === "undefined") return;

  this._listeners = {
    online: function () {
      self.flush();
    },
    //a choice put off while the page was out of sight is asked for when
    //it is back
    visibilitychange: function () {
      if (!hidden() && self._stalled) self.flush();
    },
  };

  for (var type in this._listeners)
    window.addEventListener(type, this._listeners[type]);

  var state = this.store.syncState(id);

  if (state !== null && state.dirty) schedule(this, SOON);
};

CitySync.prototype.stop = function () {
  if (this._timer !== null) clearTimeout(this._timer);
  this._timer = null;

  if (this._listeners !== null) {
    for (var type in this._listeners)
      window.removeEventListener(type, this._listeners[type]);
    this._listeners = null;
  }

  this._id = null;
};

/**
 * The save here has changed: it goes up a little later, with whatever else
 * changes by then.
 */
CitySync.prototype.changed = function () {
  if (this._id !== null && this.available && this._timer === null)
    schedule(this, UPLOAD_AFTER);
};

/**
 * Takes the save up now, if it has changed since it last went.
 *
 * @param [leaving] {boolean} the page is going away - the request is to
 *        outlive it, where it is small enough to
 * @returns {Promise<boolean>} whether the server has the save as it is here
 */
CitySync.prototype.flush = function (leaving) {
  var self = this,
    id = this._id,
    store = this.store;

  if (id === null || !this.available) return Promise.resolve(false);

  if (this._busy !== null) return this._busy;

  if (this._timer !== null) clearTimeout(this._timer);
  this._timer = null;

  var state = store.syncState(id),
    data = state !== null && state.dirty ? store.read(id) : null;

  if (data === null) return Promise.resolve(state !== null);

  this._busy = encode(JSON.stringify(data))
    .then(function (body) {
      return request(self, id, {
        method: "PUT",
        headers: {
          "Content-Type": body.type,
          "Save-Base-Rev": state.rev === null ? "none" : String(state.rev),
        },
        body: body.body,
        keepalive: leaving === true && body.size < KEEPALIVE_MAX,
      });
    })
    .then(function (response) {
      if (response.status === 200) {
        return response.json().then(function (saved) {
          store.synced(id, saved.rev, state.writes);
          self._retry = RETRY_MIN;
          self._stalled = false;

          //written again while it was going up
          if (store.syncState(id).dirty) self.changed();

          return true;
        });
      }

      if (response.status === 409) {
        return response.json().then(function (latest) {
          return conflict(self, id, latest.rev, leaving);
        });
      }

      throw new Error("The server did not take the save: " + response.status);
    })
    .catch(function (e) {
      console.warn("Could not save the city to the server", e);

      if (self.available && self._id === id) {
        schedule(self, self._retry);
        self._retry = Math.min(self._retry * 2, RETRY_MAX);
      }

      return false;
    })
    .then(function (done) {
      self._busy = null;

      //the page came back while it was going up: the player is there to
      //be asked
      if (self._stalled && !hidden()) schedule(self, SOON);

      return done;
    });

  return this._busy;
};

/**
 * The server has moved on without the save here: the player is asked which
 * to keep - unless they cannot be, the page being out of sight or going away,
 * in which case it waits for them to come back.
 */
function conflict(self, id, rev, leaving) {
  var store = self.store;

  //nothing there at all: it goes up as a new city
  if (rev === null) {
    store.rebase(id, null);
    schedule(self, SOON);
    return false;
  }

  if (leaving === true || hidden()) {
    self._stalled = true;
    return false;
  }

  return self.download(id).then(function (remote) {
    if (remote === null) {
      store.rebase(id, null);
      schedule(self, SOON);
      return false;
    }

    return self.ask().then(function (theirs) {
      self._stalled = false;

      if (theirs) {
        keep(self, id, remote);
        if (self.onReplaced !== null) self.onReplaced();
        return false;
      }

      store.rebase(id, remote.rev);
      schedule(self, SOON);
      return false;
    });
  });
}

export default CitySync;
