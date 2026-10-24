/**
 * Where the city is, tile by tile, for its border (client/cityborder): what
 * its buildings and roads that are part of it stand on (isometrica
 * core/city/cityroads), the tiles it holds together across, and whatever all
 * of that closes in.
 */
import Core from "isometrica/core/main";
import CityRoads from "isometrica/core/city/cityroads";
import TileIterator from "isometrica/core/tileiterator";

var Terrain = Core.Terrain;

/**
 * The city's tiles: what its buildings and roads stand on; between two of
 * them a tile apart along a row or a column, the tile between; corner to
 * corner, the two tiles the corner is between; and whatever all of that
 * closes in.
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
    i,
    j;

  function take(t) {
    if (on[t] === true) return;

    on[t] = true;
    tiles.push(t);
  }

  for (i = 0; i < members.length; i++) {
    iter = members[i].occupiedTiles();

    while (!iter.done) take(TileIterator.next(iter));
  }

  //the gaps it holds together across (CityRoads.LINKS two tiles apart)
  var footprints = tiles.slice();

  for (i = 0; i < footprints.length; i++) {
    tile = footprints[i];

    for (j = 0; j < CityRoads.LINKS.length; j++) {
      var dx = CityRoads.LINKS[j][0],
        dy = CityRoads.LINKS[j][1];

      if (Math.abs(dx) + Math.abs(dy) < 2) continue;
      if (on[tile + dx + dy * Terrain.dy] !== true) continue;

      if (dx === 0 || dy === 0) take(tile + dx / 2 + (dy / 2) * Terrain.dy);
      else {
        take(tile + dx);
        take(tile + dy * Terrain.dy);
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
