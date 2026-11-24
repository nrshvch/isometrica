/**
 * Two fingerprints (fingerprint.mjs) compared, view by view: the ground's
 * quads, the picks, the grid and how many tiles - IDENTICAL, or where they
 * first differ. Exits 1 when they differ.
 *
 *   node tools/world/compare.mjs <a.json> <b.json>
 */
import fs from "node:fs";
import { args } from "./page.mjs";

var files = args();

if (files.length !== 2) {
  console.log("node tools/world/compare.mjs <a.json> <b.json>");
  process.exit(2);
}

var [a, b] = files.map(function (f) {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  }),
  bad = 0;

Object.keys(a).forEach(function (view) {
  var A = a[view],
    B = b[view];

  if (!B) {
    console.log(view, "missing from the second");
    bad++;
    return;
  }

  var qa = A.quads.map(JSON.stringify),
    qb = B.quads.map(JSON.stringify),
    quads = 0,
    firstQuad = -1,
    picks = 0,
    firstPick = -1,
    i;

  for (i = 0; i < Math.max(qa.length, qb.length); i++)
    if (qa[i] !== qb[i]) {
      quads++;
      if (firstQuad < 0) firstQuad = i;
    }

  for (i = 0; i < A.picks.length; i++)
    if (A.picks[i] !== B.picks[i]) {
      picks++;
      if (firstPick < 0) firstPick = i;
    }

  var grid = A.grid === B.grid;

  console.log(
    `${view}: quads ${qa.length}/${qb.length}, ${quads} differ; picks ${picks}/${A.picks.length} differ; grid ${grid ? "same" : "DIFFERS"}; tiles ${A.tiles}/${B.tiles}`,
  );
  if (quads)
    console.log(
      "  first quad that differs:",
      firstQuad,
      "\n   a:",
      qa[firstQuad],
      "\n   b:",
      qb[firstQuad],
    );
  if (picks)
    console.log(
      "  first pick that differs:",
      firstPick,
      "a:",
      A.picks[firstPick],
      "b:",
      B.picks[firstPick],
    );

  bad += quads + picks + (grid ? 0 : 1) + (A.tiles === B.tiles ? 0 : 1);
});

console.log(bad === 0 ? "IDENTICAL" : "DIFFERENT");
process.exit(bad === 0 ? 0 : 1);
