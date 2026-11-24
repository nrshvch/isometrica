import { describe, expect, it } from "vitest";
import { Worker } from "node:worker_threads";
import Random from "../random/index.js";
import { Published, Reader, Replica, Table, Writer } from "./index.js";

var STEP = 1,
  SAY = 2,
  ROWS = 3;

function records(reader) {
  var out = [];

  while (reader.next() >= 0)
    out.push({
      kind: reader.kind,
      nums: Array.from(reader.nums.subarray(0, reader.n)),
      text: reader.length > 0 ? reader.text() : "",
    });

  return out;
}

describe("Writer and Reader", function () {
  it("give back the records written, numbers, bytes and text", function () {
    var w = Writer(64),
      r = Reader();

    w.begin(4);
    w.record(STEP, [50, 3], 2);
    w.text(SAY, [7], 1, "héllo, wörld ✓");
    w.record(SAY, null, 0, new Uint8Array([1, 2, 3]));
    w.record(STEP, [-0.5, 1e300, NaN], 3);

    var bytes = w.end(5);

    expect(r.open(bytes)).toBe(5);
    expect(r.from).toBe(4);
    expect(r.count).toBe(4);

    var got = records(r);

    expect(got[0]).toEqual({ kind: STEP, nums: [50, 3], text: "" });
    expect(got[1]).toEqual({ kind: SAY, nums: [7], text: "héllo, wörld ✓" });
    expect(got[2].nums).toEqual([]);
    expect(got[3].nums[0]).toBe(-0.5);
    expect(got[3].nums[1]).toBe(1e300);
    expect(got[3].nums[2]).toBeNaN();
    expect(r.next()).toBe(-1);
  });

  it("reads a frame copied out to transfer as the view itself", function () {
    var w = Writer(),
      random = Random(3),
      a = Reader(),
      b = Reader();

    w.begin(-1);
    for (var i = 0; i < 500; i++) {
      var n = random.int(0, 9),
        nums = [];

      for (var k = 0; k < n; k++) nums.push(random.range(-1e6, 1e6));
      if (random.chance(0.3))
        w.text(i % 7, nums, n, "x".repeat(random.int(0, 40)));
      else w.record(i % 7, nums, n);
    }

    var view = w.end(0),
      copy = w.copy();

    expect(copy.byteLength).toBe(view.length);
    a.open(view);
    b.open(copy);
    expect(records(a)).toEqual(records(b));
  });

  it("writes the same records as the same bytes, whatever was written before", function () {
    var w = Writer(64),
      frame = function () {
        w.begin(-1);
        w.record(1, [1.5], 1, Uint8Array.from([1, 2, 3]));
        w.text(2, [], 0, "abc");

        return Array.from(w.end(0));
      },
      first = frame();

    w.begin(-1);
    w.record(9, [], 0, new Uint8Array(40).fill(255));
    w.text(9, [], 0, "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz");
    w.end(0);

    expect(frame()).toEqual(first);
  });

  it("grows, and keeps its buffer once grown: nothing made a frame", function () {
    var w = Writer(64),
      nums = new Float64Array(8),
      first = null;

    for (var frame = 0; frame < 50; frame++) {
      w.begin(frame);
      for (var i = 0; i < 100; i++) w.record(STEP, nums, 8);

      var bytes = w.end(frame + 1);

      if (frame === 1) first = bytes.buffer;
      if (frame > 1) expect(bytes.buffer).toBe(first);
    }
  });
});

describe("Replica", function () {
  it("takes a snapshot whatever its version, then only the next frame", function () {
    var w = Writer(),
      r = Reader(),
      copy = Replica();

    function frame(from, to) {
      w.begin(from);
      r.open(w.end(to));

      return copy.accept(r);
    }

    expect(frame(3, 4)).toBe(false);
    expect(copy.stale).toBe(true);
    expect(frame(-1, 10)).toBe(true);
    expect(copy.version).toBe(10);
    expect(frame(10, 11)).toBe(true);
    expect(frame(12, 13)).toBe(false);
    expect(copy.version).toBe(11);
    expect(copy.stale).toBe(true);
    expect(frame(11, 12)).toBe(true);
    expect(copy.stale).toBe(false);
  });
});

describe("Table", function () {
  function frameOf(w, table, version, snapshot) {
    w.begin(snapshot ? -1 : version);
    if (snapshot) table.snapshot(w, ROWS);
    else table.changes(w, ROWS);

    return w.end(version + 1);
  }

  function apply(reader, bytes, copy, table) {
    reader.open(bytes);
    if (!copy.accept(reader)) return false;
    while (reader.next() >= 0) if (reader.kind === ROWS) table.apply(reader);

    return true;
  }

  it("a snapshot and the changes after it make the same table", function () {
    var random = Random(21),
      owner = Table(4, 4),
      w = Writer(),
      r = Reader(),
      version = 0;

    for (var i = 0; i < 300; i++)
      owner.set(random.int(0, 99), random.int(0, 3), random.int(0, 9));

    var mirror = Table(4),
      copy = Replica();

    expect(apply(r, frameOf(w, owner, version++, true), copy, mirror)).toBe(
      true,
    );

    for (var step = 0; step < 200; step++) {
      var changes = random.int(0, 30);

      for (i = 0; i < changes; i++)
        owner.set(
          random.int(0, 149),
          random.int(0, 3),
          random.chance(0.1) ? NaN : random.int(0, 9),
        );

      //now and then a frame lost: the copy goes stale, and is sent the
      //whole table again
      var bytes = frameOf(w, owner, version++, false);

      if (random.chance(0.05)) continue;
      if (!apply(r, bytes, copy, mirror)) {
        expect(copy.stale).toBe(true);
        expect(apply(r, frameOf(w, owner, version++, true), copy, mirror)).toBe(
          true,
        );
      }

      expect(mirror.rows).toBe(owner.rows);
      for (var f = 0; f < 4; f++)
        expect(Array.from(mirror.cols[f].subarray(0, mirror.rows))).toEqual(
          Array.from(owner.cols[f].subarray(0, owner.rows)),
        );
    }
  });

  it("sends a row once however often it is set, and nothing unchanged", function () {
    var t = Table(2),
      w = Writer();

    t.set(0, 0, 1);
    t.set(0, 1, 2);
    t.set(0, 0, 3);
    t.set(5, 1, 1);
    expect(t.changed).toBe(2);
    w.begin(0);
    t.changes(w, ROWS);
    w.end(1);
    //rows 0 and 5 - and rows 1..4 came into being with 5, all zero
    expect(w.count).toBe(2);
    t.set(0, 0, 3);
    expect(t.changed).toBe(0);
  });
});

describe("Published", function () {
  function fill(p, version) {
    var u8 = new Uint8Array(1 + (version % 50));

    u8.fill(version & 255);
    p.write(u8);
    p.publish(version);
  }

  it("reads the last copy published whole, or the one it had", function () {
    var buffer = Published(64, false).buffer,
      writer = Published.on(buffer),
      reader = Published.on(buffer);

    expect(reader.read().length).toBe(0);
    expect(reader.version).toBe(-1);

    fill(writer, 1);
    fill(writer, 2);

    var got = reader.read();

    expect(reader.fresh).toBe(true);
    expect(reader.version).toBe(2);
    expect(Array.from(got)).toEqual([2, 2, 2]);
    expect(reader.read().length).toBe(3);
    expect(reader.fresh).toBe(false);

    fill(writer, 3);
    //the writer goes on into the copy the reader let go of, never the one
    //it reads
    var held = reader.read();

    fill(writer, 4);
    fill(writer, 5);
    expect(Array.from(held)).toEqual([3, 3, 3, 3]);
    reader.read();
    expect(reader.version).toBe(5);
  });

  it("is never read half written by another thread", async function () {
    var p = Published(256, true),
      url = new URL("./index.js", import.meta.url).href,
      worker = new Worker(
        `const { workerData, parentPort } = require("node:worker_threads");
         import(workerData.url).then(function (m) {
           var p = m.Published.on(workerData.buffer);
           for (var v = 1; v <= 200000; v++) {
             var u8 = new Uint8Array(1 + (v % 200));
             u8.fill(v & 255);
             p.write(u8);
             p.publish(v);
           }
           parentPort.postMessage("done");
         });`,
        { eval: true, workerData: { url: url, buffer: p.buffer } },
      ),
      done = false,
      reads = 0,
      last = -1;

    worker.on("message", function () {
      done = true;
    });

    while (!done || reads === 0) {
      var u8 = p.read();

      if (p.version >= 0) {
        reads++;
        expect(u8.length).toBe(1 + (p.version % 200));
        for (var i = 0; i < u8.length; i++)
          if (u8[i] !== (p.version & 255)) throw new Error("half written");
        expect(p.version).toBeGreaterThanOrEqual(last);
        last = p.version;
      }
      await new Promise(function (resolve) {
        setImmediate(resolve);
      });
    }

    p.read();
    expect(p.version).toBe(200000);
    await worker.terminate();
  });
});
