/**
 * Keeps what the game painted as it started (see generated) in the browser,
 * so that the next start loads it instead of painting it all over again.
 *
 * There is only ever one record: the sheets as pngs, what is where on them,
 * and what else the painting worked out, under the key they were painted for.
 * A record under any other key is stale, and is written over by the next one.
 *
 * IndexedDB is not there in every browser, or every window - a private one
 * may refuse it - and can fail whenever it likes; then nothing is kept, and
 * the game paints everything every time it starts.
 */

var DB = "isometrica-generated",
  STORE = "sheets",
  RECORD = "current";

function open() {
  return new Promise(function (resolve, reject) {
    var request = indexedDB.open(DB, 1);

    request.onupgradeneeded = function () {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = function () {
      resolve(request.result);
    };
    request.onerror = function () {
      reject(request.error);
    };
  });
}

function run(mode, work) {
  return open().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, mode),
        request = work(tx.objectStore(STORE));

      tx.oncomplete = function () {
        db.close();
        resolve(request.result);
      };
      tx.onabort = tx.onerror = function () {
        db.close();
        reject(tx.error || request.error);
      };
    });
  });
}

/**
 * @param key {string} what the record has to have been painted for
 * @returns {Promise<Object|null>} the record, or null when there is none for
 *          that key
 */
function read(key) {
  return run("readonly", function (store) {
    return store.get(RECORD);
  })
    .then(function (record) {
      return record !== undefined && record.key === key ? record : null;
    })
    .catch(function (e) {
      console.warn("Generated sprites not read from the browser: " + e);
      return null;
    });
}

/**
 * @param record {{key: string, sheets: Object[], data: Object}}
 * @returns {Promise}
 */
function write(record) {
  return run("readwrite", function (store) {
    return store.put(record, RECORD);
  }).catch(function (e) {
    console.warn("Generated sprites not kept in the browser: " + e);
  });
}

export default { read: read, write: write };
