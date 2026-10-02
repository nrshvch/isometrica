/**
 * The firms whose colours turn up all over town - on the shops, the
 * superstores' bands and pole signs, the billboards up on the offices, the
 * sides of the delivery trucks and vans - so that the same few are seen
 * again and again, the way they are in a real town:
 *
 *   - bolt, the builders' merchant: orange and charcoal, hazard stripes;
 *   - orchard, the grocer: green and yellow, stripes leaning forward and a
 *     round fruit;
 *   - pillar, the bank: navy and gold, three columns on a step;
 *   - blaze, the burger bar: red and yellow, a round bun with its filling;
 *   - amber, the brewery: amber and cream, the sun going down over the sea.
 *
 * No firm has a name painted anywhere: letters a pixel or two high read as
 * nothing but noise. What says whose a sign is, is its colours and its
 * emblem - a pattern or a plain picture that reads at a few pixels across.
 *
 * A brand's panel(w, h) is a picture w cells across and h up, a colour for
 * every cell from the bottom left: the emblem on the brand's colour where
 * there is room for it, and on a band too low for one (h under 4), a
 * pattern of the brand's along it.
 */

var WHITE = [246, 246, 242];

function disc(i, j, cx, cy, r) {
  var dx = i + 0.5 - cx,
    dy = j + 0.5 - cy;

  return dx * dx + dy * dy < r * r;
}

export var BRANDS = {
  bolt: {
    kind: "builders",
    main: [238, 118, 34],
    accent: [46, 48, 54],
    light: WHITE,
    emblem: function (i, j, w, h) {
      return Math.floor((i + j) / 2) % 2 ? this.accent : this.main;
    },
    band: function (i, j) {
      return Math.floor((i + j) / 2) % 2 ? this.accent : this.main;
    },
  },

  orchard: {
    kind: "grocer",
    main: [40, 136, 72],
    accent: [250, 204, 56],
    light: WHITE,
    emblem: function (i, j, w, h) {
      var r = h * 0.38,
        cx = w - h / 2;

      //the fruit, and its leaf over it
      if (disc(i, j, cx, h * 0.45, r)) return this.accent;
      if (j === Math.floor(h * 0.45 + r) && i === Math.floor(cx)) return WHITE;

      //three stripes leaning forward, before it
      var k = i - j - 1;

      if (i >= 1 && i < cx - r - 1 && j > 0 && j < h - 1 && k >= 0 && k < 9)
        return k % 3 === 2 ? this.main : WHITE;

      return this.main;
    },
    band: function (i, j) {
      return (i - j) % 4 === 0 ? WHITE : i % 8 === 6 ? this.accent : this.main;
    },
  },

  pillar: {
    kind: "bank",
    main: [30, 58, 120],
    accent: [226, 186, 80],
    light: [236, 236, 230],
    emblem: function (i, j, w, h) {
      //three columns on a step under a pediment, in the middle
      var cw = Math.min(w - 2, 7),
        x0 = Math.floor((w - cw) / 2),
        x = i - x0;

      if (x < 0 || x >= cw) return this.main;
      if (j === 0 || j === h - 1) return this.accent;
      if (j === h - 2) return x > 0 && x < cw - 1 ? this.accent : this.main;

      return x % 3 === 0 ? this.accent : this.main;
    },
    band: function (i, j) {
      return i % 6 === 2 ? this.accent : this.main;
    },
  },

  blaze: {
    kind: "burgers",
    main: [208, 40, 40],
    accent: [252, 202, 44],
    light: WHITE,
    emblem: function (i, j, w, h) {
      var cy = h / 2,
        r = h * 0.42,
        cx = w / 2;

      //the bun, the filling through the middle of it
      if (disc(i, j, cx, cy, r))
        return j === Math.floor(cy) - (h % 2 ? 0 : 1)
          ? [116, 52, 34]
          : this.accent;

      //lines either side of it, as if it came at speed
      if (j === Math.floor(cy) && (i < cx - r - 1 || i > cx + r) && i % 2 === 0)
        return this.accent;

      return this.main;
    },
    band: function (i, j) {
      return i % 4 === 1 ? this.accent : this.main;
    },
  },

  amber: {
    kind: "brewery",
    main: [218, 142, 38],
    accent: [248, 232, 196],
    light: [248, 232, 196],
    dark: [104, 58, 32],
    emblem: function (i, j, w, h) {
      var hz = Math.max(1, Math.floor(h * 0.4)),
        cx = w / 2;

      //the sun on the horizon, and the sea under it, its light on the water
      if (j >= hz)
        return disc(i, j, cx, hz, h * 0.42) ? this.accent : this.main;
      if (Math.abs(i + 0.5 - cx) < (j + 1) * 0.8 && (j + i) % 2 === 0)
        return this.accent;

      return j % 2 ? this.dark : [160, 88, 34];
    },
    band: function (i, j) {
      return j === 0 ? this.dark : i % 6 === 3 ? this.accent : this.main;
    },
  },
};

export var NAMES = Object.keys(BRANDS);

/**
 * A brand's picture w cells across and h up, as a function of a cell from
 * the bottom left: its emblem, or along a band too low for one, its pattern.
 */
export function panel(name, w, h) {
  var b = BRANDS[name];

  if (b === undefined) throw new Error("no such brand: " + name);

  return function (i, j) {
    return h < 4 ? b.band(i, j, w, h) : b.emblem(i, j, w, h);
  };
}

/**
 * Every brand side by side, each its own stretch of a picture w cells
 * across and h up - for a shopping centre's sign, which has them all in.
 */
export function parade(w, h) {
  var n = NAMES.length,
    each = Math.floor(w / n);

  return function (i, j) {
    var k = Math.min(n - 1, Math.floor(i / each)),
      b = BRANDS[NAMES[k]];

    //a cell of the band's own between them
    if (i - k * each === each - 1 && k < n - 1) return WHITE;

    return h < 4
      ? b.band(i - k * each, j, each - 1, h)
      : b.emblem(i - k * each, j, each - 1, h);
  };
}
