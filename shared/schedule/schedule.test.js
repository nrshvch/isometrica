import { describe, expect, it } from "vitest";
import { COARSE, Clock, DORMANT, FULL, Scheduler } from "./index.js";

//a clock the test moves by hand: every call of a system takes `cost` ms
function fakeTime(cost) {
  var t = { ms: 0 };

  t.now = function () {
    return t.ms;
  };
  t.system = function (log) {
    return function (key, dt, tier) {
      log.push([key, dt, tier]);
      t.ms += cost;
    };
  };

  return t;
}

describe("Clock", function () {
  it("takes fixed steps, whatever the frames, and says how far between", function () {
    var clock = Clock(10);

    expect(clock.advance(4)).toBe(0);
    expect(clock.alpha).toBeCloseTo(0.4);
    expect(clock.advance(17)).toBe(2);
    expect(clock.alpha).toBeCloseTo(0.1);
    expect(clock.time).toBe(20);
  });

  it("the same steps for the same time, in big frames or small", function () {
    var a = Clock(1000 / 30),
      b = Clock(1000 / 30),
      na = 0,
      nb = 0;

    for (var i = 0; i < 60; i++) na += a.advance(1000 / 60);
    for (i = 0; i < 20; i++) nb += b.advance(50);

    expect(na).toBe(30);
    expect(nb).toBe(30);
  });

  it("drops what is past maxSteps after a long pause", function () {
    var clock = Clock(10, 3);

    expect(clock.advance(1000)).toBe(3);
    expect(clock.advance(5)).toBe(0);
  });
});

describe("Scheduler", function () {
  it("steps every full region with every system, and none that is not full", function () {
    var t = fakeTime(0),
      log = [],
      s = Scheduler({ now: t.now });

    s.system("a", t.system(log));
    s.set(1, FULL, 0);
    s.set(2, FULL, 0);
    s.set(3, COARSE, 0);
    s.set(4, DORMANT, 0);

    expect(s.full(33)).toBe(2);
    expect(log).toEqual([
      [1, 33, FULL],
      [2, 33, FULL],
    ]);
    expect(s.tierOf(4)).toBe(DORMANT);
    expect(s.count).toBe(3);
  });

  it("gives a coarse region a turn once a period, stepped by the time since", function () {
    var t = fakeTime(0),
      log = [],
      s = Scheduler({ now: t.now, period: 100 });

    s.system("a", t.system(log));
    s.set(7, COARSE, 0, 0);

    var turns = [];

    for (var ms = 0; ms <= 1000; ms += 10) {
      if (s.coarse(ms)) turns.push(ms);
    }

    expect(turns.length).toBeGreaterThanOrEqual(9);
    expect(turns.length).toBeLessThanOrEqual(11);
    for (var i = 1; i < log.length; i++) expect(log[i][1]).toBe(100);
  });

  it("spreads regions coming in together over the period", function () {
    var t = fakeTime(0),
      log = [],
      s = Scheduler({ now: t.now, period: 100, budget: Infinity });

    s.system("a", t.system(log));
    for (var k = 0; k < 100; k++) s.set(k * 1234567, COARSE, 0, 0);

    var most = 0;

    for (var ms = 10; ms <= 100; ms += 10) most = Math.max(most, s.coarse(ms));

    expect(log.length).toBe(100);
    expect(most).toBeLessThan(40);
  });

  it("runs the nearest first, stops at the budget, and gets to the rest later", function () {
    var t = fakeTime(1),
      log = [],
      s = Scheduler({ now: t.now, period: 100, budget: 3 });

    s.system("a", t.system(log));
    s.set(10, COARSE, 5, -1000);
    s.set(20, COARSE, 1, -1000);
    s.set(30, COARSE, 3, -1000);
    s.set(40, COARSE, 2, -1000);
    s.set(50, COARSE, 4, -1000);

    //nobody long overdue yet: by distance
    s.stats.reset();
    expect(s.coarse(-850)).toBe(3);
    expect(
      log.map(function (e) {
        return e[0];
      }),
    ).toEqual([20, 40, 30]);

    expect(s.coarse(-849)).toBe(2);
    expect(log.slice(3).map((e) => e[0])).toEqual([50, 10]);
  });

  it("puts the long overdue before the near", function () {
    var t = fakeTime(1),
      log = [],
      s = Scheduler({ now: t.now, period: 100, budget: 1, late: 4 });

    s.system("a", t.system(log));
    //1 is near and due; 2 is far, and long overdue
    s.set(1, COARSE, 0, 0);
    s.set(2, COARSE, 9, -1000);
    s.coarse(150);
    expect(log[0][0]).toBe(2);
  });

  it("counts what each system takes, by tier", function () {
    var t = fakeTime(2),
      s = Scheduler({ now: t.now, period: 10, budget: Infinity });

    s.system("a", t.system([]));
    s.system("b", t.system([]));
    s.set(1, FULL, 0);
    s.set(2, COARSE, 0, -100);
    s.full(16);
    s.coarse(0);

    expect(s.stats.names).toEqual(["a", "b"]);
    expect(Array.from(s.stats.runs)).toEqual([0, 1, 1, 0, 1, 1]);
    expect(Array.from(s.stats.time)).toEqual([0, 2, 2, 0, 2, 2]);
    s.stats.reset();
    expect(Array.from(s.stats.runs)).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("lets a system change regions as it runs", function () {
    var s = Scheduler({ now: () => 0, budget: Infinity }),
      seen = [];

    s.system("a", function (key) {
      seen.push(key);
      if (key === 1) {
        s.remove(2);
        for (var k = 100; k < 200; k++) s.set(k, FULL, 0);
      }
    });
    s.set(1, FULL, 0);
    s.set(2, FULL, 0);
    s.full(1);

    expect(seen).toEqual([1]);
    expect(s.count).toBe(101);
  });
});
