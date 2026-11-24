/**
 * A copy of state kept equal to its owner's from far off - another thread,
 * a server: frames of records packed into one ArrayBuffer (numbers and
 * bytes, each with a kind), counted by version, so that a copy takes a
 * frame only on top of the version it has (a snapshot - from -1 - always);
 * a Table of rows whose changes go into frames; and Published, the last
 * whole copy of some bytes handed from a writing thread to a reading one
 * through a SharedArrayBuffer with Atomics. Skill `world` (replica).
 *
 *   var w = Writer(), r = Reader(), copy = Replica();
 *   w.begin(copy.version); w.record(STEP, nums, 2); w.text(SAY, nums, 0, s);
 *   var bytes = w.end(next);          //a view; w.copy() to transfer
 *   r.open(bytes);
 *   if (copy.accept(r)) while (r.next() >= 0) use(r.kind, r.nums, r.n, r);
 */

var HEADER = 24,
  RECORD = 8;

var encoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null,
  decoder = typeof TextDecoder !== "undefined" ? new TextDecoder() : null;

function pad8(n) {
  return (n + 7) & ~7;
}

/**
 * Writer(capacity): frames into a buffer of its own, grown by doubling and
 * kept - nothing is made a frame but what grows it (and a text record's
 * view for encodeInto).
 * - begin(from): a new frame on top of version from (-1: a snapshot);
 * - record(kind, nums, n, bytes, length): kind 0..65535, n numbers of nums
 *   (any array-like, 65535 at most), and bytes (Uint8Array) or none;
 * - text(kind, nums, n, string): the same with a string, UTF-8;
 * - end(to) -> the frame (a Uint8Array view of the writer's buffer, good
 *   till the next begin); copy() -> the frame as an ArrayBuffer of its own,
 *   to transfer; count, length.
 */
export function Writer(capacity) {
  var buffer = new ArrayBuffer(pad8(Math.max(capacity || 1024, 64))),
    u8 = new Uint8Array(buffer),
    dv = new DataView(buffer);

  var w = {
    count: 0,
    length: HEADER,
    from: -1,
    to: -1,

    begin: function (from) {
      w.from = from;
      w.to = -1;
      w.count = 0;
      w.length = HEADER;
    },

    record: function (kind, nums, n, bytes, length) {
      n = n | 0;
      length = bytes ? (length === undefined ? bytes.length : length) : 0;

      var at = head(kind, n, length);

      if (length > 0) u8.set(bytes.subarray(0, length), at);
      w.length = pad8(at + length);
      w.count++;
      if (n > 0) numbers(nums, n);
    },

    text: function (kind, nums, n, string) {
      n = n | 0;

      var most = string.length * 3,
        start = reserve(RECORD + n * 8 + most),
        at = start + RECORD + n * 8,
        written = encoder.encodeInto(
          string,
          u8.subarray(at, at + most),
        ).written;

      write(start, kind, n, written);
      w.length = pad8(at + written);
      w.count++;
      if (n > 0) numbers(nums, n, start);
    },

    end: function (to) {
      w.to = to;
      dv.setUint32(0, w.length, true);
      dv.setUint32(4, w.count, true);
      dv.setFloat64(8, w.from, true);
      dv.setFloat64(16, to, true);

      return u8.subarray(0, w.length);
    },

    copy: function () {
      return buffer.slice(0, w.length);
    },
  };

  function reserve(bytes) {
    var start = w.length;

    if (start + bytes > buffer.byteLength) {
      var next = new ArrayBuffer(
        pad8(Math.max(buffer.byteLength * 2, start + bytes)),
      );

      new Uint8Array(next).set(u8.subarray(0, start));
      buffer = next;
      u8 = new Uint8Array(buffer);
      dv = new DataView(buffer);
    }

    return start;
  }

  function write(start, kind, n, length) {
    dv.setUint16(start, kind, true);
    dv.setUint16(start + 2, n, true);
    dv.setUint32(start + 4, length, true);
  }

  //a record's head and room for it: where its bytes go
  function head(kind, n, length) {
    var start = reserve(RECORD + n * 8 + length);

    write(start, kind, n, length);
    w.at = start;

    return start + RECORD + n * 8;
  }

  function numbers(nums, n, start) {
    var at = (start === undefined ? w.at : start) + RECORD;

    for (var i = 0; i < n; i++) dv.setFloat64(at + i * 8, nums[i], true);
  }

  return w;
}

/**
 * Reader(): goes through a frame record by record.
 * - open(bytes) -> the frame's version to (bytes a Uint8Array or
 *   ArrayBuffer); from, to, count;
 * - next() -> the next record's kind, or -1 when there are none; then kind,
 *   n and nums (the numbers, in a Float64Array of its own, kept), length
 *   (of its bytes), bytes() (a view) and text().
 */
export function Reader() {
  var u8 = null,
    dv = null,
    at = 0,
    end = 0;

  var r = {
    from: -1,
    to: -1,
    count: 0,
    kind: -1,
    n: 0,
    nums: new Float64Array(16),
    length: 0,
    start: 0,

    open: function (bytes) {
      if (bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
      u8 = bytes;
      dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      end = Math.min(dv.getUint32(0, true), bytes.byteLength);
      r.count = dv.getUint32(4, true);
      r.from = dv.getFloat64(8, true);
      r.to = dv.getFloat64(16, true);
      at = HEADER;
      r.kind = -1;

      return r.to;
    },

    next: function () {
      if (at + RECORD > end) return (r.kind = -1);

      var kind = dv.getUint16(at, true),
        n = dv.getUint16(at + 2, true),
        length = dv.getUint32(at + 4, true),
        p = at + RECORD;

      if (r.nums.length < n)
        r.nums = new Float64Array(Math.max(n, r.nums.length * 2));
      for (var i = 0; i < n; i++) r.nums[i] = dv.getFloat64(p + i * 8, true);

      r.kind = kind;
      r.n = n;
      r.length = length;
      r.start = p + n * 8;
      at = pad8(r.start + length);

      return kind;
    },

    bytes: function () {
      return u8.subarray(r.start, r.start + r.length);
    },

    text: function () {
      return decoder.decode(u8.subarray(r.start, r.start + r.length));
    },
  };

  return r;
}

/**
 * Replica(): a copy's version. accept(reader) -> whether the frame opened
 * goes on top of it - one from the version it has, or a snapshot (from
 * -1) - and if so the version is the frame's; one that does not leaves it
 * stale (a version missed: it wants a snapshot) and is to be dropped.
 */
export function Replica() {
  var copy = {
    version: -1,
    stale: false,

    accept: function (reader) {
      if (reader.from === -1 || reader.from === copy.version) {
        copy.version = reader.to;
        copy.stale = false;

        return true;
      }

      copy.stale = true;

      return false;
    },
  };

  return copy;
}

/**
 * Table(fields, rows): rows of numbers, a Float64Array a field, whose
 * changes are kept as they are made (set) to go into a frame:
 * - set(row, field, value), get(row, field); rows grows as rows are set;
 * - snapshot(writer, kind) - every row a record; changes(writer, kind) -
 *   only those set to something else since the last, which they clear;
 * - apply(reader) - a record of either, onto this table (a copy's).
 * A record is [row, the fields...].
 */
export function Table(fields, rows) {
  var capacity = Math.max(rows || 16, 1),
    cols = [],
    dirty = new Uint8Array(capacity),
    list = new Int32Array(capacity),
    row = new Float64Array(fields + 1),
    f;

  for (f = 0; f < fields; f++) cols.push(new Float64Array(capacity));

  var t = {
    fields: fields,
    rows: 0,
    changed: 0,
    cols: cols,

    get: function (r, field) {
      return cols[field][r];
    },

    set: function (r, field, value) {
      if (r >= capacity) room(r + 1);
      if (r >= t.rows) {
        t.rows = r + 1;
        mark(r);
      }

      //NaN is no change from NaN
      var was = cols[field][r];

      if (was === value || (was !== was && value !== value)) return;

      cols[field][r] = value;
      mark(r);
    },

    snapshot: function (writer, kind) {
      for (var r = 0; r < t.rows; r++) put(writer, kind, r);
      clear();
    },

    changes: function (writer, kind) {
      for (var i = 0; i < t.changed; i++) put(writer, kind, list[i]);
      clear();
    },

    apply: function (reader) {
      var nums = reader.nums,
        r = nums[0];

      for (var f = 0; f < fields && f + 1 < reader.n; f++)
        t.set(r, f, nums[f + 1]);
    },
  };

  function room(n) {
    var next = Math.max(n, capacity * 2);

    for (var f = 0; f < fields; f++) {
      var c = new Float64Array(next);

      c.set(cols[f]);
      cols[f] = c;
    }

    var d = new Uint8Array(next),
      l = new Int32Array(next);

    d.set(dirty);
    l.set(list);
    dirty = d;
    list = l;
    capacity = next;
  }

  function mark(r) {
    if (dirty[r]) return;
    dirty[r] = 1;
    list[t.changed++] = r;
  }

  function clear() {
    for (var i = 0; i < t.changed; i++) dirty[list[i]] = 0;
    t.changed = 0;
  }

  function put(writer, kind, r) {
    row[0] = r;
    for (var f = 0; f < fields; f++) row[f + 1] = cols[f][r];
    writer.record(kind, row, fields + 1);
  }

  return t;
}

/**
 * Published(bytes, shared) - room for three copies of at most bytes;
 * Published.on(buffer) - the same seen from the other thread. One thread
 * writes (write(u8, length) into the copy it holds, then publish(version)),
 * another reads (read() -> the last copy published whole, a view, good
 * till its next read; version; fresh - whether it is newer than the last
 * read). The three copies are traded with Atomics.exchange, so neither ever
 * waits nor sees a copy half written. The buffer: Int32 [the copy between,
 * with a bit for "published since"], then each copy's length and version,
 * then the copies.
 */
var DIRTY = 4,
  META = 32;

export function Published(bytes, shared) {
  var size = pad8(bytes) + 8,
    total = META + 3 * size,
    buffer =
      shared && typeof SharedArrayBuffer !== "undefined"
        ? new SharedArrayBuffer(total)
        : new ArrayBuffer(total);

  var dv = new DataView(buffer);

  new Int32Array(buffer, 0, 1)[0] = 1;
  for (var k = 0; k < 3; k++)
    dv.setFloat64(META + k * size + size - 8, -1, true);

  return Published.on(buffer);
}

Published.on = function (buffer) {
  var ctl = new Int32Array(buffer, 0, 1),
    lengths = new Uint32Array(buffer, 8, 3),
    size = (buffer.byteLength - META) / 3,
    copies = [0, 1, 2].map(function (k) {
      return new Uint8Array(buffer, META + k * size, size);
    }),
    back = 0,
    front = 2;

  //each copy keeps its version in its last 8 bytes
  var dv = new DataView(buffer);

  var p = {
    buffer: buffer,
    size: size - 8,
    version: -1,
    fresh: false,

    write: function (u8, length) {
      length = length === undefined ? u8.length : length;
      if (length > p.size) throw new Error("Published: too big a copy");
      copies[back].set(u8.subarray(0, length));
      lengths[back] = length;
    },

    publish: function (version) {
      dv.setFloat64(META + back * size + size - 8, version, true);
      back = Atomics.exchange(ctl, 0, back | DIRTY) & 3;
    },

    read: function () {
      p.fresh = false;
      if (Atomics.load(ctl, 0) & DIRTY) {
        front = Atomics.exchange(ctl, 0, front) & 3;
        p.fresh = true;
      }

      p.version = dv.getFloat64(META + front * size + size - 8, true);

      return copies[front].subarray(0, lengths[front]);
    },
  };

  return p;
};
