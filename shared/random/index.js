/**
 * Seeded random numbers (mulberry32): the same seed, the same numbers.
 * fork(salt) gives a stream of its own, so drawing from one never shifts
 * another. toss(...) is a chance from where and when, not from a stream: the
 * same whatever order things are worked out in. Not for anything secret.
 */
export default function Random(seed) {
  var state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;

    var t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var random = {
    next: next,

    int: function (lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },

    range: function (lo, hi) {
      return lo + next() * (hi - lo);
    },

    chance: function (p) {
      return next() < p;
    },

    pick: function (list) {
      return list[Math.floor(next() * list.length)];
    },

    weighted: function (weights) {
      var total = 0,
        k;

      for (k in weights) total += Math.max(0, weights[k]);

      var r = next() * total;

      for (k in weights) {
        r -= Math.max(0, weights[k]);
        if (r < 0) return k;
      }

      return k;
    },

    shuffle: function (list) {
      for (var i = list.length - 1; i > 0; i--) {
        var j = Math.floor(next() * (i + 1)),
          t = list[i];

        list[i] = list[j];
        list[j] = t;
      }

      return list;
    },

    fork: function (salt) {
      return Random(Math.imul(state ^ (salt * 0x9e3779b1), 0x85ebca6b));
    },
  };

  return random;
}

/*
 * A word mixed into a hash (murmur3's), and the hash finished: every bit of
 * the result hangs on every bit put in.
 */
function mix(h, k) {
  k = Math.imul(k, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);

  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function finish(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;

  return h >>> 0;
}

var TWO32 = 4294967296;

/**
 * toss(seed, region, record, step) -> [0, 1): a chance that does not depend
 * on the order things are worked out in, nor on what was drawn before - the
 * same four numbers give the same toss on every machine, in any thread, at
 * any time. Each is a whole number from 0 to 2^53 (a region's key, a
 * handle, a step count); `salt` tells apart tosses of the same moment for
 * different things (0 by default).
 */
export function toss(seed, region, record, step, salt) {
  var h = seed >>> 0;

  h = mix(h, region >>> 0);
  h = mix(h, (region / TWO32) >>> 0);
  h = mix(h, record >>> 0);
  h = mix(h, (record / TWO32) >>> 0);
  h = mix(h, step >>> 0);
  h = mix(h, (step / TWO32) >>> 0);
  h = mix(h, (salt || 0) >>> 0);

  return finish(h ^ 28) / TWO32;
}
