import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import { Records, fromText, toText } from "./index.js";

function bytes(list) {
  return Uint8Array.from(list);
}

//what was written, by key: [version, bytes | null]
function sink() {
  var out = new Map(),
    log = [];

  return {
    out: out,
    log: log,
    write: function (key, version, b) {
      out.set(key, [version, b === null ? null : Array.from(b)]);
      log.push(key);
    },
  };
}

describe("Records", function () {
  it("writes a record marked, once, and only again once it changes", function () {
    var r = Records(),
      s = sink(),
      data = new Map([[7, bytes([1, 2, 3])]]),
      make = function (k) {
        return data.has(k) ? data.get(k) : null;
      };

    r.mark(7);
    expect(r.pending).toBe(1);
    expect(r.collect(make, s.write)).toBe(1);
    expect(s.out.get(7)).toEqual([1, [1, 2, 3]]);
    expect(r.pending).toBe(0);

    r.mark(7);
    expect(r.collect(make, s.write)).toBe(0);

    data.set(7, bytes([1, 2, 4]));
    r.mark(7);
    r.mark(7);
    expect(r.collect(make, s.write)).toBe(1);
    expect(s.out.get(7)).toEqual([2, [1, 2, 4]]);
    expect(r.version(7)).toBe(2);
    expect(r.size).toBe(1);
  });

  it("writes null once for a record there is no more of, nothing for one never there", function () {
    var r = Records(),
      s = sink();

    r.mark(3);
    expect(r.collect(() => null, s.write)).toBe(0);
    expect(r.has(3)).toBe(false);
    expect(r.version(3)).toBe(-1);

    r.mark(3);
    r.collect(() => bytes([9]), s.write);
    r.keysChanged = false;
    r.mark(3);
    expect(r.collect(() => null, s.write)).toBe(1);
    expect(s.out.get(3)).toEqual([2, null]);
    expect(r.keysChanged).toBe(true);
    expect(r.size).toBe(0);
    expect(r.keys()).toEqual([]);

    r.mark(3);
    expect(r.collect(() => null, s.write)).toBe(0);
    //made again, its version goes on counting
    r.mark(3);
    r.collect(() => bytes([9]), s.write);
    expect(s.out.get(3)).toEqual([3, [9]]);
  });

  it("takes what is known without writing it again", function () {
    var r = Records(),
      s = sink();

    r.known(2 ** 40 + 5, 12, bytes([5, 6]));
    expect(r.has(2 ** 40 + 5)).toBe(true);
    expect(r.keys()).toEqual([2 ** 40 + 5]);
    r.mark(2 ** 40 + 5);
    expect(r.collect(() => bytes([5, 6]), s.write)).toBe(0);
    r.mark(2 ** 40 + 5);
    r.collect(() => bytes([5, 7]), s.write);
    expect(s.out.get(2 ** 40 + 5)).toEqual([13, [5, 7]]);
  });

  it("keeps a copy, not the caller's buffer", function () {
    var r = Records(),
      s = sink(),
      buf = bytes([1, 1, 1]);

    r.mark(1);
    r.collect(() => buf, s.write);
    buf[0] = 2;
    r.mark(1);
    expect(r.collect(() => buf, s.write)).toBe(1);
  });

  it("leaves a key marked while it collects for the next", function () {
    var r = Records(),
      s = sink(),
      n = 0;

    r.mark(1);
    r.collect(function (k) {
      r.mark(k);
      return bytes([n++]);
    }, s.write);
    expect(r.marked(1)).toBe(true);
    expect(r.collect(() => bytes([n++]), s.write)).toBe(1);
  });

  it("writes in the order marked", function () {
    var r = Records(),
      s = sink();

    [5, 1, 9, 1, 3].forEach(r.mark);
    r.collect((k) => bytes([k]), s.write);
    expect(s.log).toEqual([5, 1, 9, 3]);
  });

  it("is the plain way on seeded random changes", function () {
    for (var seed = 1; seed <= 8; seed++) {
      var rng = Random(seed),
        r = Records(4),
        world = new Map(),
        changes = new Map(),
        stored = new Map(),
        written = 0;

      for (var round = 0; round < 60; round++) {
        //some records change, some only get marked
        for (var c = rng.int(0, 30); c > 0; c--) {
          var k = rng.int(0, 200) * 1048576 + rng.int(0, 3);

          if (rng.chance(0.2)) world.delete(k);
          else {
            var len = rng.int(0, 90),
              b = new Uint8Array(len);

            for (var i = 0; i < len; i++) b[i] = rng.int(0, 3);
            world.set(k, b);
          }

          r.mark(k);
          if (rng.chance(0.3)) r.mark(rng.int(0, 200) * 1048576);
        }
        written += r.collect(
          function (k) {
            return world.has(k) ? world.get(k) : null;
          },
          function (k, v, b) {
            var last = stored.get(k);

            expect(v).toBe((changes.get(k) || 0) + 1);
            changes.set(k, v);
            if (b === null) {
              expect(last).not.toBe(undefined);
              stored.delete(k);
            } else {
              if (last !== undefined) expect(Array.from(b)).not.toEqual(last);
              stored.set(k, Array.from(b));
            }
          },
        );
      }

      //every record in the world is in the storage, as it is
      expect(r.size).toBe(stored.size);
      expect(r.keys().sort((a, b) => a - b)).toEqual(
        Array.from(stored.keys()).sort((a, b) => a - b),
      );
      for (var [key, value] of world) {
        if (!r.has(key)) continue;
        expect(stored.get(key)).toEqual(Array.from(value));
        expect(Array.from(r.bytes(key))).toEqual(Array.from(value));
      }
      expect(written).toBeGreaterThan(0);
    }
  });
});

describe("toText, fromText", function () {
  it("is base64 as Buffer has it, and back", function () {
    var rng = Random(3);

    for (var n = 0; n < 300; n++) {
      var b = new Uint8Array(n);

      for (var i = 0; i < n; i++) b[i] = rng.int(0, 255);

      var text = toText(b);

      expect(text).toBe(Buffer.from(b).toString("base64"));
      expect(Array.from(fromText(text))).toEqual(Array.from(b));
    }
  });

  it("says null for what is not base64", function () {
    expect(fromText("abc")).toBe(null);
    expect(fromText("ab!d")).toBe(null);
    expect(fromText("aé==")).toBe(null);
    expect(fromText("").length).toBe(0);
  });

  it("gives bytes a Float64Array can be laid over", function () {
    var f = new Float64Array([1.5, -2, 1e300]),
      back = fromText(toText(new Uint8Array(f.buffer)));

    expect(Array.from(new Float64Array(back.buffer))).toEqual([1.5, -2, 1e300]);
  });
});
