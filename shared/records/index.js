/**
 * Records kept somewhere slow - a Storage, a server - by key (a region's,
 * say), each with a version counted up whenever it changes, and the set of
 * keys marked changed since they were last written: only those are made
 * again, and of them only those that come out different are written. What
 * was written last is kept, to tell. Skill `world` (records).
 *
 *   var keep = Records();
 *   keep.known(key, version, bytes);   //what the storage holds, on opening
 *   keep.mark(key);                    //something in it changed
 *   keep.collect(make, write);         //make(key) -> Uint8Array | null (none)
 *                                      //write(key, version, bytes | null)
 *   var text = toText(bytes);          //base64, for a Storage of strings
 *   var bytes = fromText(text);
 */
import { List, NumMap } from "../typed/index.js";

/**
 * Records(capacity):
 * - mark(key): changed - made again at the next collect; marked(key);
 *   pending: how many are marked;
 * - collect(make, write) -> how many were written: each key marked (in the
 *   order marked) made, and written with its next version if it came out
 *   different from the last written - null for a record there is no more
 *   of; a key marked while it runs is left for the next;
 * - known(key, version, bytes): what is there already (copied);
 * - has(key), version(key) (-1 for none ever), bytes(key) (the last
 *   written, or null), keys() -> the keys with a record, size;
 *   keysChanged: whether a key came or went since it was last set false.
 */
export function Records(capacity) {
  var slots = NumMap(capacity || 64),
    keyOf = List(Float64Array, capacity || 64),
    versions = List(Float64Array, capacity || 64),
    //the last written of each slot, or null
    held = [],
    marks = NumMap(capacity || 64),
    marked = List(Float64Array, capacity || 64),
    scratch = new Float64Array(16);

  var r = {
    size: 0,
    pending: 0,
    keysChanged: false,

    mark: function (key) {
      if (marks.has(key)) return;
      marks.set(key, 1);
      marked.push(key);
      r.pending = marked.count;
    },

    marked: function (key) {
      return marks.has(key);
    },

    known: function (key, version, bytes) {
      var s = slot(key);

      versions.items[s] = version;
      if (held[s] === null && bytes) r.size++;
      else if (held[s] !== null && !bytes) r.size--;
      held[s] = bytes ? bytes.slice() : null;
    },

    has: function (key) {
      var s = slots.get(key, -1);

      return s >= 0 && held[s] !== null;
    },

    version: function (key) {
      var s = slots.get(key, -1);

      return s < 0 ? -1 : versions.items[s];
    },

    bytes: function (key) {
      var s = slots.get(key, -1);

      return s < 0 ? null : held[s];
    },

    keys: function () {
      var out = [];

      for (var s = 0; s < keyOf.count; s++)
        if (held[s] !== null) out.push(keyOf.items[s]);

      return out;
    },

    collect: function (make, write) {
      var n = marked.count,
        written = 0,
        i;

      if (scratch.length < n) scratch = new Float64Array(n * 2);
      for (i = 0; i < n; i++) scratch[i] = marked.items[i];
      marked.clear();
      marks.clear();
      r.pending = 0;

      for (i = 0; i < n; i++) {
        var key = scratch[i],
          bytes = make(key),
          s = slots.get(key, -1),
          last = s < 0 ? null : held[s];

        if (bytes === null || bytes === undefined) {
          if (last === null) continue;
          held[s] = null;
          r.size--;
          r.keysChanged = true;
        } else {
          if (last !== null && same(last, bytes)) continue;
          if (s < 0) s = slot(key);
          if (last === null) {
            r.size++;
            r.keysChanged = true;
          }
          held[s] = bytes.slice();
        }
        versions.items[s]++;
        written++;
        write(key, versions.items[s], held[s]);
      }

      return written;
    },
  };

  function slot(key) {
    var s = slots.get(key, -1);

    if (s >= 0) return s;
    s = keyOf.push(key);
    versions.push(0);
    held.push(null);
    slots.set(key, s);

    return s;
  }

  return r;
}

//whether two runs of bytes are the same - four at a time where both are
//aligned to it
function same(a, b) {
  var n = a.length;

  if (n !== b.length) return false;

  var i = 0;

  if ((a.byteOffset & 3) === 0 && (b.byteOffset & 3) === 0 && n >= 32) {
    var m = n >> 2,
      x = new Int32Array(a.buffer, a.byteOffset, m),
      y = new Int32Array(b.buffer, b.byteOffset, m);

    for (var j = 0; j < m; j++) if (x[j] !== y[j]) return false;
    i = m << 2;
  }

  for (; i < n; i++) if (a[i] !== b[i]) return false;

  return true;
}

var ALPHABET =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
  CODES = new Uint8Array(64),
  VALUES = new Uint8Array(128).fill(255);

for (var c = 0; c < 64; c++) {
  CODES[c] = ALPHABET.charCodeAt(c);
  VALUES[CODES[c]] = c;
}

/**
 * toText(bytes) -> the bytes as base64 (RFC 4648, padded): for a Storage
 * that keeps strings.
 */
export function toText(bytes) {
  var n = bytes.length,
    out = new Uint8Array(Math.ceil(n / 3) * 4),
    o = 0,
    i = 0,
    v;

  for (; i + 2 < n; i += 3) {
    v = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out[o++] = CODES[v >> 18];
    out[o++] = CODES[(v >> 12) & 63];
    out[o++] = CODES[(v >> 6) & 63];
    out[o++] = CODES[v & 63];
  }
  if (i < n) {
    v = (bytes[i] << 16) | (i + 1 < n ? bytes[i + 1] << 8 : 0);
    out[o++] = CODES[v >> 18];
    out[o++] = CODES[(v >> 12) & 63];
    out[o++] = i + 1 < n ? CODES[(v >> 6) & 63] : 61;
    out[o++] = 61;
  }

  var s = "";

  for (i = 0; i < o; i += 8192)
    s += String.fromCharCode.apply(
      null,
      out.subarray(i, Math.min(o, i + 8192)),
    );

  return s;
}

/**
 * fromText(text) -> the bytes toText made of them (a Uint8Array of its own,
 * aligned); null for text that is not base64.
 */
export function fromText(text) {
  var n = text.length;

  if (n % 4 !== 0) return null;

  var pad = 0;

  if (n > 0 && text.charCodeAt(n - 1) === 61)
    pad = text.charCodeAt(n - 2) === 61 ? 2 : 1;

  var out = new Uint8Array((n / 4) * 3 - pad),
    o = 0;

  for (var i = 0; i < n; i += 4) {
    var last = i + 4 === n,
      a = value(text, i),
      b = value(text, i + 1),
      c = last && pad === 2 ? 0 : value(text, i + 2),
      d = last && pad > 0 ? 0 : value(text, i + 3);

    if ((a | b | c | d) > 63) return null;

    var v = (a << 18) | (b << 12) | (c << 6) | d;

    out[o++] = v >> 16;
    if (o < out.length) out[o++] = (v >> 8) & 255;
    if (o < out.length) out[o++] = v & 255;
  }

  return out;
}

function value(text, i) {
  var c = text.charCodeAt(i);

  return c < 128 ? VALUES[c] : 255;
}
