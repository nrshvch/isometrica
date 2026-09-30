/**
 * Keeps what the generator painted in the browser, one picture at a time, so
 * that a picture is never painted twice: not later in the game, once it has
 * gone out of memory, and not the next time the game starts.
 *
 * Only so many are kept: past limit, the ones used longest ago go. Every
 * picture is kept with the version of the generator that painted it, and one
 * painted by any other version counts as not there.
 *
 * IndexedDB is not there in every browser, or every window - a private one
 * may refuse it - and can fail whenever it likes; then nothing is kept, and
 * everything is painted as often as it is asked for.
 */

var DB = "isometrica-generated",
  STORE = "pictures",
  BY_USE = "used";

function PictureStore(limit) {
  this.limit = limit;
  this.db = null;
}

function open(self) {
  if (self.db === null)
    self.db = new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB, 2);

      request.onupgradeneeded = function () {
        var db = request.result;

        //what the game kept before it painted one picture at a time
        if (db.objectStoreNames.contains("sheets"))
          db.deleteObjectStore("sheets");

        if (!db.objectStoreNames.contains(STORE))
          db.createObjectStore(STORE, { keyPath: "name" }).createIndex(
            BY_USE,
            "used",
          );
      };
      request.onsuccess = function () {
        resolve(request.result);
      };
      request.onerror = function () {
        reject(request.error);
      };
    });

  return self.db;
}

function done(tx) {
  return new Promise(function (resolve, reject) {
    tx.oncomplete = resolve;
    tx.onabort = tx.onerror = function () {
      reject(tx.error);
    };
  });
}

/**
 * @returns {Promise<Blob|null>} the picture, painted by that version - and
 *          marked as used just now
 */
PictureStore.prototype.get = function (name, version) {
  return open(this)
    .then(function (db) {
      var tx = db.transaction(STORE, "readwrite"),
        store = tx.objectStore(STORE),
        blob = null;

      store.get(name).onsuccess = function (e) {
        var record = e.target.result;

        if (record === undefined || record.version !== version) return;

        blob = record.blob;
        record.used = Date.now();
        store.put(record);
      };

      return done(tx).then(function () {
        return blob;
      });
    })
    .catch(function (e) {
      console.warn("Generated picture not read from the browser: " + e);
      return null;
    });
};

/**
 * Keeps a picture, and lets the ones used longest ago go past the limit.
 */
PictureStore.prototype.put = function (name, version, blob) {
  var limit = this.limit;

  return open(this)
    .then(function (db) {
      var tx = db.transaction(STORE, "readwrite"),
        store = tx.objectStore(STORE);

      store.put({ name: name, version: version, blob: blob, used: Date.now() });

      store.count().onsuccess = function (e) {
        var over = e.target.result - limit;

        if (over <= 0) return;

        store.index(BY_USE).openCursor().onsuccess = function (e) {
          var cursor = e.target.result;

          if (cursor === null || over-- <= 0) return;

          cursor.delete();
          cursor.continue();
        };
      };

      return done(tx);
    })
    .catch(function (e) {
      console.warn("Generated picture not kept in the browser: " + e);
    });
};

export default PictureStore;
