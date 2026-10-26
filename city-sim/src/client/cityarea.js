/**
 * Where the city is, tile by tile, for its border (client/cityborder): what
 * its buildings and roads that are part of it stand on (isometrica
 * core/city/cityroads) with a tile round each, and whatever all of that
 * closes in.
 */
import Core from "isometrica/core/main";
import TileIterator from "isometrica/core/tileiterator";

var Terrain = Core.Terrain;

/**
 * The city's tiles: what its buildings and roads stand on and the tiles round
 * each of them, a tile out all round, corners too - as far as a building
 * near it holds together with it, a tile between - and whatever all of that
 * closes in. A road leading nowhere is not part of the city, and has none.
 *
 * @param city {City}
 * @returns {number[]}
 */
export function area(city) {
  var members = city.roads.members(),
    on = {},
    tiles = [],
    iter,
    tile,
    dx,
    dy,
    t,
    i;

  for (i = 0; i < members.length; i++) {
    iter = members[i].occupiedTiles();

    while (!iter.done) {
      tile = TileIterator.next(iter);

      for (dy = -1; dy <= 1; dy++)
        for (dx = -1; dx <= 1; dx++) {
          t = tile + dx + dy * Terrain.dy;

          if (on[t] === true) continue;

          on[t] = true;
          tiles.push(t);
        }
    }
  }

  return closeIn(on, tiles);
}

//the tiles with whatever they close in: everything round them that can not be
//got to from outside, round the edge of the ground they cover
function closeIn(on, tiles) {
  if (tiles.length === 0) return tiles;

  var minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity,
    outside = {},
    open = [],
    x,
    y,
    t,
    i;

  for (i = 0; i < tiles.length; i++) {
    x = Terrain.extractX(tiles[i]);
    y = Terrain.extractY(tiles[i]);
    minX = Math.min(minX, x - 1);
    minY = Math.min(minY, y - 1);
    maxX = Math.max(maxX, x + 1);
    maxY = Math.max(maxY, y + 1);
  }

  function visit(x, y) {
    if (x < minX || x > maxX || y < minY || y > maxY) return;

    var t = Terrain.convertToIndex(x, y);

    if (on[t] === true || outside[t] === true) return;

    outside[t] = true;
    open.push([x, y]);
  }

  visit(minX, minY);

  while (open.length > 0) {
    t = open.pop();
    visit(t[0] + 1, t[1]);
    visit(t[0] - 1, t[1]);
    visit(t[0], t[1] + 1);
    visit(t[0], t[1] - 1);
  }

  var all = tiles.slice();

  for (y = minY; y <= maxY; y++)
    for (x = minX; x <= maxX; x++) {
      t = Terrain.convertToIndex(x, y);

      if (on[t] !== true && outside[t] !== true) all.push(t);
    }

  return all;
}
