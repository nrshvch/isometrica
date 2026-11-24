/**
 * Who is looking where, and so how fully each region is worked out: every
 * observer is a box, with rings round it; a region's level is the highest
 * any observer's rings give it. It goes up at once and down only after a
 * while, and a ring is entered at one distance and left only further out,
 * so going to and fro over a line changes nothing. An update costs what is
 * near the observers, never the whole world. The design is
 * engine/docs/world.md, Observers, rings and tiers.
 *
 *   var interest = Interest(partition, { rings, hold, keepAlive });
 *   var camera = interest.observer();
 *   interest.look(camera, minX, minZ, maxX, maxZ);   //once a frame
 *   var n = interest.update(nowMs);   //changes: interest.changes.key/from/to
 */
import { Heap, List, NumMap, Store } from "../typed/index.js";

export var UNLOADED = 0,
  KEEP = 1,
  COARSE = 2,
  NEAR = 3,
  VIEW = 4,
  LEVELS = 5;

/*
 * partition: { within(minX, minZ, maxX, maxZ, out) -> n, bounds(key, out) }
 * - shared/spatial's Grid as it is, a Quadtree with its level bound in.
 * options:
 * - rings: { view, near, coarse }, each { enter, leave } in world units from
 *   the observer's box (leave >= enter): how far out a region is in it;
 * - hold: ms a region waits before going down from COARSE or above (2000);
 * - keepAlive: ms it is kept, not simulated, before it is let go (30000).
 */
export function Interest(partition, options) {
  options = options || {};

  var rings = options.rings || {},
    enter = new Float64Array(LEVELS),
    leave = new Float64Array(LEVELS),
    hold = options.hold === undefined ? 2000 : options.hold,
    keepAlive = options.keepAlive === undefined ? 30000 : options.keepAlive;

  [
    [VIEW, rings.view || { enter: 0, leave: 0 }],
    [NEAR, rings.near || { enter: 0, leave: 0 }],
    [COARSE, rings.coarse || { enter: 0, leave: 0 }],
  ].forEach(function (r) {
    enter[r[0]] = r[1].enter;
    leave[r[0]] = Math.max(r[1].leave, r[1].enter);
  });

  //beyond this from every observer, nothing is above KEEP; asked for a hair
  //wider, since a cell is half-open: one whose open edge is at the reach is
  //at the reach, and in the ring, but not within a box that stops there
  var reach = Math.max(leave[VIEW], leave[NEAR], leave[COARSE]);

  reach += 1e-6 * (1 + reach);

  var regions = Store(
      {
        key: Float64Array,
        level: Uint8Array,
        //when it first wanted to go down, -1 when it does not
        since: Float64Array,
        //when its going down falls due, while out of every observer's reach
        due: Float64Array,
        //the update it was last looked at in
        mark: Uint32Array,
      },
      256,
    ),
    byKey = NumMap(256),
    stamp = 0,
    seen = List(Uint32Array, 256),
    seenBefore = List(Uint32Array, 256),
    timers = Heap(64),
    again = List(Uint32Array, 64),
    keys = new Float64Array(1024),
    box = new Float64Array(4),
    observers = {
      count: 0,
      on: new Uint8Array(4),
      box: new Float64Array(16),
    };

  var changes = {
    count: 0,
    key: new Float64Array(64),
    from: new Uint8Array(64),
    to: new Uint8Array(64),
  };

  function changed(key, from, to) {
    var i = changes.count++;

    if (i === changes.key.length) {
      var n = i * 2,
        k = new Float64Array(n),
        f = new Uint8Array(n),
        t = new Uint8Array(n);

      k.set(changes.key);
      f.set(changes.from);
      t.set(changes.to);
      changes.key = k;
      changes.from = f;
      changes.to = t;
    }

    changes.key[i] = key;
    changes.from[i] = from;
    changes.to[i] = to;
  }

  //the level the observers give a region at level `level` now
  function wanted(key, level) {
    partition.bounds(key, box);

    var best = UNLOADED,
      b = observers.box;

    for (var o = 0; o < observers.count; o++) {
      if (!observers.on[o]) continue;

      var p = o * 4,
        dx = Math.max(box[0] - b[p + 2], b[p] - box[2], 0),
        dz = Math.max(box[1] - b[p + 3], b[p + 1] - box[3], 0),
        d = Math.max(dx, dz);

      for (var r = VIEW; r > best; r--)
        if (d <= (level >= r ? leave[r] : enter[r])) {
          best = r;
          break;
        }
    }

    return best;
  }

  /*
   * A region's level moved towards what it is wanted at: up at once; down
   * after `hold`, to KEEP at the lowest; from KEEP to gone after
   * `keepAlive`. Returns whether it is still there.
   */
  function settle(h, desired, t) {
    var slot = regions.slot(h),
      cols = regions.cols,
      key = cols.key[slot],
      level = cols.level[slot];

    if (desired >= level) {
      if (desired > level) {
        cols.level[slot] = desired;
        changed(key, level, desired);
      }
      cols.since[slot] = -1;

      return true;
    }

    if (cols.since[slot] < 0) cols.since[slot] = t;
    if (t - cols.since[slot] < (level > KEEP ? hold : keepAlive)) return true;

    if (level > KEEP) {
      var to = Math.max(desired, KEEP);

      cols.level[slot] = to;
      cols.since[slot] = to > desired ? t : -1;
      changed(key, level, to);

      return true;
    }

    changed(key, KEEP, UNLOADED);
    byKey.delete(key);
    regions.remove(h);

    return false;
  }

  function visit(key, t) {
    var h = byKey.get(key, -1);

    if (h >= 0 && regions.cols.mark[regions.slot(h)] === stamp) return;

    var desired = wanted(key, h >= 0 ? regions.cols.level[regions.slot(h)] : 0);

    if (h < 0) {
      if (desired === UNLOADED) return;

      h = regions.add();

      var slot = regions.slot(h);

      regions.cols.key[slot] = key;
      regions.cols.since[slot] = -1;
      byKey.set(key, h);
    }

    regions.cols.mark[regions.slot(h)] = stamp;
    if (settle(h, desired, t)) seen.push(h);
  }

  var interest = {
    changes: changes,
    regions: regions,

    get count() {
      return regions.count;
    },

    //a new observer's number; it sees nothing until it looks
    observer: function () {
      var o = observers.count++;

      if (o * 4 >= observers.box.length) {
        var b = new Float64Array(observers.box.length * 2),
          on = new Uint8Array(observers.on.length * 2);

        b.set(observers.box);
        on.set(observers.on);
        observers.box = b;
        observers.on = on;
      }

      return o;
    },

    look: function (o, minX, minZ, maxX, maxZ) {
      var p = o * 4;

      observers.box[p] = minX;
      observers.box[p + 1] = minZ;
      observers.box[p + 2] = maxX;
      observers.box[p + 3] = maxZ;
      observers.on[o] = 1;
    },

    //an observer gone: what it kept goes down in time, as if it had left
    forget: function (o) {
      observers.on[o] = 0;
    },

    levelOf: function (key) {
      var h = byKey.get(key, -1);

      return h < 0 ? UNLOADED : regions.cols.level[regions.slot(h)];
    },

    /*
     * Once a frame, after the observers have looked: the levels worked out
     * again at time t (ms). What changed is in changes[0..count); how many.
     */
    update: function (t) {
      var b = observers.box,
        i,
        h,
        slot;

      changes.count = 0;
      stamp = (stamp + 1) >>> 0 || 1;

      var swap = seenBefore;

      seenBefore = seen;
      seen = swap;
      seen.clear();

      //what is within reach of an observer: looked at, every one
      for (var o = 0; o < observers.count; o++) {
        if (!observers.on[o]) continue;

        var p = o * 4,
          n = partition.within(
            b[p] - reach,
            b[p + 1] - reach,
            b[p + 2] + reach,
            b[p + 3] + reach,
            keys,
          );

        if (n > keys.length) {
          keys = new Float64Array(n * 2);
          n = partition.within(
            b[p] - reach,
            b[p + 1] - reach,
            b[p + 2] + reach,
            b[p + 3] + reach,
            keys,
          );
        }

        for (i = 0; i < n; i++) visit(keys[i], t);
      }

      //what was within reach and is not now: timed, not looked at again
      var before = seenBefore.items;

      for (i = 0; i < seenBefore.count; i++) {
        h = before[i];
        slot = regions.slot(h);
        if (slot < 0 || regions.cols.mark[slot] === stamp) continue;

        var cols = regions.cols;

        if (cols.since[slot] < 0) cols.since[slot] = t;
        cols.due[slot] =
          cols.since[slot] + (cols.level[slot] > KEEP ? hold : keepAlive);
        timers.push(cols.due[slot], h);
      }

      //and those whose time has come
      while (timers.size && timers.peekKey() <= t) {
        var due = timers.peekKey();

        h = timers.pop();
        slot = regions.slot(h);

        //gone, back within reach, or timed again since
        if (
          slot < 0 ||
          regions.cols.mark[slot] === stamp ||
          regions.cols.due[slot] !== due
        )
          continue;

        //down to KEEP: timed again, from the next update on - a region goes
        //down one step an update, as one looked at does
        if (settle(h, UNLOADED, t)) again.push(h);
      }

      for (i = 0; i < again.count; i++) {
        h = again.items[i];
        slot = regions.slot(h);
        regions.cols.due[slot] = regions.cols.since[slot] + keepAlive;
        timers.push(regions.cols.due[slot], h);
      }
      again.clear();

      return changes.count;
    },
  };

  return interest;
}
