/**
 * Seeded random numbers (mulberry32): the same seed, the same numbers.
 * fork(salt) gives a stream of its own, so drawing from one never shifts
 * another. Not for anything secret.
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
