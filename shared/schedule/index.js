/**
 * When things are worked out: a fixed-step clock, and a scheduler of
 * systems over regions by tier - full regions every step, coarse ones a few
 * times a second, nearest first, within a budget a frame; dormant ones not
 * at all. What each system takes is counted by tier. The design is
 * engine/docs/world.md, Tiers and the scheduler.
 *
 *   var clock = Clock(1000 / 30), s = Scheduler({ period: 250, budget: 2 });
 *   s.system("traffic", function (region, dt, tier) { ... });
 *   s.set(regionKey, COARSE, distance);
 *   for (var n = clock.advance(frameMs); n > 0; n--) s.full(clock.step);
 *   s.coarse(nowMs);   //then draw, in between by clock.alpha
 */
import { NumMap, RadixSort, Store } from "../typed/index.js";

export var DORMANT = 0,
  COARSE = 1,
  FULL = 2,
  TIERS = 3;

/**
 * Clock(step, maxSteps): advance(dt) -> how many fixed steps to take now
 * (no more than maxSteps; the rest of a long pause is dropped), alpha -
 * how far between the last step and the next the frame is, for drawing.
 */
export function Clock(step, maxSteps) {
  maxSteps = maxSteps || 5;

  var clock = {
    step: step,
    time: 0,
    alpha: 0,
    pending: 0,

    advance: function (dt) {
      clock.pending += dt;

      //a hair over, so that sums of fractions of a step do not lose one
      var n = Math.floor(clock.pending / step + 1e-9);

      if (n > maxSteps) {
        clock.pending -= (n - maxSteps) * step;
        n = maxSteps;
      }

      clock.pending -= n * step;
      clock.time += n * step;
      if (clock.pending < 0) clock.pending = 0;
      clock.alpha = clock.pending / step;

      return n;
    },
  };

  return clock;
}

/*
 * Where a region's coarse turns fall within the period, from its key, so
 * that regions coming in together do not all fall due in one frame.
 */
function phase(key) {
  var h = Math.imul(
    (key >>> 0) ^ Math.imul((key / 4294967296) >>> 0, 0x9e3779b1),
    0x85ebca6b,
  );

  h ^= h >>> 15;

  return (h >>> 0) / 4294967296;
}

var PRIORITY_MAX = 0x7fffffff;

/**
 * Scheduler({ period, budget, late, now }):
 * - period: ms between a coarse region's turns (250);
 * - budget: ms a frame the coarse turns may take (2); one always runs;
 * - late: periods overdue after which a region goes before nearer ones (4);
 * - now(): ms, for the budget and the counts (performance.now).
 */
export function Scheduler(options) {
  options = options || {};

  var period = options.period || 250,
    budget = options.budget === undefined ? 2 : options.budget,
    late = (options.late || 4) * period,
    now =
      options.now ||
      function () {
        return performance.now();
      },
    systems = [],
    names = [],
    regions = Store(
      {
        key: Float64Array,
        tier: Uint8Array,
        priority: Uint32Array,
        last: Float64Array,
      },
      64,
    ),
    bySlot = NumMap(64),
    radix = RadixSort(64),
    order = new Uint32Array(64),
    slots = new Uint32Array(64);

  var stats = {
    names: names,
    //ms and turns, [system * TIERS + tier]
    time: new Float64Array(0),
    runs: new Float64Array(0),
    reset: function () {
      stats.time.fill(0);
      stats.runs.fill(0);
    },
  };

  //handles, not slots, are listed before a run: a region removed on the way
  //is skipped, not mistaken for whatever takes its slot
  function run(slot, dt, tier) {
    var key = regions.cols.key[slot];

    for (var i = 0; i < systems.length; i++) {
      var t0 = now();

      systems[i](key, dt, tier);
      stats.time[i * TIERS + tier] += now() - t0;
      stats.runs[i * TIERS + tier]++;
    }
  }

  var scheduler = {
    stats: stats,

    //a system's step(regionKey, dt, tier); its number, for its counts
    system: function (name, step) {
      systems.push(step);
      names.push(name);

      var time = new Float64Array(systems.length * TIERS),
        runs = new Float64Array(systems.length * TIERS);

      time.set(stats.time);
      runs.set(stats.runs);
      stats.time = time;
      stats.runs = runs;

      return systems.length - 1;
    },

    get count() {
      return regions.count;
    },

    tierOf: function (key) {
      var h = bySlot.get(key, -1);

      return h < 0 ? DORMANT : regions.cols.tier[regions.slot(h)];
    },

    /*
     * A region's tier and how near it is (a whole number, smaller first).
     * Coming in as coarse at time t, its first turn falls somewhere in the
     * next period, by its key. DORMANT takes it out.
     */
    set: function (key, tier, priority, t) {
      if (tier === DORMANT) {
        scheduler.remove(key);
        return;
      }

      var h = bySlot.get(key, -1),
        slot;

      if (h < 0) {
        h = regions.add();
        bySlot.set(key, h);
        slot = regions.slot(h);
        regions.cols.key[slot] = key;
        regions.cols.last[slot] = (t || 0) - phase(key) * period;
      } else slot = regions.slot(h);

      regions.cols.tier[slot] = tier;
      regions.cols.priority[slot] = Math.min(
        Math.max(priority | 0, 0),
        PRIORITY_MAX,
      );
    },

    remove: function (key) {
      var h = bySlot.get(key, -1);

      if (h < 0) return false;
      bySlot.delete(key);

      return regions.remove(h);
    },

    //every full region, every system, a step of dt
    full: function (dt) {
      var live = regions.live,
        tier = regions.cols.tier,
        n = 0;

      //the list first: a system may set or remove regions as it goes
      if (slots.length < regions.count)
        slots = new Uint32Array(regions.capacity);
      for (var i = 0, count = regions.count; i < count; i++)
        if (tier[live[i]] === FULL) slots[n++] = regions.handle(live[i]);

      for (i = 0; i < n; i++) {
        var slot = regions.slot(slots[i]);

        if (slot >= 0 && regions.cols.tier[slot] === FULL) run(slot, dt, FULL);
      }

      return n;
    },

    /*
     * The coarse regions due at time t, nearest first (the long overdue
     * before them), each stepped by the time since its last turn, until the
     * budget is spent. How many were run.
     */
    coarse: function (t) {
      var cols = regions.cols,
        live = regions.live,
        n = 0;

      if (order.length < regions.count) {
        order = new Uint32Array(regions.capacity);
        slots = new Uint32Array(regions.capacity);
      }

      for (var i = 0, count = regions.count; i < count; i++) {
        var slot = live[i],
          since = t - cols.last[slot];

        if (cols.tier[slot] !== COARSE || since < period) continue;

        order[n] =
          since >= late
            ? 0
            : 0x80000000 + Math.min(cols.priority[slot], PRIORITY_MAX);
        slots[n++] = regions.handle(slot);
      }

      radix.sort(order, slots, n);

      var start = now(),
        ran = 0;

      for (i = 0; i < n; i++) {
        if (ran > 0 && now() - start >= budget) break;

        slot = regions.slot(slots[i]);
        if (slot < 0 || cols.tier[slot] !== COARSE) continue;

        var dt = t - cols.last[slot];

        cols.last[slot] = t;
        run(slot, dt, COARSE);
        ran++;
      }

      return ran;
    },
  };

  return scheduler;
}
