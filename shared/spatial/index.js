/**
 * Space cut up: partitions that give every region a key that never changes
 * (a uniform grid, an implicit quadtree over x and z), and an index of points
 * that move (a hashed grid). Keys are whole numbers below 2^53, kept in typed
 * arrays, never strings. Boxes are four numbers, minX, minZ, maxX, maxZ,
 * edges included. The design is engine/docs/world.md, Space.
 */
import { NumMap, grow } from "../typed/index.js";

/*
 * Grid: a cell is floor(x / size), floor(z / size), each from -2^25 to
 * 2^25 - 1, packed into one key: (ix + 2^25) * 2^26 + (iz + 2^25).
 */
var HALF = 33554432, //2^25
  SPAN = 67108864; //2^26

export function Grid(size) {
  function key(ix, iz) {
    if (ix < -HALF || ix >= HALF || iz < -HALF || iz >= HALF) return -1;

    return (ix + HALF) * SPAN + (iz + HALF);
  }

  function cellX(k) {
    return Math.floor(k / SPAN) - HALF;
  }

  function cellZ(k) {
    return (k % SPAN) - HALF;
  }

  return {
    size: size,
    key: key,
    cellX: cellX,
    cellZ: cellZ,

    keyOf: function (x, z) {
      return key(Math.floor(x / size), Math.floor(z / size));
    },

    //out[0..4) = minX, minZ, maxX, maxZ
    bounds: function (k, out) {
      out[0] = cellX(k) * size;
      out[1] = cellZ(k) * size;
      out[2] = out[0] + size;
      out[3] = out[1] + size;

      return out;
    },

    //the keys of the cells the box touches, into out; how many there are
    within: function (minX, minZ, maxX, maxZ, out) {
      var x0 = Math.max(Math.floor(minX / size), -HALF),
        z0 = Math.max(Math.floor(minZ / size), -HALF),
        x1 = Math.min(Math.floor(maxX / size), HALF - 1),
        z1 = Math.min(Math.floor(maxZ / size), HALF - 1),
        n = 0;

      for (var ix = x0; ix <= x1; ix++)
        for (var iz = z0; iz <= z1; iz++) {
          if (n < out.length) out[n] = key(ix, iz);
          n++;
        }

      return n;
    },

    //the eight round a cell, into out; how many there are
    neighbours: function (k, out) {
      var cx = cellX(k),
        cz = cellZ(k),
        n = 0;

      for (var dx = -1; dx <= 1; dx++)
        for (var dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;

          var nk = key(cx + dx, cz + dz);

          if (nk >= 0) out[n++] = nk;
        }

      return n;
    },
  };
}

/*
 * Morton codes of two whole numbers below 2^24, as a number below 2^48:
 * the bits of x and z taken in turn, x's lowest first. Done 12 bits at a
 * time so the bit operations stay inside 32 bits.
 */
var LOW = 4096,
  LOW2 = 16777216; //2^24

function spread(v) {
  v &= 0xffff;
  v = (v | (v << 8)) & 0x00ff00ff;
  v = (v | (v << 4)) & 0x0f0f0f0f;
  v = (v | (v << 2)) & 0x33333333;
  v = (v | (v << 1)) & 0x55555555;

  return v;
}

function squeeze(v) {
  v &= 0x55555555;
  v = (v | (v >>> 1)) & 0x33333333;
  v = (v | (v >>> 2)) & 0x0f0f0f0f;
  v = (v | (v >>> 4)) & 0x00ff00ff;
  v = (v | (v >>> 8)) & 0x0000ffff;

  return v;
}

export function morton(x, z) {
  var lo = (spread(x & (LOW - 1)) | (spread(z & (LOW - 1)) << 1)) >>> 0,
    hi =
      (spread(Math.floor(x / LOW)) | (spread(Math.floor(z / LOW)) << 1)) >>> 0;

  return hi * LOW2 + lo;
}

export function mortonX(m) {
  return squeeze(Math.floor(m / LOW2)) * LOW + squeeze(m % LOW2);
}

export function mortonZ(m) {
  return squeeze(Math.floor(m / LOW2) >>> 1) * LOW + squeeze((m % LOW2) >>> 1);
}

/*
 * Quadtree: a fixed root square from (x, z), size across, cut in two each
 * way at every level, the same cuts always. A key is the node's Morton code
 * at its level, times 32, plus the level: the root is 0, and a level's
 * nodes are 2^level across. Levels go to 23 at most, so a key stays below
 * 2^53. Outside the root there is no key: -1.
 */
var LEVELS = 32,
  MAX_DEPTH = 23;

export function Quadtree(rootX, rootZ, rootSize, depth) {
  if (!(depth >= 0 && depth <= MAX_DEPTH))
    throw new Error("Quadtree: depth from 0 to " + MAX_DEPTH);

  function level(k) {
    return k % LEVELS;
  }

  function key(ix, iz, l) {
    var across = Math.pow(2, l);

    if (ix < 0 || iz < 0 || ix >= across || iz >= across) return -1;

    return morton(ix, iz) * LEVELS + l;
  }

  function cellX(k) {
    return mortonX(Math.floor(k / LEVELS));
  }

  function cellZ(k) {
    return mortonZ(Math.floor(k / LEVELS));
  }

  function sizeAt(l) {
    return rootSize / Math.pow(2, l);
  }

  return {
    depth: depth,
    level: level,
    key: key,
    cellX: cellX,
    cellZ: cellZ,
    sizeAt: sizeAt,

    keyOf: function (x, z, l) {
      if (l === undefined) l = depth;

      var s = sizeAt(l);

      return key(Math.floor((x - rootX) / s), Math.floor((z - rootZ) / s), l);
    },

    bounds: function (k, out) {
      var s = sizeAt(level(k));

      out[0] = rootX + cellX(k) * s;
      out[1] = rootZ + cellZ(k) * s;
      out[2] = out[0] + s;
      out[3] = out[1] + s;

      return out;
    },

    parent: function (k) {
      var l = level(k);

      if (l === 0) return -1;

      return Math.floor(k / LEVELS / 4) * LEVELS + (l - 1);
    },

    //the four under a node, into out; 0 at the deepest level
    children: function (k, out) {
      var l = level(k);

      if (l >= depth) return 0;

      var m = Math.floor(k / LEVELS) * 4;

      for (var i = 0; i < 4; i++) out[i] = (m + i) * LEVELS + l + 1;

      return 4;
    },

    //the keys at level l of the nodes the box touches, into out; how many
    within: function (minX, minZ, maxX, maxZ, l, out) {
      var s = sizeAt(l),
        last = Math.pow(2, l) - 1,
        x0 = Math.max(Math.floor((minX - rootX) / s), 0),
        z0 = Math.max(Math.floor((minZ - rootZ) / s), 0),
        x1 = Math.min(Math.floor((maxX - rootX) / s), last),
        z1 = Math.min(Math.floor((maxZ - rootZ) / s), last),
        n = 0;

      for (var ix = x0; ix <= x1; ix++)
        for (var iz = z0; iz <= z1; iz++) {
          if (n < out.length) out[n] = key(ix, iz, l);
          n++;
        }

      return n;
    },

    //the up to eight round a node at its level, into out; how many
    neighbours: function (k, out) {
      var l = level(k),
        cx = cellX(k),
        cz = cellZ(k),
        n = 0;

      for (var dx = -1; dx <= 1; dx++)
        for (var dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;

          var nk = key(cx + dx, cz + dz, l);

          if (nk >= 0) out[n++] = nk;
        }

      return n;
    },
  };
}

/**
 * An index of points that move, a hashed grid: GridIndex(cellSize).
 * set(id, x, z) puts in or moves id (a whole number, a store's slot),
 * remove(id), query(minX, minZ, maxX, maxZ, out) -> how many ids are in the
 * box, written into out as far as it goes. Never saved, never sent.
 */
export function GridIndex(cellSize, capacity) {
  var grid = Grid(cellSize),
    heads = NumMap(64),
    n = Math.max(capacity || 64, 1),
    xs = new Float64Array(n),
    zs = new Float64Array(n),
    cells = new Float64Array(n).fill(-1),
    next = new Int32Array(n).fill(-1),
    prev = new Int32Array(n).fill(-1),
    count = 0;

  function unlink(id) {
    var c = cells[id];

    if (prev[id] >= 0) next[prev[id]] = next[id];
    else if (next[id] >= 0) heads.set(c, next[id]);
    else heads.delete(c);

    if (next[id] >= 0) prev[next[id]] = prev[id];
    next[id] = prev[id] = -1;
  }

  function link(id, c) {
    var head = heads.get(c, -1);

    next[id] = head;
    prev[id] = -1;
    if (head >= 0) prev[head] = id;
    heads.set(c, id);
    cells[id] = c;
  }

  function ensure(id) {
    if (id < n) return;

    var m = Math.max(id + 1, n * 2);

    xs = grow(xs, m);
    zs = grow(zs, m);

    var c = new Float64Array(m).fill(-1);

    c.set(cells);
    cells = c;

    var nx = new Int32Array(m).fill(-1),
      pv = new Int32Array(m).fill(-1);

    nx.set(next);
    pv.set(prev);
    next = nx;
    prev = pv;
    n = m;
  }

  return {
    get size() {
      return count;
    },

    has: function (id) {
      return id < n && cells[id] >= 0;
    },

    set: function (id, x, z) {
      ensure(id);

      var c = grid.keyOf(x, z);

      xs[id] = x;
      zs[id] = z;

      if (cells[id] === c) return;
      if (cells[id] >= 0) unlink(id);
      else count++;
      link(id, c);
    },

    remove: function (id) {
      if (id >= n || cells[id] < 0) return false;

      unlink(id);
      cells[id] = -1;
      count--;

      return true;
    },

    query: function (minX, minZ, maxX, maxZ, out) {
      var x0 = Math.floor(minX / cellSize),
        z0 = Math.floor(minZ / cellSize),
        x1 = Math.floor(maxX / cellSize),
        z1 = Math.floor(maxZ / cellSize),
        found = 0;

      for (var ix = x0; ix <= x1; ix++)
        for (var iz = z0; iz <= z1; iz++) {
          var id = heads.get(grid.key(ix, iz), -1);

          for (; id >= 0; id = next[id]) {
            var x = xs[id],
              z = zs[id];

            if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
            if (found < out.length) out[found] = id;
            found++;
          }
        }

      return found;
    },
  };
}
