/**
 * What a town runs on, painted out of boxes the way the houses are
 * (shared/gen/houses): for now its water tower, the American small-town kind
 * - a round tank on four steel legs braced against each other, a catwalk
 * round the tank and a ladder up to it, a conical roof, and the riser pipe
 * down the middle into the ground, where the mains run off from a valve
 * pit.
 *
 * The whole of it stands on one tile, and goes up on the same building site
 * as anything else (shared/gen/sites), then as its legs (stage 1) and its
 * tank being welded together on top of them (stage 2).
 *
 * Units as everywhere: a tile is 32 along the ground - about ten metres -
 * and heights are in pixels, twelve to a storey of three metres. The tank
 * is seven metres across and the whole tower some twenty-three metres high.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  TILE,
  STOREY,
  GRASS,
  CONCRETE,
  METAL,
  DIRT,
  LIT,
  MATTE,
  madeOf,
  shaded,
  measureOnTile,
  onTile,
  TURNS,
} from "./blocks.js";

var STEEL = [168, 178, 192],
  TANK = [236, 240, 244],
  BAND = [52, 104, 176],
  ROOF = [196, 204, 214],
  BARE = [132, 138, 146],
  GRAVEL = madeOf([196, 190, 176], "gravel"),
  PIPE = [92, 120, 150];

//where the middle of the tower is, the tank's radius, and how high it sits
var CX = 16,
  CY = 16,
  R = 10.5,
  //the bottom of the tank's wall, and its top
  Z0 = 52,
  Z1 = 68,
  //the legs: their feet so far out from the middle along x and y, and where
  //they meet the tank
  FOOT = 11,
  HEAD = 7.4;

//where a leg is at height z: from its foot out at a corner in to under the
//tank, sx and sy which corner
function legAt(sx, sy, z) {
  var k = Math.min(1, Math.max(0, (z - 1) / (Z0 - 3))),
    o = FOOT + (HEAD - FOOT) * k;

  return [CX + sx * o, CY + sy * o];
}

var CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

/**
 * The four legs from their footings up to `top`: each a steel column
 * leaning in towards the middle, stacked out of short lengths.
 */
function legs(b, top, color) {
  CORNERS.forEach(function (c) {
    var f = legAt(c[0], c[1], 1);

    b.push(box(f[0] - 1.6, f[0] + 1.6, f[1] - 1.6, f[1] + 1.6, 0, 2, CONCRETE));

    //two units square, stepping in a whole unit at a time, so that it comes
    //out a column two pixels wide with clean steps in it
    for (var z = 2; z < top; z += 1) {
      var p = legAt(c[0], c[1], z + 0.5),
        px = Math.round(p[0]),
        py = Math.round(p[1]);

      b.push(
        box(px - 1, px + 1, py - 1, py + 1, z, Math.min(z + 1, top), color),
      );
    }
  });
}

//a rod is a line a pixel thin, whichever way it goes: not snapped to whole
//units (iso snap)
var FINE = { fine: true };

//a rod from one point to another, as a string of small cubes along it
function rod(b, a, c, t, color) {
  var dx = c[0] - a[0],
    dy = c[1] - a[1],
    dz = c[2] - a[2],
    n = Math.ceil(Math.sqrt(dx * dx + dy * dy + dz * dz) / 0.5);

  for (var i = 0; i <= n; i++) {
    var x = a[0] + (dx * i) / n,
      y = a[1] + (dy * i) / n,
      z = a[2] + (dz * i) / n;

    b.push(box(x - t, x + t, y - t, y + t, z - t, z + t, color, FINE));
  }
}

/**
 * The bracing between each pair of legs next to each other: struts across
 * at every panel, and a cross of rods in each panel between them.
 */
function bracing(b, levels, color) {
  for (var k = 0; k < 4; k++) {
    var c0 = CORNERS[k],
      c1 = CORNERS[(k + 1) % 4];

    for (var l = 0; l < levels.length - 1; l++) {
      var z0 = levels[l],
        z1 = levels[l + 1],
        a0 = legAt(c0[0], c0[1], z0),
        a1 = legAt(c0[0], c0[1], z1),
        b0 = legAt(c1[0], c1[1], z0),
        b1 = legAt(c1[0], c1[1], z1);

      rod(b, [a0[0], a0[1], z0], [b1[0], b1[1], z1], 0.22, color);
      rod(b, [b0[0], b0[1], z0], [a1[0], a1[1], z1], 0.22, color);
      rod(b, [a1[0], a1[1], z1], [b1[0], b1[1], z1], 0.35, color);
    }
  }
}

//0..1, the same for the same whole numbers every time
function hash(i, j) {
  var h = Math.imul(i | 0, 73856093) ^ Math.imul(j | 0, 19349663);

  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);

  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/**
 * The tank: its round wall from z0 to z1 - a band of colour round it, and
 * on the side looking towards -y the town's name in big letters on the
 * band - its dished bottom under it, and its roof, a low cone with a vent on
 * top. Laid out in columns half a pixel across, each lit by which way the
 * surface looks there (blocks shaded); the wall only where it shows, round
 * its edge.
 *
 * @param painted {boolean} false for the bare steel of a tank going up,
 *        which has no roof yet either
 */
function tank(b, z0, z1, painted) {
  var step = 0.5,
    wall = painted ? TANK : BARE,
    band0 = z0 + 4,
    band1 = z0 + 10,
    i,
    j;

  for (i = -R; i < R; i += step)
    for (j = -R; j < R; j += step) {
      var u = i + step / 2,
        v = j + step / 2,
        d = Math.sqrt(u * u + v * v);

      if (d >= R) continue;

      var x = CX + i,
        y = CY + j,
        nx = u / d,
        ny = v / d,
        k = Math.sqrt(1 - (d / R) * (d / R));

      //the dished bottom
      b.push(
        box(
          x,
          x + step,
          y,
          y + step,
          z0 - 3.5 * k,
          z0,
          shaded(wall, nx * 0.8, ny * 0.8, -0.6),
          LIT,
        ),
      );

      //the wall, only round its edge where it can be seen
      if (d > R - 1.3) {
        if (!painted) {
          b.push(
            box(x, x + step, y, y + step, z0, z1, shaded(wall, nx, ny, 0), LIT),
          );
          continue;
        }

        b.push(
          box(
            x,
            x + step,
            y,
            y + step,
            z0,
            band0,
            shaded(wall, nx, ny, 0),
            LIT,
          ),
        );
        b.push(
          box(
            x,
            x + step,
            y,
            y + step,
            band1,
            z1,
            shaded(wall, nx, ny, 0),
            LIT,
          ),
        );

        //the band, and on the front of it the lettering, a pixel at a time
        var front = ny < -0.55,
          col = Math.floor((u + R) / 1.2);

        for (var z = band0; z < band1; z += 1) {
          var row = Math.floor(z - band0),
            letter = col % 4 !== 3 && row > 0 && row < 5,
            ink =
              front &&
              letter &&
              hash(Math.floor(col / 4), (col % 4) * 7 + row) < 0.62;

          b.push(
            box(
              x,
              x + step,
              y,
              y + step,
              z,
              Math.min(z + 1, band1),
              shaded(ink ? TANK : BAND, nx, ny, 0),
              LIT,
            ),
          );
        }
      }

      //the roof, a low cone, its eaves out over the wall
      if (painted) {
        var rise = 5.5 * (1 - d / R);

        b.push(
          box(
            x,
            x + step,
            y,
            y + step,
            z1 + rise - 0.8,
            z1 + rise,
            shaded(ROOF, nx * 0.5, ny * 0.5, 1),
            LIT,
          ),
        );
      }
    }

  if (painted) {
    //the vent on top, and a finial
    b.push(
      box(CX - 1, CX + 1, CY - 1, CY + 1, z1 + 5, z1 + 7, darker(ROOF, 0.15)),
    );
    b.push(
      box(
        CX - 1.4,
        CX + 1.4,
        CY - 1.4,
        CY + 1.4,
        z1 + 7,
        z1 + 7.5,
        darker(ROOF, 0.3),
      ),
    );
    b.push(
      box(CX - 0.3, CX + 0.3, CY - 0.3, CY + 0.3, z1 + 7.5, z1 + 9.5, METAL),
    );
  }
}

/**
 * The catwalk round the bottom of the tank at z: a ring of grating out from
 * the wall and a rail round it on posts.
 */
function catwalk(b, z) {
  var step = 0.5,
    out = R + 1.6;

  for (var i = -out; i < out; i += step)
    for (var j = -out; j < out; j += step) {
      var u = i + step / 2,
        v = j + step / 2,
        d = Math.sqrt(u * u + v * v);

      if (d >= out || d < R - 0.5) continue;

      var x = CX + i,
        y = CY + j;

      b.push(box(x, x + step, y, y + step, z - 0.4, z, darker(STEEL, 0.25)));
      if (d > out - 0.5) {
        b.push(box(x, x + step, y, y + step, z + 2.6, z + 3, STEEL));
        if (Math.floor((Math.atan2(v, u) + Math.PI) * 4) % 3 === 0)
          b.push(box(x, x + step, y, y + step, z, z + 2.6, STEEL));
      }
    }
}

//a ladder up the side looking towards +x, from z0 to z1, its rails along y
function ladder(b, x, y, z0, z1) {
  b.push(box(x, x + 0.3, y - 0.9, y - 0.6, z0, z1, METAL));
  b.push(box(x, x + 0.3, y + 0.6, y + 0.9, z0, z1, METAL));
  for (var z = z0 + 1; z < z1; z += 1.2)
    b.push(box(x, x + 0.25, y - 0.6, y + 0.6, z, z + 0.25, METAL));
}

/**
 * The tower whole: on a gravel pad its footings and legs, the bracing, the
 * riser pipe up the middle, the tank and its catwalk, a ladder; and on the
 * ground the riser going in under a collar of concrete, the main running off
 * from it into the ground, and the valve pit's lid.
 */
function waterTower(stage) {
  var b = [box(0, TILE, 0, TILE, 0, 1, stage ? DIRT : GRASS)];

  b.push(box(3, 29, 3, 29, 0.9, 1.2, stage ? CONCRETE : GRAVEL));

  if (stage === 1) {
    legs(b, Z0 * 0.55, BARE);
    bracing(b, [2, 15, 28], BARE);
    return b;
  }

  var color = stage ? BARE : STEEL;

  legs(b, Z0 - 1, color);
  bracing(b, [2, 15, 28, 41, Z0 - 2], color);

  //the riser, round, up the middle into the tank
  for (var i = -1.5; i < 1.5; i += 0.5)
    for (var j = -1.5; j < 1.5; j += 0.5) {
      var u = i + 0.25,
        v = j + 0.25,
        d = Math.sqrt(u * u + v * v);

      if (d < 1.5)
        b.push(
          box(
            CX + i,
            CX + i + 0.5,
            CY + j,
            CY + j + 0.5,
            1,
            Z0 - 2,
            shaded(PIPE, u, v, 0.2),
            LIT,
          ),
        );
    }

  tank(b, Z0, stage ? Z0 + 8 : Z1, !stage);
  catwalk(b, Z0);
  ladder(b, CX + FOOT + 0.8, CY + FOOT - 1.5, 1.2, Z0);

  if (stage) return b;

  //down at the foot: the collar round the riser, the main off to the edge
  //going into the ground, the pit's lid, a valve wheel
  b.push(box(CX - 2.5, CX + 2.5, CY - 2.5, CY + 2.5, 1, 2, CONCRETE));
  b.push(box(CX + 2.5, 30, CY - 0.8, CY + 0.8, 1, 2.2, PIPE));
  b.push(box(29, 31, CY - 1.5, CY + 1.5, 1, 1.6, CONCRETE));
  b.push(box(22, 26, CY + 3, CY + 7, 1, 1.5, darker(METAL, 0.1), MATTE));
  b.push(box(23.6, 24.4, CY - 1.2, CY + 1.2, 2.2, 4.6, [196, 52, 44]));
  b.push(box(23.4, 24.6, CY - 0.4, CY + 0.4, 2.2, 3.4, METAL));

  return b;
}

/**
 * What every kind of utility can be, as shared/gen/shops has them: a design
 * for its footprint with the options it is put together with, and its tiles.
 */
var FOOTPRINTS = {
  watertower: [
    {
      design: "watertower",
      weight: 1,
      axes: {},
      tiles: [{ x: 0, y: 0, parts: ["utilities/watertower/std/0/0"] }],
    },
  ],
};

/**
 * Every part there is, by name without its turn: the tower, and what it is
 * while it goes up.
 */
var PARTS = {
  "utilities/watertower/std/0/0": { stage: 0 },
  "utilities/frame/watertower/std/1/0/0": { stage: 1 },
  "utilities/frame/watertower/std/2/0/0": { stage: 2 },
};

var whole = {};

export function partBoxes(key) {
  var p = PARTS[key];

  if (p === undefined) throw new Error("no such part: " + key);

  if (whole[key] === undefined) whole[key] = waterTower(p.stage);

  return whole[key];
}

/**
 * Every part, by sprite name - "gen/utilities/watertower/std/0/0/r1" - with
 * its size and pivot, without painting it; and what every utility can be.
 */
export function describe() {
  var sizes = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      sizes["gen/" + key + "/r" + turns] = measureOnTile(
        iso.rotate(partBoxes(key), 1, 1, turns),
      );
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: {},
    },
  };
}

/**
 * One part, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  return iso.toImage(
    onTile(iso.rotate(partBoxes(key.slice(0, at)), 1, 1, turns)),
  );
}

export { PARTS, STOREY };
