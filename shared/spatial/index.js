/**
 * Space cut up: partitions that give every region a key that never changes
 * (a uniform grid, an implicit quadtree over x and z), and indexes: of points
 * that move (a hashed grid), of boxes that stay put (a packed tree). Keys are whole numbers below 2^53, kept in typed
 * arrays, never strings. Boxes are four numbers, minX, minZ, maxX, maxZ,
 * edges included. The design is engine/docs/world.md, Space.
 */
import { NumMap, RadixSort, grow } from "../typed/index.js";

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

/*
 * The place along a Hilbert curve of a point on a 65536 x 65536 grid: points
 * near each other on the curve are near each other in space, so items sorted
 * by it fill the tree's nodes with neighbours.
 */
export function hilbert(x, y) {
  var a = x ^ y,
    b = 0xffff ^ a,
    c = 0xffff ^ (x | y),
    d = x & (y ^ 0xffff),
    A = a | (b >>> 1),
    B = (a >>> 1) ^ a,
    C = (c >>> 1) ^ (b & (d >>> 1)) ^ c,
    D = (a & (c >>> 1)) ^ (d >>> 1) ^ d;

  a = A;
  b = B;
  c = C;
  d = D;
  A = (a & (a >>> 2)) ^ (b & (b >>> 2));
  B = (a & (b >>> 2)) ^ (b & ((a ^ b) >>> 2));
  C ^= (a & (c >>> 2)) ^ (b & (d >>> 2));
  D ^= (b & (c >>> 2)) ^ ((a ^ b) & (d >>> 2));

  a = A;
  b = B;
  c = C;
  d = D;
  A = (a & (a >>> 4)) ^ (b & (b >>> 4));
  B = (a & (b >>> 4)) ^ (b & ((a ^ b) >>> 4));
  C ^= (a & (c >>> 4)) ^ (b & (d >>> 4));
  D ^= (b & (c >>> 4)) ^ ((a ^ b) & (d >>> 4));

  a = A;
  b = B;
  c = C;
  d = D;
  C ^= (a & (c >>> 8)) ^ (b & (d >>> 8));
  D ^= (b & (c >>> 8)) ^ ((a ^ b) & (d >>> 8));

  a = C ^ (C >>> 1);
  b = D ^ (D >>> 1);

  var i0 = x ^ y,
    i1 = b | (0xffff ^ (i0 | a));

  i0 = (i0 | (i0 << 8)) & 0x00ff00ff;
  i0 = (i0 | (i0 << 4)) & 0x0f0f0f0f;
  i0 = (i0 | (i0 << 2)) & 0x33333333;
  i0 = (i0 | (i0 << 1)) & 0x55555555;
  i1 = (i1 | (i1 << 8)) & 0x00ff00ff;
  i1 = (i1 | (i1 << 4)) & 0x0f0f0f0f;
  i1 = (i1 | (i1 << 2)) & 0x33333333;
  i1 = (i1 | (i1 << 1)) & 0x55555555;

  return ((i1 << 1) | i0) >>> 0;
}

/**
 * An index of boxes that stay put, packed into typed arrays: PackedTree(n),
 * add(minX, minZ, maxX, maxZ) n times (an item is its number in the order
 * added), finish(), then search(minX, minZ, maxX, maxZ, out) and around(x,
 * z, radius, out) -> how many, written into out as far as it goes. Built
 * again, not changed, when what is in it changes. A static R-tree: items
 * sorted along a Hilbert curve, nodeSize to a node, built from the leaves up.
 */
export function PackedTree(numItems, nodeSize) {
  nodeSize = Math.min(Math.max(nodeSize || 16, 2), 65535);

  var n = Math.max(numItems, 0),
    count = n,
    numNodes = n,
    levelBounds = [n * 4];

  do {
    count = Math.ceil(count / nodeSize);
    numNodes += count;
    levelBounds.push(numNodes * 4);
  } while (count > 1);

  var boxes = new Float64Array(numNodes * 4),
    indices = new Uint32Array(numNodes),
    added = 0,
    built = false,
    stack = new Uint32Array(levelBounds.length * nodeSize * 2 + 2),
    minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;

  var tree = {
    get size() {
      return n;
    },

    add: function (x0, z0, x1, z1) {
      if (added >= n) throw new Error("PackedTree: more added than said");

      var i = added++,
        p = i * 4;

      indices[i] = i;
      boxes[p] = x0;
      boxes[p + 1] = z0;
      boxes[p + 2] = x1;
      boxes[p + 3] = z1;
      if (x0 < minX) minX = x0;
      if (z0 < minZ) minZ = z0;
      if (x1 > maxX) maxX = x1;
      if (z1 > maxZ) maxZ = z1;

      return i;
    },

    finish: function () {
      if (added !== n)
        throw new Error("PackedTree: " + added + " of " + n + " added");
      built = true;
      if (n === 0) return tree;

      if (n <= nodeSize) {
        boxes[n * 4] = minX;
        boxes[n * 4 + 1] = minZ;
        boxes[n * 4 + 2] = maxX;
        boxes[n * 4 + 3] = maxZ;
        indices[n] = 0;

        return tree;
      }

      //the items sorted by where their middles fall on the curve
      var keys = new Uint32Array(n),
        order = new Uint32Array(n),
        w = maxX - minX || 1,
        h = maxZ - minZ || 1,
        i;

      for (i = 0; i < n; i++) {
        var p = i * 4;

        keys[i] = hilbert(
          Math.floor((65535 * ((boxes[p] + boxes[p + 2]) / 2 - minX)) / w),
          Math.floor((65535 * ((boxes[p + 1] + boxes[p + 3]) / 2 - minZ)) / h),
        );
        order[i] = i;
      }
      RadixSort(n).sort(keys, order, n);

      var sorted = new Float64Array(n * 4);

      for (i = 0; i < n; i++) {
        var from = order[i] * 4;

        sorted[i * 4] = boxes[from];
        sorted[i * 4 + 1] = boxes[from + 1];
        sorted[i * 4 + 2] = boxes[from + 2];
        sorted[i * 4 + 3] = boxes[from + 3];
        indices[i] = order[i];
      }
      boxes.set(sorted);

      //every level's nodes, each the box round nodeSize of the level below;
      //a node's index is where its first child is, in boxes
      for (var l = 0, pos = 0, at = n * 4; l < levelBounds.length - 1; l++) {
        var end = levelBounds[l];

        while (pos < end) {
          var first = pos,
            x0 = Infinity,
            z0 = Infinity,
            x1 = -Infinity,
            z1 = -Infinity;

          for (var k = 0; k < nodeSize && pos < end; k++, pos += 4) {
            if (boxes[pos] < x0) x0 = boxes[pos];
            if (boxes[pos + 1] < z0) z0 = boxes[pos + 1];
            if (boxes[pos + 2] > x1) x1 = boxes[pos + 2];
            if (boxes[pos + 3] > z1) z1 = boxes[pos + 3];
          }

          indices[at >> 2] = first;
          boxes[at++] = x0;
          boxes[at++] = z0;
          boxes[at++] = x1;
          boxes[at++] = z1;
        }
      }

      return tree;
    },

    search: function (x0, z0, x1, z1, out) {
      return walk(x0, z0, x1, z1, out, NaN, 0, 0);
    },

    //items whose box comes within radius of (x, z)
    around: function (x, z, radius, out) {
      return walk(
        x - radius,
        z - radius,
        x + radius,
        z + radius,
        out,
        radius * radius,
        x,
        z,
      );
    },
  };

  //how far (squared) a point is from a box: 0 inside it
  function distance2(p, x, z) {
    var dx =
        x < boxes[p] ? boxes[p] - x : x > boxes[p + 2] ? x - boxes[p + 2] : 0,
      dz =
        z < boxes[p + 1]
          ? boxes[p + 1] - z
          : z > boxes[p + 3]
            ? z - boxes[p + 3]
            : 0;

    return dx * dx + dz * dz;
  }

  function walk(x0, z0, x1, z1, out, r2, x, z) {
    if (!built) throw new Error("PackedTree: finish() first");
    if (n === 0) return 0;

    var found = 0,
      top = 0,
      root = boxes.length - 4,
      level = levelBounds.length - 1;

    var node = root;

    for (;;) {
      var start = indices[node >> 2],
        end = Math.min(start + nodeSize * 4, levelBounds[level - 1]);

      for (var pos = start; pos < end; pos += 4) {
        if (
          boxes[pos] > x1 ||
          boxes[pos + 1] > z1 ||
          boxes[pos + 2] < x0 ||
          boxes[pos + 3] < z0
        )
          continue;

        if (level - 1 === 0) {
          if (r2 === r2 && distance2(pos, x, z) > r2) continue;
          if (found < out.length) out[found] = indices[pos >> 2];
          found++;
        } else {
          stack[top++] = pos;
          stack[top++] = level - 1;
        }
      }

      if (top === 0) break;
      level = stack[--top];
      node = stack[--top];
    }

    return found;
  }

  return tree;
}
