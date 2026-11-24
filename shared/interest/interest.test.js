import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import { Grid } from "../spatial/index.js";
import { COARSE, Interest, KEEP, NEAR, UNLOADED, VIEW } from "./index.js";

var RINGS = {
  view: { enter: 0, leave: 5 },
  near: { enter: 20, leave: 30 },
  coarse: { enter: 50, leave: 70 },
};

function make(grid, hold, keepAlive) {
  return Interest(grid, { rings: RINGS, hold: hold, keepAlive: keepAlive });
}

//the changes of the last update, as [key, from, to] sorted by key
function changesOf(interest) {
  var c = interest.changes,
    out = [];

  for (var i = 0; i < c.count; i++) out.push([c.key[i], c.from[i], c.to[i]]);

  return out.sort(function (a, b) {
    return a[0] - b[0];
  });
}

/*
 * The plain way: every region of a bounded world looked at every update,
 * the same rules applied, nothing timed.
 */
function Plain(grid, hold, keepAlive, cells) {
  var level = new Map(),
    since = new Map(),
    box = new Float64Array(4),
    keys = [];

  for (var ix = -cells; ix < cells; ix++)
    for (var iz = -cells; iz < cells; iz++) keys.push(grid.key(ix, iz));

  function wanted(key, observers) {
    grid.bounds(key, box);

    var best = UNLOADED,
      l = level.get(key) || 0;

    observers.forEach(function (b) {
      if (!b) return;

      var d = Math.max(
        Math.max(box[0] - b[2], b[0] - box[2], 0),
        Math.max(box[1] - b[3], b[1] - box[3], 0),
      );

      [
        [VIEW, RINGS.view],
        [NEAR, RINGS.near],
        [COARSE, RINGS.coarse],
      ].forEach(function (r) {
        if (r[0] > best && d <= (l >= r[0] ? r[1].leave : r[1].enter))
          best = r[0];
      });
    });

    return best;
  }

  return {
    levelOf: function (key) {
      return level.get(key) || 0;
    },

    update: function (t, observers) {
      var out = [];

      keys.forEach(function (key) {
        var l = level.get(key) || 0,
          desired = wanted(key, observers);

        if (desired >= l) {
          if (desired > l) {
            level.set(key, desired);
            out.push([key, l, desired]);
          }
          since.set(key, -1);
          return;
        }

        if (since.get(key) < 0) since.set(key, t);
        if (t - since.get(key) < (l > KEEP ? hold : keepAlive)) return;

        if (l > KEEP) {
          var to = Math.max(desired, KEEP);

          level.set(key, to);
          since.set(key, to > desired ? t : -1);
          out.push([key, l, to]);
        } else {
          level.delete(key);
          since.delete(key);
          out.push([key, KEEP, UNLOADED]);
        }
      });

      return out.sort(function (a, b) {
        return a[0] - b[0];
      });
    },
  };
}

describe("Interest", function () {
  var grid = Grid(10);

  it("brings what is in sight to VIEW at once, and rings round it lower", function () {
    var interest = make(grid, 1000, 5000),
      camera = interest.observer();

    interest.look(camera, 0, 0, 10, 10);
    interest.update(0);

    expect(interest.levelOf(grid.keyOf(5, 5))).toBe(VIEW);
    expect(interest.levelOf(grid.keyOf(25, 5))).toBe(NEAR);
    expect(interest.levelOf(grid.keyOf(55, 5))).toBe(COARSE);
    expect(interest.levelOf(grid.keyOf(95, 5))).toBe(UNLOADED);
    expect(interest.changes.count).toBe(interest.count);
  });

  it("changes nothing going to and fro over a line", function () {
    var interest = make(grid, 0, 0),
      camera = interest.observer();

    interest.look(camera, 0, 0, 10, 10);
    interest.update(0);

    for (var i = 1; i < 50; i++) {
      var dx = i & 1 ? 4.5 : 0;

      interest.look(camera, dx, 0, 10 + dx, 10);
      expect(interest.update(i * 100)).toBe(0);
    }
  });

  it("goes down only after hold, through KEEP, and is let go of after keepAlive", function () {
    var interest = make(grid, 1000, 5000),
      camera = interest.observer(),
      key = grid.keyOf(5, 5);

    interest.look(camera, 0, 0, 10, 10);
    interest.update(0);

    //far away: out of every ring, and out of reach
    interest.look(camera, 10000, 0, 10010, 10);
    interest.update(100);
    expect(interest.levelOf(key)).toBe(VIEW);
    interest.update(1099);
    expect(interest.levelOf(key)).toBe(VIEW);
    interest.update(1100);
    expect(interest.levelOf(key)).toBe(KEEP);
    interest.update(6099);
    expect(interest.levelOf(key)).toBe(KEEP);
    interest.update(6100);
    expect(interest.levelOf(key)).toBe(UNLOADED);
  });

  it("comes back from KEEP without having been let go of", function () {
    var interest = make(grid, 0, 5000),
      camera = interest.observer(),
      key = grid.keyOf(5, 5);

    interest.look(camera, 0, 0, 10, 10);
    interest.update(0);
    interest.look(camera, 10000, 0, 10010, 10);
    interest.update(100);
    expect(interest.levelOf(key)).toBe(KEEP);
    interest.look(camera, 0, 0, 10, 10);
    interest.update(200);
    expect(changesOf(interest)).toContainEqual([key, KEEP, VIEW]);
  });

  it("gives a region the highest level any observer gives it", function () {
    var interest = make(grid, 0, 0),
      a = interest.observer(),
      b = interest.observer(),
      key = grid.keyOf(25, 5);

    interest.look(a, 0, 0, 10, 10);
    interest.look(b, 20, 0, 30, 10);
    interest.update(0);
    expect(interest.levelOf(key)).toBe(VIEW);

    interest.forget(b);
    interest.update(1);
    expect(interest.levelOf(key)).toBe(NEAR);
  });

  it("does what looking at every region every update does, observers wandering", function () {
    var random = Random(21);

    [
      [0, 0],
      [400, 3000],
      [1500, 1500],
    ].forEach(function (times) {
      var interest = make(grid, times[0], times[1]),
        plain = Plain(grid, times[0], times[1], 30),
        ids = [interest.observer(), interest.observer()],
        boxes = [null, null],
        t = 0;

      for (var step = 0; step < 600; step++) {
        ids.forEach(function (id, o) {
          var roll = random.next();

          if (roll < 0.02) {
            interest.forget(id);
            boxes[o] = null;
            return;
          }

          var b = boxes[o] || [0, 0, 40, 30];

          if (roll < 0.06) {
            //a jump
            var x = random.range(-200, 160),
              z = random.range(-200, 170);

            b = [x, z, x + 40, z + 30];
          } else if (boxes[o]) {
            var dx = random.range(-12, 12),
              dz = random.range(-12, 12);

            b = [b[0] + dx, b[1] + dz, b[2] + dx, b[3] + dz];
          }

          //kept inside the world the plain way looks at, rings and all
          if (b[0] < -210 || b[2] > 210 || b[1] < -210 || b[3] > 210)
            b = [0, 0, 40, 30];
          boxes[o] = b;
          interest.look(id, b[0], b[1], b[2], b[3]);
        });

        t += random.int(16, 600);
        interest.update(t);

        expect(changesOf(interest)).toEqual(plain.update(t, boxes));
      }
    });
  });

  it("looks only at what is near the observers", function () {
    var looked = 0,
      counting = {
        within: function (a, b, c, d, out) {
          var n = grid.within(a, b, c, d, out);

          looked += n;
          return n;
        },
        bounds: grid.bounds,
      },
      interest = Interest(counting, { rings: RINGS }),
      camera = interest.observer();

    for (var x = 0; x < 100000; x += 1000) {
      interest.look(camera, x, 0, x + 40, 30);
      looked = 0;
      interest.update(x);
      //(40 + 2 * 70) x (30 + 2 * 70) over cells of 10, a cell more each way
      //at most - however far the camera has been
      expect(looked).toBeLessThanOrEqual(20 * 20);
    }
  });
});
