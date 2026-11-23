/**
 * The generator's dice: a seeded random source (mulberry32), so that the same
 * seed makes the same city - in the game, where the seed goes over the page
 * reloading on it (ui/session), and in the tool that tries them
 * (tools/citytest.mjs).
 */

/**
 * @param seed {number} any 32-bit number
 * @returns {Random}
 */
export default function Random(seed) {
  var state = seed >>> 0;

  //a number in [0, 1)
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;

    var t = state;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  var random = {
    next: next,

    //a whole number in [lo, hi]
    int: function (lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },

    //a number in [lo, hi)
    range: function (lo, hi) {
      return lo + next() * (hi - lo);
    },

    //true one time in 1 / p
    chance: function (p) {
      return next() < p;
    },

    pick: function (list) {
      return list[Math.floor(next() * list.length)];
    },

    //one of the keys of weights, as likely as its weight
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

    //another source, of its own, for one part of the work - so that what one
    //part rolls does not shift what every part after it rolls
    fork: function (salt) {
      return Random(Math.imul(state ^ (salt * 0x9e3779b1), 0x85ebca6b));
    },
  };

  return random;
}
