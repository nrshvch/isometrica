/**
 * The containers everything is kept in, as typed arrays: a store of records
 * with handles, a list, a min-heap, a set of bits, a map from numbers to
 * numbers, a radix sort, and a ring two threads can share. Nothing here makes objects per item; arrays grow
 * by doubling, so a caller re-reads a column after anything that may add.
 * The design is engine/docs/world.md, Typed arrays.
 */

//a typed array of the same type with room for at least n, the old ones copied
export function grow(array, n) {
  if (array.length >= n) return array;

  var next = new array.constructor(Math.max(n, array.length * 2, 8));

  next.set(array);

  return next;
}

/*
 * A handle is a slot and how many times that slot has been used, packed in
 * 32 bits: 22 for the slot (4M records), 10 for the count. A handle to a
 * record removed is told from whatever is in its slot now (until the slot has
 * been used 1024 times more).
 */
var SLOT_BITS = 22,
  SLOT_MASK = (1 << SLOT_BITS) - 1,
  GEN_MASK = (1 << (32 - SLOT_BITS)) - 1;

export var MAX_RECORDS = 1 << SLOT_BITS;

export function slotOf(handle) {
  return handle & SLOT_MASK;
}

/**
 * Records as typed columns: Store({ x: Float64Array, kind: Uint8Array }, 64).
 * add() -> handle, remove(handle), alive(handle), slot(handle); the columns
 * are store.cols.<field>[slot]. The live slots are store.live[0..count), so a
 * loop over every record reads one array. Read count and the columns into
 * locals before the loop: re-read off the store every pass, they keep V8
 * from making the loop fast (4x slower, typed.bench.js).
 */
export function Store(fields, capacity) {
  capacity = Math.max(capacity || 64, 1);

  var names = Object.keys(fields),
    cols = {},
    //the columns as a list too, so add() does not look them up by name
    columns = [],
    gens = new Uint16Array(capacity),
    //where each slot is in live, -1 when free
    where = new Int32Array(capacity).fill(-1),
    live = new Uint32Array(capacity),
    free = new Uint32Array(capacity),
    freeCount = 0,
    used = 0;

  names.forEach(function (name) {
    cols[name] = new fields[name](capacity);
    columns.push(cols[name]);
  });

  var store = {
    cols: cols,
    live: live,
    count: 0,
    get capacity() {
      return capacity;
    },

    add: function () {
      var slot;

      if (freeCount > 0) slot = free[--freeCount];
      else {
        if (used >= MAX_RECORDS) throw new Error("Store: full");
        if (used === capacity) enlarge(capacity * 2);
        slot = used++;
      }

      where[slot] = store.count;
      live[store.count++] = slot;

      for (var i = 0; i < columns.length; i++) columns[i][slot] = 0;

      return ((gens[slot] << SLOT_BITS) | slot) >>> 0;
    },

    alive: alive,

    //the slot of a live handle, -1 for one gone
    slot: function (handle) {
      return alive(handle) ? handle & SLOT_MASK : -1;
    },

    //the handle of what is in a live slot now
    handle: function (slot) {
      return ((gens[slot] << SLOT_BITS) | slot) >>> 0;
    },

    remove: function (handle) {
      if (!alive(handle)) return false;

      var slot = handle & SLOT_MASK,
        at = where[slot],
        last = live[--store.count];

      live[at] = last;
      where[last] = at;
      where[slot] = -1;
      gens[slot] = (gens[slot] + 1) & GEN_MASK;
      free[freeCount++] = slot;

      return true;
    },

    clear: function () {
      for (var i = 0; i < store.count; i++) {
        var slot = live[i];

        where[slot] = -1;
        gens[slot] = (gens[slot] + 1) & GEN_MASK;
        free[freeCount++] = slot;
      }

      store.count = 0;
    },
  };

  function alive(handle) {
    var slot = handle & SLOT_MASK;

    return (
      slot < used && where[slot] >= 0 && gens[slot] === handle >>> SLOT_BITS
    );
  }

  function enlarge(n) {
    n = Math.min(n, MAX_RECORDS);
    names.forEach(function (name, i) {
      cols[name] = columns[i] = grow(cols[name], n);
    });
    gens = grow(gens, n);

    var w = new Int32Array(n).fill(-1);

    w.set(where);
    where = w;
    live = store.live = grow(live, n);
    free = grow(free, n);
    capacity = n;
  }

  return store;
}

/**
 * Numbers and a count: push, removeAt (the last one moved into its place),
 * indexOf. list.items[0..count).
 */
export function List(Type, capacity) {
  var list = {
    items: new (Type || Uint32Array)(Math.max(capacity || 16, 1)),
    count: 0,

    push: function (v) {
      if (list.count === list.items.length)
        list.items = grow(list.items, list.count + 1);
      list.items[list.count++] = v;

      return list.count - 1;
    },

    removeAt: function (i) {
      var v = list.items[i];

      list.items[i] = list.items[--list.count];

      return v;
    },

    indexOf: function (v) {
      for (var i = 0; i < list.count; i++) if (list.items[i] === v) return i;

      return -1;
    },

    remove: function (v) {
      var i = list.indexOf(v);

      if (i < 0) return false;
      list.removeAt(i);

      return true;
    },

    clear: function () {
      list.count = 0;
    },
  };

  return list;
}

/**
 * A min-heap of (key, value): the soonest of times running out first.
 * push(key, value), peekKey(), peekValue(), pop() -> value, size.
 */
export function Heap(capacity) {
  var keys = new Float64Array(Math.max(capacity || 16, 1)),
    values = new Float64Array(keys.length),
    n = 0;

  function up(i) {
    var k = keys[i],
      v = values[i];

    while (i > 0) {
      var p = (i - 1) >> 1;

      if (keys[p] <= k) break;
      keys[i] = keys[p];
      values[i] = values[p];
      i = p;
    }
    keys[i] = k;
    values[i] = v;
  }

  function down(i) {
    var k = keys[i],
      v = values[i],
      half = n >> 1;

    while (i < half) {
      var c = 2 * i + 1;

      if (c + 1 < n && keys[c + 1] < keys[c]) c++;
      if (keys[c] >= k) break;
      keys[i] = keys[c];
      values[i] = values[c];
      i = c;
    }
    keys[i] = k;
    values[i] = v;
  }

  return {
    get size() {
      return n;
    },

    push: function (key, value) {
      if (n === keys.length) {
        keys = grow(keys, n + 1);
        values = grow(values, n + 1);
      }
      keys[n] = key;
      values[n] = value;
      up(n++);
    },

    peekKey: function () {
      return n ? keys[0] : Infinity;
    },

    peekValue: function () {
      return n ? values[0] : -1;
    },

    pop: function () {
      if (!n) return -1;

      var v = values[0];

      if (--n > 0) {
        keys[0] = keys[n];
        values[0] = values[n];
        down(0);
      }

      return v;
    },

    clear: function () {
      n = 0;
    },
  };
}

/**
 * A set of bits, grown on set: set, unset, has, clear, count.
 */
export function BitSet(capacity) {
  var words = new Uint32Array(Math.max((capacity + 31) >>> 5, 1));

  var bits = {
    get words() {
      return words;
    },

    set: function (i) {
      var w = i >>> 5;

      if (w >= words.length) words = grow(words, w + 1);
      words[w] |= 1 << (i & 31);
    },

    unset: function (i) {
      var w = i >>> 5;

      if (w < words.length) words[w] &= ~(1 << (i & 31));
    },

    has: function (i) {
      var w = i >>> 5;

      return w < words.length && (words[w] & (1 << (i & 31))) !== 0;
    },

    clear: function () {
      words.fill(0);
    },

    count: function () {
      var c = 0;

      for (var i = 0; i < words.length; i++) {
        var v = words[i];

        v = v - ((v >>> 1) & 0x55555555);
        v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
        c += (Math.imul((v + (v >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24) | 0;
      }

      return c;
    },
  };

  return bits;
}

/*
 * NumMap: keys are whole numbers from 0 to 2^53 (a region's key, a handle),
 * values any number. Open addressing with linear probing, a deletion moving
 * back what came after it, so there are no tombstones.
 */
var EMPTY = -1;

function hash(key, mask) {
  var lo = key >>> 0,
    hi = (key / 4294967296) >>> 0,
    h = Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b);

  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h & mask;
}

export function NumMap(capacity) {
  var size = 16;

  while (size < (capacity || 8) * 2) size *= 2;

  var keys = new Float64Array(size).fill(EMPTY),
    values = new Float64Array(size),
    mask = size - 1,
    n = 0;

  function find(key) {
    var i = hash(key, mask);

    while (keys[i] !== EMPTY) {
      if (keys[i] === key) return i;
      i = (i + 1) & mask;
    }

    return -1 - i;
  }

  function rehash() {
    var oldKeys = keys,
      oldValues = values;

    size *= 2;
    mask = size - 1;
    keys = new Float64Array(size).fill(EMPTY);
    values = new Float64Array(size);

    for (var i = 0; i < oldKeys.length; i++) {
      if (oldKeys[i] === EMPTY) continue;

      var j = hash(oldKeys[i], mask);

      while (keys[j] !== EMPTY) j = (j + 1) & mask;
      keys[j] = oldKeys[i];
      values[j] = oldValues[i];
    }
  }

  var map = {
    get size() {
      return n;
    },

    has: function (key) {
      return find(key) >= 0;
    },

    get: function (key, missing) {
      var i = find(key);

      return i >= 0 ? values[i] : missing;
    },

    set: function (key, value) {
      var i = find(key);

      if (i >= 0) {
        values[i] = value;
        return;
      }

      if ((n + 1) * 2 > size) {
        rehash();
        i = find(key);
      }

      i = -1 - i;
      keys[i] = key;
      values[i] = value;
      n++;
    },

    delete: function (key) {
      var i = find(key);

      if (i < 0) return false;

      //move back whatever after it would no longer be found
      var j = i;

      for (;;) {
        j = (j + 1) & mask;
        if (keys[j] === EMPTY) break;

        var home = hash(keys[j], mask);

        //is home cyclically outside (i, j]? then j may move to i
        if (i <= j ? home <= i || home > j : home <= i && home > j) {
          keys[i] = keys[j];
          values[i] = values[j];
          i = j;
        }
      }

      keys[i] = EMPTY;
      n--;

      return true;
    },

    //f(key, value) for every entry, in no order
    forEach: function (f) {
      for (var i = 0; i < size; i++)
        if (keys[i] !== EMPTY) f(keys[i], values[i]);
    },

    clear: function () {
      keys.fill(EMPTY);
      n = 0;
    },
  };

  return map;
}

/**
 * A radix sort with its own scratch: RadixSort(capacity).sort(keys, values, n)
 * sorts keys[0..n) (Uint32Array) and values[0..n) alongside, ascending and
 * stable, in four passes of 8 bits. A pass where every key has the same byte
 * is skipped, so small keys cost fewer passes.
 */
export function RadixSort(capacity) {
  var counts = new Uint32Array(256 * 4),
    tmpKeys = new Uint32Array(Math.max(capacity || 0, 16)),
    tmpValues = new Uint32Array(tmpKeys.length);

  function sort(keys, values, n) {
    if (n > tmpKeys.length) {
      tmpKeys = new Uint32Array(Math.max(n, tmpKeys.length * 2));
      tmpValues = new Uint32Array(tmpKeys.length);
    }

    counts.fill(0);

    for (var i = 0; i < n; i++) {
      var k = keys[i];

      counts[k & 255]++;
      counts[256 + ((k >>> 8) & 255)]++;
      counts[512 + ((k >>> 16) & 255)]++;
      counts[768 + (k >>> 24)]++;
    }

    var srcK = keys,
      srcV = values,
      dstK = tmpKeys,
      dstV = tmpValues;

    for (var pass = 0; pass < 4; pass++) {
      var base = pass * 256,
        shift = pass * 8;

      //every key in one bucket: this byte sorts nothing
      if (n === 0 || counts[base + ((srcK[0] >>> shift) & 255)] === n) continue;

      var sum = 0;

      for (var b = 0; b < 256; b++) {
        var c = counts[base + b];

        counts[base + b] = sum;
        sum += c;
      }

      for (i = 0; i < n; i++) {
        var key = srcK[i],
          at = counts[base + ((key >>> shift) & 255)]++;

        dstK[at] = key;
        dstV[at] = srcV[i];
      }

      var t = srcK;

      srcK = dstK;
      dstK = t;
      t = srcV;
      srcV = dstV;
      dstV = t;
    }

    if (srcK !== keys) {
      keys.set(srcK.subarray(0, n));
      values.set(srcV.subarray(0, n));
    }
  }

  return { sort: sort };
}

/*
 * Ring: a queue of numbers, first in first out, of a fixed size (a power of
 * two). Its head and tail are counts kept in the buffer itself and read and
 * written with Atomics, so one thread may push while another shifts when
 * the buffer is a SharedArrayBuffer; on a plain ArrayBuffer it is the same.
 * The buffer: two Int32 counts, 8 bytes, then the numbers.
 */
var RING_HEAD = 0,
  RING_TAIL = 1;

/**
 * Ring(capacity, Type, shared) - a new ring of Type (Float64Array) on a
 * SharedArrayBuffer when shared; Ring.on(buffer, Type) - the same ring seen
 * from another thread. push(v) -> false when full; shift() -> the oldest,
 * undefined when empty; write(src, n) and read(dst, max) for a batch at a
 * time; size; buffer, to hand to a worker.
 */
export function Ring(capacity, Type, shared) {
  Type = Type || Float64Array;

  var n = 1;

  while (n < capacity) n *= 2;

  var bytes = 8 + n * Type.BYTES_PER_ELEMENT,
    buffer = shared ? new SharedArrayBuffer(bytes) : new ArrayBuffer(bytes);

  return Ring.on(buffer, Type);
}

Ring.on = function (buffer, Type) {
  Type = Type || Float64Array;

  var counts = new Int32Array(buffer, 0, 2),
    items = new Type(buffer, 8),
    n = items.length,
    mask = n - 1;

  if (n & mask) throw new Error("Ring: the capacity must be a power of two");

  var ring = {
    buffer: buffer,
    capacity: n,

    get size() {
      return (
        (Atomics.load(counts, RING_TAIL) - Atomics.load(counts, RING_HEAD)) >>>
        0
      );
    },

    push: function (v) {
      var tail = Atomics.load(counts, RING_TAIL);

      if ((tail - Atomics.load(counts, RING_HEAD)) >>> 0 >= n) return false;
      items[tail & mask] = v;
      //the number written before the count that says it is there
      Atomics.store(counts, RING_TAIL, (tail + 1) | 0);

      return true;
    },

    shift: function () {
      var head = Atomics.load(counts, RING_HEAD);

      if (head === Atomics.load(counts, RING_TAIL)) return undefined;

      var v = items[head & mask];

      Atomics.store(counts, RING_HEAD, (head + 1) | 0);

      return v;
    },

    //as many of src[0..count) as there is room for, one count written for
    //them all; how many went in
    write: function (src, count) {
      var tail = Atomics.load(counts, RING_TAIL),
        room = n - ((tail - Atomics.load(counts, RING_HEAD)) >>> 0),
        k = Math.min(count, room);

      for (var i = 0; i < k; i++) items[(tail + i) & mask] = src[i];
      Atomics.store(counts, RING_TAIL, (tail + k) | 0);

      return k;
    },

    //up to max of the oldest into dst, one count written for them all; how
    //many came out
    read: function (dst, max) {
      var head = Atomics.load(counts, RING_HEAD),
        k = Math.min(max, (Atomics.load(counts, RING_TAIL) - head) >>> 0);

      for (var i = 0; i < k; i++) dst[i] = items[(head + i) & mask];
      Atomics.store(counts, RING_HEAD, (head + k) | 0);

      return k;
    },

    //only while nobody pushes or shifts
    clear: function () {
      Atomics.store(counts, RING_HEAD, 0);
      Atomics.store(counts, RING_TAIL, 0);
    },
  };

  return ring;
};
