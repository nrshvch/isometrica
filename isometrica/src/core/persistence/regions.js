/**
 * A city's save by region: a small header (the time, the seed, the last
 * name given, the city's own totals) and a record a region of the ground -
 * its terrain edits, what stands on it, who lives there, the bulldozers and
 * the tiles waiting for them - packed with shared/replica, written only when
 * it changed (shared/records). The whole save (CityPersistence#snapshot) is
 * the header and the records put together (assemble), and comes apart into
 * them again (split). See isometrica/.claude/skills/buildings/saves.md.
 */
import { Quadtree } from "shared/spatial";
import { Reader, Writer } from "shared/replica";
import { Records, fromText, toText } from "shared/records";

//a region is a quadtree's leaf 24 tiles across - the chunks the ground is
//drawn in on a big screen - whatever the screen; the root covers every
//tile there can be (65536 a side)
export var SIZE = 24;

var DEPTH = 12,
  tree = Quadtree(0, 0, SIZE * Math.pow(2, DEPTH), DEPTH);

//what the header says the save is (CityStore)
export var FORM = "regions";

/**
 * The region tile x, y is in.
 *
 * @returns {number}
 */
export function regionOf(x, y) {
  return tree.key(Math.floor(x / SIZE), Math.floor(y / SIZE), DEPTH);
}

/**
 * The region of a tile by its index ((y << 16) ^ x).
 *
 * @returns {number}
 */
export function regionOfTile(tile) {
  return tree.key(
    Math.floor((tile & 0xffff) / SIZE),
    Math.floor(((tile >>> 16) & 0xffff) / SIZE),
    DEPTH,
  );
}

//a region's corner, tile x and y
export function cornerX(key) {
  return tree.cellX(key) * SIZE;
}

export function cornerY(key) {
  return tree.cellZ(key) * SIZE;
}

//tile keys sorted as unsigned: what a JS object's own order is for every
//index below 2^31 (Terrain#save keeps to it for the rest)
export function byTile(a, b) {
  return (a >>> 0) - (b >>> 0);
}

//the kinds of record in a region's frame
var POINT_TILES = 1,
  POINT_HEIGHTS = 2,
  CLEARED = 3,
  BARE_TILES = 4,
  BARE_TIMES = 5,
  BUILDING = 6,
  BUILDING_JSON = 7,
  RESIDENT_TILES = 8,
  RESIDENT_COUNTS = 9,
  DOZER = 10,
  WAITING = 11;

var INT = 0,
  FLOAT = 1;

var writer = Writer(4096),
  reader = Reader(),
  one = [0],
  four = [0, 0, 0, 0];

//numbers as the smallest of Int32 and Float64 that holds every one exactly
function column(kind, list) {
  var ints = true,
    i;

  for (i = 0; i < list.length && ints; i++)
    ints = (list[i] | 0) === list[i] && !Object.is(list[i], -0);

  var typed = ints ? Int32Array.from(list) : Float64Array.from(list);

  one[0] = ints ? INT : FLOAT;
  writer.record(kind, one, 1, new Uint8Array(typed.buffer));
}

function readColumn(r) {
  var bytes = r.bytes().slice();

  return Array.from(
    r.nums[0] === INT
      ? new Int32Array(bytes.buffer, 0, bytes.length >> 2)
      : new Float64Array(bytes.buffer, 0, bytes.length >> 3),
  );
}

/**
 * A region's parts in a frame - or null for a region with nothing in it.
 *
 * @param p {{points, cleared, bare, buildings, residents, dozers,
 *        waiting}} as #empty, each as the whole save has them
 * @returns {Uint8Array|null} a view of the writer's buffer, till the next
 */
export function encode(p) {
  if (
    p.points.length +
      p.cleared.length +
      p.bare.length +
      p.buildings.length +
      p.residents.length +
      p.dozers.length +
      p.waiting.length ===
    0
  )
    return null;

  var i;

  writer.begin(-1);

  if (p.points.length > 0) {
    column(
      POINT_TILES,
      p.points.map(function (e) {
        return e[0];
      }),
    );
    column(
      POINT_HEIGHTS,
      p.points.map(function (e) {
        return e[1];
      }),
    );
  }
  if (p.cleared.length > 0) column(CLEARED, p.cleared);
  if (p.bare.length > 0) {
    column(
      BARE_TILES,
      p.bare.map(function (e) {
        return e[0];
      }),
    );
    column(
      BARE_TIMES,
      p.bare.map(function (e) {
        return e[1];
      }),
    );
  }

  for (i = 0; i < p.buildings.length; i++) building(p.buildings[i]);

  if (p.residents.length > 0) {
    column(
      RESIDENT_TILES,
      p.residents.map(function (e) {
        return e[0];
      }),
    );
    column(
      RESIDENT_COUNTS,
      p.residents.map(function (e) {
        return e[1];
      }),
    );
  }

  for (i = 0; i < p.dozers.length; i++) {
    one[0] = p.dozers[i][0];
    writer.text(DOZER, one, 1, JSON.stringify(p.dozers[i][1]));
  }

  if (p.waiting.length > 0) {
    var w = [];

    for (i = 0; i < p.waiting.length; i++)
      w.push(p.waiting[i][0], p.waiting[i][1], p.waiting[i][2]);
    column(WAITING, w);
  }

  return writer.end(0);
}

//a building's row: its name, code, tile and turns as numbers, the rest as
//JSON - or all of it, for a row of some other shape
function building(row) {
  var keys = Object.keys(row);

  if (
    keys[0] === "id" &&
    keys[1] === "code" &&
    keys[2] === "tile" &&
    keys[3] === "rotation" &&
    typeof row.id === "number" &&
    typeof row.code === "number" &&
    typeof row.tile === "number" &&
    typeof row.rotation === "number"
  ) {
    var rest = {},
      any = false;

    for (var i = 4; i < keys.length; i++)
      if (row[keys[i]] !== undefined) {
        rest[keys[i]] = row[keys[i]];
        any = true;
      }

    four[0] = row.id;
    four[1] = row.code;
    four[2] = row.tile;
    four[3] = row.rotation;
    writer.text(BUILDING, four, 4, any ? JSON.stringify(rest) : "");
  } else writer.text(BUILDING_JSON, four, 0, JSON.stringify(row));
}

/**
 * A region with nothing in it, as #decode and #gather fill it.
 */
export function empty() {
  return {
    points: [],
    cleared: [],
    bare: [],
    buildings: [],
    residents: [],
    dozers: [],
    waiting: [],
  };
}

/**
 * A region's frame read back into its parts (as #encode had them).
 *
 * @param bytes {Uint8Array}
 * @param [p] {Object} parts to add to (empty())
 * @returns {Object}
 */
export function decode(bytes, p) {
  var r = reader,
    pt = null,
    bt = null,
    rt = null,
    i,
    list;

  p = p || empty();
  r.open(bytes);

  while (r.next() >= 0) {
    switch (r.kind) {
      case POINT_TILES:
        pt = readColumn(r);
        break;
      case POINT_HEIGHTS:
        list = readColumn(r);
        for (i = 0; i < list.length; i++) p.points.push([pt[i], list[i]]);
        break;
      case CLEARED:
        list = readColumn(r);
        for (i = 0; i < list.length; i++) p.cleared.push(list[i]);
        break;
      case BARE_TILES:
        bt = readColumn(r);
        break;
      case BARE_TIMES:
        list = readColumn(r);
        for (i = 0; i < list.length; i++) p.bare.push([bt[i], list[i]]);
        break;
      case BUILDING:
        var text = r.text(),
          row = {
            id: r.nums[0],
            code: r.nums[1],
            tile: r.nums[2],
            rotation: r.nums[3],
          };

        if (text !== "") Object.assign(row, JSON.parse(text));
        p.buildings.push(row);
        break;
      case BUILDING_JSON:
        p.buildings.push(JSON.parse(r.text()));
        break;
      case RESIDENT_TILES:
        rt = readColumn(r);
        break;
      case RESIDENT_COUNTS:
        list = readColumn(r);
        for (i = 0; i < list.length; i++) p.residents.push([rt[i], list[i]]);
        break;
      case DOZER:
        p.dozers.push([r.nums[0], JSON.parse(r.text())]);
        break;
      case WAITING:
        list = readColumn(r);
        for (i = 0; i + 2 < list.length; i += 3)
          p.waiting.push([list[i], list[i + 1], list[i + 2]]);
        break;
    }
  }

  return p;
}

/**
 * What of a whole save is not by region: the header.
 *
 * @param data {Object} as CityPersistence#snapshot
 * @returns {Object}
 */
function headerOf(data) {
  var city = data.city,
    population = city.population;

  return {
    form: FORM,
    size: SIZE,
    version: data.version,
    id: data.id,
    savedAt: data.savedAt,
    time: data.time,
    seed: data.seed,
    named: data.named,
    works: data.works !== null && data.works !== undefined,
    city: {
      id: city.id,
      name: city.name,
      tile: city.tile,
      established: city.established,
      resources: city.resources,
      population: { joining: population.joining },
      research: city.research,
      replacing: city.replacing,
    },
    view: data.view,
  };
}

/**
 * Whether a whole save is of the shape a world saves today - its terrain,
 * its city's buildings each with a name, people by house, the bulldozers -
 * so that it comes apart into regions and back losing nothing. One of an
 * older shape is opened by a world, which saves it by region (#split null).
 */
export function splittable(data) {
  if (data === null || typeof data !== "object") return false;

  var t = data.terrain,
    c = data.city,
    w = data.works;

  return (
    t !== null &&
    typeof t === "object" &&
    Array.isArray(t.points) &&
    Array.isArray(t.cleared) &&
    Array.isArray(t.bare) &&
    c !== null &&
    typeof c === "object" &&
    Array.isArray(c.buildings) &&
    c.clearedTiles === undefined &&
    c.population !== null &&
    typeof c.population === "object" &&
    c.population.residents !== null &&
    typeof c.population.residents === "object" &&
    c.buildings.every(function (b) {
      return b !== null && typeof b === "object" && b.id > 0;
    }) &&
    (w === null ||
      w === undefined ||
      (Array.isArray(w.dozers) && Array.isArray(w.waiting)))
  );
}

/**
 * A whole save in parts: the header, and the parts by region.
 *
 * @param data {Object} as CityPersistence#snapshot - splittable
 * @returns {{header: Object, regions: Map<number, Object>}}
 */
export function split(data) {
  var regions = new Map(),
    t = data.terrain,
    c = data.city,
    w = data.works || { dozers: [], waiting: [] },
    i;

  function at(tile) {
    var key = regionOfTile(tile),
      p = regions.get(key);

    if (p === undefined) regions.set(key, (p = empty()));

    return p;
  }

  for (i = 0; i < t.points.length; i++)
    at(t.points[i][0]).points.push(t.points[i]);
  for (i = 0; i < t.cleared.length; i++)
    at(t.cleared[i]).cleared.push(t.cleared[i]);
  for (i = 0; i < t.bare.length; i++) at(t.bare[i][0]).bare.push(t.bare[i]);
  for (i = 0; i < c.buildings.length; i++)
    at(c.buildings[i].tile).buildings.push(c.buildings[i]);
  for (var tile in c.population.residents)
    at(+tile).residents.push([+tile, c.population.residents[tile]]);
  dozers(w, function (key) {
    var p = regions.get(key);

    if (p === undefined) regions.set(key, (p = empty()));

    return p;
  });

  return { header: headerOf(data), regions: regions };
}

//the bulldozers and the tiles waiting, by region, each with its place in
//the works' own order (Works#save)
function dozers(w, at) {
  var i, d;

  for (i = 0; i < w.dozers.length; i++) {
    d = w.dozers[i];
    at(regionOf(Math.floor(d[0]), Math.floor(d[1]))).dozers.push([i, d]);
  }
  for (i = 0; i < w.waiting.length; i++) {
    d = w.waiting[i];
    at(regionOfTile(d[0])).waiting.push([i, d[0], d[1]]);
  }
}

/**
 * The whole save, put together from the header and the regions' parts -
 * the same, to the byte, as CityPersistence#snapshot made of the world.
 *
 * @param header {Object} as #split made it
 * @param parts {Object[]} each region's (decode)
 * @returns {Object}
 */
export function assemble(header, parts) {
  var points = [],
    cleared = [],
    bare = [],
    buildings = [],
    residents = [],
    dozerRows = [],
    waiting = [],
    i,
    p;

  for (i = 0; i < parts.length; i++) {
    p = parts[i];
    points.push.apply(points, p.points);
    cleared.push.apply(cleared, p.cleared);
    bare.push.apply(bare, p.bare);
    buildings.push.apply(buildings, p.buildings);
    residents.push.apply(residents, p.residents);
    dozerRows.push.apply(dozerRows, p.dozers);
    waiting.push.apply(waiting, p.waiting);
  }

  var first = function (a, b) {
    return byTile(a[0], b[0]);
  };

  points.sort(first);
  cleared.sort(byTile);
  bare.sort(first);
  residents.sort(first);
  //the city's buildings in the order they were put up: by name
  buildings.sort(function (a, b) {
    return a.id - b.id;
  });
  dozerRows.sort(first);
  waiting.sort(first);

  var people = {};

  for (i = 0; i < residents.length; i++)
    people[residents[i][0]] = residents[i][1];

  var c = header.city;

  return {
    version: header.version,
    id: header.id,
    savedAt: header.savedAt,
    time: header.time,
    seed: header.seed,
    named: header.named,
    terrain: { points: points, cleared: cleared, bare: bare },
    city: {
      id: c.id,
      name: c.name,
      tile: c.tile,
      established: c.established,
      resources: c.resources,
      population: { residents: people, joining: c.population.joining },
      research: c.research,
      buildings: buildings,
      replacing: c.replacing,
    },
    works: header.works
      ? {
          dozers: dozerRows.map(function (d) {
            return d[1];
          }),
          waiting: waiting.map(function (w) {
            return [w[1], w[2]];
          }),
        }
      : null,
    view: header.view,
  };
}

/**
 * A row of the storage: a record's version and its frame, as text.
 */
export function rowOf(version, bytes) {
  return version + ":" + toText(bytes);
}

/**
 * A row read back: [version, bytes], or null for one that is not.
 */
export function readRow(text) {
  if (typeof text !== "string") return null;

  var colon = text.indexOf(":"),
    bytes = colon > 0 ? fromText(text.slice(colon + 1)) : null;

  return bytes === null ? null : [+text.slice(0, colon), bytes];
}

/**
 * The regions of a world being played, as they are saved: the regions
 * marked changed (Logic#touch) made again from the world - and those with
 * something going on that changes with the time (a building going up, bare
 * ground growing over, the bulldozers) - and written if they came out
 * different (shared/records).
 *
 * @constructor
 */
export function CityRegions() {
  this.records = Records(256);
  //regions made again every save, whether marked or not: something in
  //them changes with the time alone
  this.live = new Set();
}

CityRegions.prototype.mark = function (tile) {
  this.records.mark(regionOfTile(tile));
};

/**
 * What the storage holds already, from a row (readRow) - and marked, to be
 * made again from the world and compared at the next save.
 */
CityRegions.prototype.known = function (key, version, bytes) {
  this.records.known(key, version, bytes);
  this.records.mark(key);
};

/**
 * A region whose rows did not make it to the storage: written whole at the
 * next save, whatever it comes out as.
 */
CityRegions.prototype.forget = function (key) {
  this.records.known(key, Math.max(0, this.records.version(key)), null);
  this.records.mark(key);
};

/**
 * The header and the regions changed since the last save, as rows to write.
 *
 * @param world {Logic}
 * @param city {City}
 * @param data {Object} the save's header fields (CityPersistence#header)
 * @returns {{header: Object, rows: Array[], keys: number[]|null}} rows
 *          [key, row text | null]; keys - every region with a record, when
 *          they came or went
 */
CityRegions.prototype.save = function (world, city, data) {
  var records = this.records,
    live = this.live,
    works = world.works ? world.works.save() : { dozers: [], waiting: [] },
    worked = new Map(),
    rows = [];

  //the bulldozers move every step: their regions now, and those they were
  //in last time, made again
  dozers(works, function (key) {
    var p = worked.get(key);

    if (p === undefined) worked.set(key, (p = empty()));

    return p;
  });
  worked.forEach(function (p, key) {
    records.mark(key);
  });
  live.forEach(function (key) {
    records.mark(key);
  });
  this.live = live = new Set();
  worked.forEach(function (p, key) {
    live.add(key);
  });

  records.collect(
    function (key) {
      var p = gather(world, city, key, worked.get(key));

      if (p.going) live.add(key);

      return encode(p);
    },
    function (key, version, bytes) {
      rows.push([key, bytes === null ? null : rowOf(version, bytes)]);
    },
  );

  var keys = null;

  if (records.keysChanged) {
    keys = records.keys();
    records.keysChanged = false;
  }

  return { header: headerOf(data), rows: rows, keys: keys };
};

/**
 * A region's parts as they stand in the world (and whether anything in it
 * changes with the time alone: going).
 */
function gather(world, city, key, works) {
  var p = empty(),
    terrain = world.terrain,
    points = terrain.gridPoints,
    cleared = terrain.clearedTiles,
    bare = terrain.bareSince,
    x0 = cornerX(key),
    y0 = cornerY(key),
    x,
    y,
    t,
    v;

  p.going = false;

  for (y = y0; y < y0 + SIZE; y++)
    for (x = x0; x < x0 + SIZE; x++) {
      t = (y << 16) ^ x;
      v = points[t];
      if (v !== undefined) p.points.push([t, v]);
      if (cleared[t] !== undefined) p.cleared.push(t);
      if (bare[t] !== undefined) {
        if (terrain.bareFor(t) >= 0) {
          p.bare.push([t, bare[t]]);
          p.going = true;
        } else delete bare[t];
      }
    }

  p.points.sort(firstByTile);
  p.cleared.sort(byTile);
  p.bare.sort(firstByTile);

  var list = world.buildingService.inRegion(key),
    population = city.populationService,
    b,
    n;

  if (list.length > 0) {
    list = list.slice().sort(function (a, c) {
      return a.id - c.id;
    });

    for (var i = 0; i < list.length; i++) {
      b = list[i];
      v = city.buildingService.row(b);
      if (v.progress !== undefined) p.going = true;
      p.buildings.push(v);
      n = population.getResidents(b);
      if (n > 0) p.residents.push([b.tile, n]);
    }
    p.residents.sort(firstByTile);
  }

  if (works !== undefined) {
    p.dozers = works.dozers;
    p.waiting = works.waiting;
  }

  return p;
}

function firstByTile(a, b) {
  return byTile(a[0], b[0]);
}
