/**
 * Keeps what the generator painted in the browser, one picture at a time, so
 * that a picture is never painted twice: not later in the game, once it has
 * gone out of memory, and not the next time the game starts.
 *
 * A picture is kept as its pixels - {width, height, data}, data an
 * ArrayBuffer of RGBA - which come back exactly as they went in, in any
 * browser, and are made into a picture the same way one just painted is. When
 * each was last used is kept apart from it, so that using one never writes
 * the picture again.
 *
 * Only so many are kept: past limit, the ones used longest ago go. Every
 * picture is kept with the version of the generator that painted it, and one
 * painted by any other version counts as not there.
 *
 * IndexedDB is not there in every browser, or every window - a private one
 * may refuse it - and can fail whenever it likes; then nothing is kept, and
 * everything is painted as often as it is asked for.
 */

//how long a picture is looked for before it is painted instead, in ms
var WAIT = 1000;

var DB = "isometrica-generated",
  PICTURES = "pixels",
  USED = "used",
  BY_USE = "used";

function PictureStore(limit) {
  this.limit = limit;
  this.db = null;
}

function open(self) {
  if (self.db === null)
    self.db = new Promise(function (resolve, reject) {
      var request = indexedDB.open(DB, 3);

      request.onupgradeneeded = function () {
        var db = request.result;

        //what was kept before: whole sheets, then pictures as pngs
        ["sheets", "pictures"].forEach(function (old) {
          if (db.objectStoreNames.contains(old)) db.deleteObjectStore(old);
        });

        if (!db.objectStoreNames.contains(PICTURES))
          db.createObjectStore(PICTURES, { keyPath: "name" });

        if (!db.objectStoreNames.contains(USED))
          db.createObjectStore(USED, { keyPath: "name" }).createIndex(
            BY_USE,
            "used",
          );
      };
      request.onsuccess = function () {
        var db = request.result;

        //a page with another version of the game wants the database: this
        //one lets go, rather than keep that page waiting forever
        db.onversionchange = function () {
          db.close();
          self.db = null;
        };
        resolve(db);
      };
      request.onerror = function () {
        reject(request.error);
      };
      //held open at another version by a page that does not let go: kept
      //from nothing rather than waited on
      request.onblocked = function () {
        reject(new Error("the database is held open by another page"));
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
 * @returns {Promise<{width, height, data}|null>} the picture's pixels, as
 *          painted by that version - and marks it as used just now
 */
PictureStore.prototype.get = function (name, version) {
  var read = open(this)
    .then(function (db) {
      var tx = db.transaction([PICTURES, USED], "readwrite"),
        found = null;

      tx.objectStore(PICTURES).get(name).onsuccess = function (e) {
        var record = e.target.result;

        if (
          record === undefined ||
          record.version !== version ||
          !(record.data instanceof ArrayBuffer) ||
          record.data.byteLength !== record.width * record.height * 4
        )
          return;

        found = record;
        tx.objectStore(USED).put({ name: name, used: Date.now() });
      };

      return done(tx).then(function () {
        return found;
      });
    })
    .catch(function (e) {
      console.warn("Generated picture not read from the browser: " + e);
      return null;
    });

  //never waited on for long: painting it again is quicker than that
  return Promise.race([
    read,
    new Promise(function (resolve) {
      setTimeout(resolve, WAIT, null);
    }),
  ]);
};

/**
 * Keeps a picture's pixels, and lets the ones used longest ago go past the
 * limit.
 *
 * @param picture {{width, height, data: Uint8ClampedArray}}
 */
PictureStore.prototype.put = function (name, version, picture) {
  var limit = this.limit;

  return open(this)
    .then(function (db) {
      var tx = db.transaction([PICTURES, USED], "readwrite"),
        pictures = tx.objectStore(PICTURES),
        used = tx.objectStore(USED);

      pictures.put({
        name: name,
        version: version,
        width: picture.width,
        height: picture.height,
        //a copy of just its own bytes
        data: picture.data.slice().buffer,
      });
      used.put({ name: name, used: Date.now() });

      used.count().onsuccess = function (e) {
        var over = e.target.result - limit;

        if (over <= 0) return;

        used.index(BY_USE).openCursor().onsuccess = function (e) {
          var cursor = e.target.result;

          if (cursor === null || over-- <= 0) return;

          pictures.delete(cursor.value.name);
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
