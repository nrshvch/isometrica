/**
 * How everything on the roads drives: in its lane, keeping its distance from
 * whatever is in front of it, taking its turn at a junction, pulling in to
 * the kerb and out again, and getting past a bus standing at its stop or
 * something slow driving on in front of it.
 *
 * Whatever drives - the traffic (client/carman), the courier's car
 * (games/delivery), a bus - is a Driver: a line of points through the lanes
 * it takes, and how fast it goes along them. Each frame it looks along that
 * line, a couple of tiles ahead, for anything on it:
 *
 *   - another vehicle - it brakes to keep a gap that grows with its speed,
 *     and speeds up again as the gap opens, a little at a time, so a queue
 *     sets off one car after another rather than all at once;
 *   - a junction it has not been given - it stops short of it.
 *
 * A junction - a road tile joined up three or four ways - is taken a turn at
 * a time. A driver asks for it on the way up to it and only goes in once it
 * is given it: when nothing in it now crosses the way it goes through - two
 * going straight across each other's way, one turning left across one coming
 * the other way - and nobody who has waited longer for a way that crosses it
 * is ready to go; and only when there is room on the far side for it to come
 * out into, so that nobody stops in the middle of a junction and locks it.
 * Junctions one after the other are asked for together. A queue that backs
 * up from one into the next is a jam - and it clears the way jams do.
 *
 * A route never turns back on itself in the middle of a street (route): only
 * at a junction, taking its turn there like anything else, or at the end of
 * a road. Turning round across the lane coming the other way is what locks
 * a small town's streets.
 *
 * A bus at its stop stands in its lane, and what comes up behind it waits -
 * or goes round it: the first of them to get to it goes through the other
 * lane, when that is clear far enough ahead and there is no junction in the
 * way, and the next one only when that one is back in its lane, one at a
 * time. A car broken down pulls over to the kerb instead, out of the way
 * (Driver#pullOver).
 *
 * Positions are in tiles, as in client/carman: the middle of tile (x, y) is
 * at (x, y).
 */
import Terrain from "../core/terrain";
import * as RoadRules from "../core/roadrules";

//how far off the middle of the road a lane is, and something pulled in to
//the kerb, in tiles - the asphalt is 0.31 either side of the middle, and
//past it the pavement
var LANE = 0.15,
  PARK = 0.35,
  //how far short of the middle of its tile it stands at the kerb
  PARK_BACK = 0.2,
  //the gap kept to what is in front, standing still - and never less than
  //this, whatever happens
  MIN_GAP = 0.12,
  HARD_GAP = 0.03,
  //and how many seconds' driving more it keeps as it goes
  HEADWAY = 0.45,
  //how quickly it speeds up, tiles a second every second, and how hard it
  //slows down to stop where it is going
  ACCEL = 1.3,
  DECEL = 2.2,
  //how far either side of the line it drives along something is in its way
  CORRIDOR = 0.14,
  //two ways through a junction cross when they come closer than this - and
  //one going through it is out of the other's way this far past where they
  //do, all of it
  CONFLICT = 0.2,
  PAST = 0.08,
  //how far short of a junction it asks for it, past the gap it would brake
  //in
  ASK_AHEAD = 0.5,
  //how much slower than it is going it has to want to go to be braking,
  //tiles a second, and how long its brake lights stay on after, ms
  BRAKING = 0.12,
  BRAKE_HOLD = 400,
  //how fast what is on the far side of a junction has to be driving away for
  //one to follow it through rather than wait for it to be gone, tiles a
  //second
  AWAY = 0.6,
  //the longest step of the world taken at once, ms - a long frame is taken
  //in steps no longer than this - and the most of a frame there is to take,
  //after the game has been held a while
  MAX_DT = 50,
  MAX_FRAME = 1000,
  //how long a turn waited for is remembered without being asked again, ms
  WAIT_TTL = 600,
  //how long one waiting for a junction, held up by what is going through
  //it, lets others whose ways cross its own go first, ms
  PATIENCE = 4000,
  //how long whether a tile is a junction is taken as found, ms
  JUNCTION_TTL = 1000,
  //how far past what it overtakes it goes before pulling back in, and how
  //far ahead the other lane has to be clear on top of that
  PASS_CLEAR = 0.2,
  PASS_LOOK = 3,
  //something moving is overtaken when it wants to go this much slower than
  //the one behind it, which has followed it this long, ms - and only if it
  //can be got past within so many tiles, with a little more for speeding up
  SLOWER = 0.8,
  TRAIL_FOR = 1200,
  PASS_MOST = 5,
  //how much faster than it would otherwise it goes, going round something
  PASS_BOOST = 1.35,
  //how far ahead along the road something pulls over to the kerb, or pulls
  //back out into its lane
  PULL_OVER = 0.4;

//the four ways out of a tile: [dx, dy, tile offset]
var DIRECTIONS = [
  [1, 0, 1],
  [-1, 0, -1],
  [0, 1, Terrain.dy],
  [0, -1, -Terrain.dy],
];

//which side of a tile, -x, -y, +x, +y, each way out of it goes through
var SIDE_OF = { "-1,0": 0, "0,-1": 1, "1,0": 2, "0,1": 3 };

/**
 * Which ways a road on this tile can be driven: along x, along y or both. A
 * ramp only runs up and down its slope.
 */
function roadAxes(roadman, tile) {
  var road = roadman.getRoad(tile),
    shape = road !== null ? road.typeCode % RoadRules.PAVED : 90000;

  if (shape === 1 || shape === 3)
    return 2; //along y
  else if (shape === 2 || shape === 4) return 1; //along x

  return 3;
}

function canDrive(roadman, from, dir) {
  var to = from + dir[2],
    axis = dir[0] !== 0 ? 1 : 2,
    a = roadman.getRoad(from),
    b = roadman.getRoad(to);

  return (
    a !== null &&
    b !== null &&
    (roadAxes(roadman, from) & axis) !== 0 &&
    (roadAxes(roadman, to) & axis) !== 0 &&
    //only where the two roads meet level - never over a step, nor off the
    //side of a ramp (client/road)
    RoadRules.meets(a.surface(), SIDE_OF[dir[0] + "," + dir[1]], b.surface()) &&
    //and never against the way a one-way road goes
    RoadRules.goes(a, SIDE_OF[dir[0] + "," + dir[1]]) &&
    RoadRules.goes(b, SIDE_OF[dir[0] + "," + dir[1]])
  );
}

function neighbours(roadman, tile, out) {
  for (var i = 0; i < DIRECTIONS.length; i++)
    if (canDrive(roadman, tile, DIRECTIONS[i]))
      out.push(tile + DIRECTIONS[i][2]);

  return out;
}

/**
 * How many roads a tile is joined up with, whichever way they are driven: 1
 * the end of a road, 2 a road going on, 3 or 4 a junction.
 */
function joins(roadman, tile) {
  var n = 0;

  for (var i = 0; i < DIRECTIONS.length; i++) {
    var d = DIRECTIONS[i];

    if (
      canDrive(roadman, tile, d) ||
      canDrive(roadman, tile + d[2], [-d[0], -d[1], -d[2]])
    )
      n++;
  }

  return n;
}

function direction(from, to) {
  return [
    Terrain.extractX(to) - Terrain.extractX(from),
    Terrain.extractY(to) - Terrain.extractY(from),
  ];
}

//to the right of going d, seen from above: +x is up and to the right on the
//screen, +y up and to the left
function rightOf(d) {
  return [d[1], -d[0]];
}

function same(a, b) {
  return a !== null && b !== null && a[0] === b[0] && a[1] === b[1];
}

function tileAt(x, y) {
  return Terrain.convertToIndex(Math.round(x), Math.round(y));
}

/**
 * The points a vehicle drives through on one tile of its route, each in its
 * lane. Straight on, the middle of its lane; turning, it cuts the corner
 * where its lane meets the one it turns into - short of the middle turning
 * right, past it turning left - so it goes half way between x and y round
 * it; turning round, it swings over through the middle of the road into the
 * other lane.
 *
 * On a one-way road it can be in either lane - the right, li or lo 1, or the
 * left, -1 - coming in and going out: changing from one to the other along a
 * straight tile, turning from the one it is in into the one it goes out in.
 *
 * @param din {number[]|null} the way it comes into the tile, or null for
 *        starting on it - in the lane it leaves by
 * @param dout {number[]|null} the way it leaves, or null for stopping there
 * @param [park] {boolean} stopping there at the kerb rather than in its lane
 * @param [li] {number} the lane it comes in in, 1 or -1 - the right unless
 *        said
 * @param [lo] {number} and the lane it goes out in
 */
function tileWaypoints(out, tile, din, dout, park, li, lo) {
  var x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    r;

  li = li || 1;
  lo = lo || li;

  function wp(along, d, right, side) {
    out.push({
      tile: tile,
      x: x + d[0] * along + right[0] * side,
      y: y + d[1] * along + right[1] * side,
      din: din,
      dout: dout,
      li: li,
      lo: lo,
    });
  }

  if (din === null) {
    r = rightOf(dout);
    wp(0, dout, r, LANE * lo);
    return out;
  }

  r = rightOf(din);

  if (dout === null) {
    if (park) {
      //pulled in to the kerb from the lane, short of the middle
      wp(-0.45, din, r, LANE);
      wp(-PARK_BACK, din, r, PARK);
    } else wp(0, din, r, LANE * li);
  } else if (same(din, dout)) {
    //along it, from the one lane over to the other if it changes
    if (li === lo) wp(0, din, r, LANE * li);
    else {
      wp(-0.2, din, r, LANE * li);
      wp(0.2, din, r, LANE * lo);
    }
  } else if (din[0] === -dout[0] && din[1] === -dout[1]) {
    //turning round: round a half circle on past the middle
    wp(0.02, din, r, LANE);
    wp(0.17, din, r, LANE / 2);
    wp(0.17, din, r, -LANE / 2);
    wp(0.02, din, r, -LANE);
  } else {
    var right = same(dout, r),
      //the turn on the inside of it - right from the right lane, left from
      //the left - short of the middle, the other past it
      cut = right === li > 0 ? 0.17 : 0.27,
      ro = rightOf(dout),
      kx = (r[0] * li + ro[0] * lo) * LANE,
      ky = (r[1] * li + ro[1] * lo) * LANE;

    out.push({
      tile: tile,
      x: x + kx - din[0] * cut,
      y: y + ky - din[1] * cut,
      din: din,
      dout: dout,
      li: li,
      lo: lo,
    });
    out.push({
      tile: tile,
      x: x + kx + dout[0] * cut,
      y: y + ky + dout[1] * cut,
      din: din,
      dout: dout,
      li: li,
      lo: lo,
    });
  }

  return out;
}

/**
 * The points a vehicle drives through along a route.
 *
 * @param route {number[]} road tiles
 * @param [from] {number[]} the way it came into the first tile; it is
 *        already in that lane. Without it it starts in the middle of the
 *        first tile, in the lane it leaves by.
 * @param [park] {boolean} pulling in to the kerb at the end of it
 * @param [lanes] {boolean} false to keep to the right lane all the way, a
 *        one-way road's too - a bus, whose stops are at the kerb
 * @param [start] {number} the lane it is in on the first tile, 1 or -1
 */
function routeWaypoints(route, from, park, lanes, start) {
  var out = [],
    last = route.length - 1,
    L = lanes === false || park === true ? null : planLanes(route, from, start),
    i;

  for (i = 0; i <= last; i++)
    tileWaypoints(
      out,
      route[i],
      i === 0 ? from || null : direction(route[i - 1], route[i]),
      i === last ? null : direction(route[i], route[i + 1]),
      park === true,
      L === null ? 1 : L[i],
      L === null ? 1 : i < last ? L[i + 1] : L[i],
    );

  return out;
}

/*
 * A one-way road has two lanes going its way, and the traffic uses both:
 * each car takes either as it comes onto it - at random, so the two fill
 * alike - and keeps to it, but for its turns: LANE_AHEAD tiles short of a
 * junction it turns right at, it is in the right lane; of one it turns left
 * at, in the left; and short of where it comes off onto a road both ways, in
 * the right. Turning onto one, it turns into the nearer lane - right into
 * the right, left into the left. It changes lane only along the road, never
 * in a junction. On any other road it keeps to the right.
 */

//the traffic, for which roads are one-way and which tiles junctions - the
//last Traffic made
var laneTraffic = null;

//how many tiles short of where it turns a car is in the lane it turns from
var LANE_AHEAD = 2,
  //and how far on it looks for how busy each lane is, and how many more in
  //the right lane than in the left make it busy
  LANE_LOOK = 4,
  LANE_BUSY = 2,
  //how often a car on a one-way road sees whether it would be better off in
  //the other lane, ms
  LANE_EVERY = 600,
  //how many tiles before the end of its way the next is joined on - in time
  //to be in the lane for a turn at the start of it
  NEAR_TILES = LANE_AHEAD + 2;

function heading(d) {
  return [Math.round(d.hx), Math.round(d.hy)];
}

function oneWayAt(tile) {
  var road = laneTraffic.roadman.getRoad(tile);

  return road !== null && RoadRules.wayOf(road.data) >= 0;
}

/**
 * The lane of each tile of a route as it comes into it: 1 the right, -1 the
 * left - the left only ever on a one-way road, or a junction on one.
 */
function planLanes(route, from, start) {
  var last = route.length - 1,
    L = [],
    i;

  if (laneTraffic === null) {
    for (i = 0; i <= last; i++) L.push(1);
    return L;
  }

  var one = [],
    cross = [],
    din = [],
    dout = [];

  for (i = 0; i <= last; i++) {
    one.push(oneWayAt(route[i]));
    cross.push(laneTraffic.isJunction(route[i]));
    din.push(i === 0 ? from || null : direction(route[i - 1], route[i]));
    dout.push(i === last ? null : direction(route[i], route[i + 1]));
  }

  function turns(j) {
    return din[j] !== null && dout[j] !== null && !same(din[j], dout[j]);
  }

  //the lane it has to be in coming into tile i, if any: for the first
  //junction it turns at, LANE_AHEAD tiles short of it, through any it goes
  //straight over; and for a road both ways, just short of it
  function needAt(i) {
    for (var j = i, along = 0; j <= Math.min(last, i + LANE_AHEAD); j++) {
      if (cross[j]) {
        if (turns(j)) return same(dout[j], rightOf(din[j])) ? 1 : -1;
      } else if (!one[j]) return along === 0 ? 1 : 0;
      else along++;
    }

    return 0;
  }

  var given = start === 1 || start === -1;

  //the right lane, unless it is busy - LANE_BUSY more going its way in it
  //than in the left, from tile i a little way on
  function choose(i) {
    return laneCount(route, din, i, 1) >=
      laneCount(route, din, i, -1) + LANE_BUSY
      ? -1
      : 1;
  }

  function bothWays(j) {
    return !one[j] && !cross[j];
  }

  //just onto a stretch of one-way road - off a road both ways, or out of a
  //junction - where it picks its lane
  function fresh(j) {
    return j === 0 ? !given : bothWays(j - 1) || cross[j - 1];
  }

  L.push(!one[0] && !cross[0] ? 1 : given ? start : !cross[0] ? choose(0) : 1);

  for (i = 0; i < last; i++) {
    var lane = L[i],
      next;

    if (!one[i + 1] && !cross[i + 1]) next = 1;
    else if (cross[i])
      //straight over a junction in the lane it is in; turning, into the
      //nearer lane of a one-way road
      next = !turns(i)
        ? lane
        : one[i + 1] && !cross[i + 1] && !same(dout[i], rightOf(din[i]))
          ? -1
          : 1;
    else if (!one[i])
      //onto a one-way road off one both ways: in the right lane, to begin
      //with
      next = 1;
    else {
      var need = needAt(i + 1);

      //just onto it: the right lane unless that is busy, or it has to be in
      //the left; and on along it in that lane
      next = need || (fresh(i) ? choose(i) : lane);

      //not across from one to the other in a bend, unless it turns straight
      //after it
      if (turns(i) && next !== lane && !(cross[i + 1] && turns(i + 1)))
        next = lane;
    }

    L.push(next);
  }

  return L;
}

/**
 * How many are going the way a route goes in lane `lane` of its one-way
 * road, from its tile i on along it for LANE_LOOK tiles.
 */
function laneCount(route, din, i, lane) {
  var n = 0;

  for (var j = i; j < route.length && j <= i + LANE_LOOK; j++) {
    var here = laneTraffic.index.get(route[j]),
      d = j === 0 ? din : direction(route[j - 1], route[j]);

    if (!d || laneTraffic.isJunction(route[j]) || !oneWayAt(route[j])) break;
    if (here !== undefined)
      for (var k = 0; k < here.length; k++)
        if (
          !here[k].parked &&
          same(d, heading(here[k])) &&
          here[k].lane() === lane
        )
          n++;
  }

  return n;
}

//what turning round costs a route, on top of the tile it takes: a way that
//goes round the block is taken over one that turns back, if it is no longer
var TURN_ROUND = 8,
  //the most a search for a route looks at before it gives up
  ROUTE_LIMIT = 40000;

/**
 * The way from one road tile to another, both ends included - just the one
 * when they are the same, empty when there is no way.
 *
 * It never turns back on itself where the road just goes on, along a
 * street or round a bend: a car turning round there swings across the lane
 * coming the other way, and what is coming waits for it while what is
 * behind it waits too - in a small town that is how the streets lock up.
 * It only turns round at a junction - three or four roads joined - where it
 * takes its turn like anything else going through, or at the end of a road,
 * where there is nobody coming. Not where a road both ways ends in a
 * one-way one coming into it: there is no going on there, but it is no dead
 * end - what comes off the one-way road would wait for it. So the way it
 * finds can go on past where it is going to turn round at the next junction
 * and come back - the same tiles twice.
 *
 * And it gets to `end` going a way it can go on from - not up the end of a
 * road like that, with nowhere to go on to but back - if it can at all.
 *
 * @param start {number}
 * @param from {number[]|null} the way it is going on start - it turns back
 *        there only where it could anywhere - or null for not going any way
 *        yet
 * @param end {number}
 * @param next {function(number, number[]): number[]} fills out with the
 *        road tiles that can be driven to straight from a tile
 * @returns {number[]}
 */
function route(start, from, end, next) {
  if (start === end) return [start];

  //the search goes by tile and the way it came into it: key tile * 5 + way
  var ex = Terrain.extractX(end),
    ey = Terrain.extractY(end),
    g = new Map(),
    parent = new Map(),
    closed = new Set(),
    turns = new Map(),
    heap = [],
    out = [],
    looked = 0;

  function keyOf(tile, d) {
    return tile * 5 + (d === null ? 4 : dirIndex(d));
  }

  //whether a car can turn round on tile: anywhere but where the road just
  //goes on, two roads joined to it - whichever ways they are driven
  function turnable(tile) {
    var known = turns.get(tile);

    if (known === undefined) {
      if (laneTraffic !== null) known = joins(laneTraffic.roadman, tile) !== 2;
      else {
        out.length = 0;
        known = next(tile, out).length !== 2;
      }
      turns.set(tile, known);
    }

    return known;
  }

  //whether a car on tile, come into it going din, can go on from there
  //without turning round where it may not: on along the road from there to
  //a junction or the end of a road - somewhere it can turn round, or go
  //another way - not up a road it can only come back down
  function onFrom(tile, din) {
    var seen = new Set(),
      steps = [];

    for (var n = 0; n < ROUTE_LIMIT; n++) {
      if (din === null || turnable(tile)) return true;

      var key = tile * 5 + dirIndex(din);

      //round and round a loop: it can keep going
      if (seen.has(key)) return true;
      seen.add(key);

      steps.length = 0;
      next(tile, steps);

      var on = null;

      for (var i = 0; i < steps.length; i++) {
        var d = direction(tile, steps[i]);

        if (d[0] !== -din[0] || d[1] !== -din[1]) {
          on = steps[i];
          din = d;
          break;
        }
      }

      if (on === null) return false;
      tile = on;
    }

    return true;
  }

  function push(f, key) {
    var i = heap.length;

    heap.push([f, key]);

    while (i > 0) {
      var up = (i - 1) >> 1;

      if (heap[up][0] <= heap[i][0]) break;

      var t = heap[up];
      heap[up] = heap[i];
      heap[i] = t;
      i = up;
    }
  }

  function pop() {
    var top = heap[0],
      last = heap.pop();

    if (heap.length > 0) {
      heap[0] = last;

      for (var i = 0; ;) {
        var l = 2 * i + 1,
          r = l + 1,
          m = i;

        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === i) break;

        var t = heap[m];
        heap[m] = heap[i];
        heap[i] = t;
        i = m;
      }
    }

    return top;
  }

  function h(tile) {
    return (
      Math.abs(Terrain.extractX(tile) - ex) +
      Math.abs(Terrain.extractY(tile) - ey)
    );
  }

  var first = keyOf(start, from),
    ways = [],
    //the way there, got to going a way it cannot go on from - if there is
    //no other
    stuck = null;

  g.set(first, 0);
  push(h(start), first);

  while (heap.length > 0 && looked++ < ROUTE_LIMIT) {
    var key = pop()[1];

    if (closed.has(key)) continue;
    closed.add(key);

    var tile = Math.floor(key / 5),
      came = key % 5,
      din = came === 4 ? null : DIRS[came];

    if (tile === end) {
      var tiles = [tile];

      for (var k = key; parent.has(k);) {
        k = parent.get(k);
        tiles.push(Math.floor(k / 5));
      }

      tiles.reverse();

      if (onFrom(tile, din)) return tiles;
      if (stuck === null) stuck = tiles;
    }

    ways.length = 0;
    next(tile, ways);

    for (var i = 0; i < ways.length; i++) {
      var to = ways[i],
        d = direction(tile, to),
        back = din !== null && d[0] === -din[0] && d[1] === -din[1];

      if (back && !turnable(tile)) continue;

      var k = keyOf(to, d),
        cost = g.get(key) + 1 + (back ? TURN_ROUND : 0);

      if (closed.has(k) || (g.has(k) && g.get(k) <= cost)) continue;

      g.set(k, cost);
      parent.set(k, key);
      push(cost + h(to), k);
    }
  }

  return stuck || [];
}

/**
 * Where something stands pulled in at the kerb of tile, facing d.
 */
function kerb(tile, d) {
  var r = rightOf(d);

  return {
    x: Terrain.extractX(tile) - d[0] * PARK_BACK + r[0] * PARK,
    y: Terrain.extractY(tile) - d[1] * PARK_BACK + r[1] * PARK,
  };
}

//the four ways in and out of a tile, by number: +x, -x, +y, -y
function dirIndex(d) {
  return d[0] === 1 ? 0 : d[0] === -1 ? 1 : d[1] === 1 ? 2 : 3;
}

var DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function segmentDistance(px, py, ax, ay, bx, by) {
  var dx = bx - ax,
    dy = by - ay,
    l = dx * dx + dy * dy,
    t = l === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l;

  t = t < 0 ? 0 : t > 1 ? 1 : t;

  var ex = ax + dx * t - px,
    ey = ay + dy * t - py;

  return Math.sqrt(ex * ex + ey * ey);
}

/**
 * Whether two ways through a junction tile cross: the lines they drive along
 * through it - from the edge they come in at to the one they go out at, in
 * the lanes they are in - come closer than CONFLICT. Two coming in the same
 * way in the same lane never do: the one behind just follows the other.
 * And for two that do, how far along the first it is that the two come
 * together for the last time: past that, with all of it, it is out of the
 * other's way. Each worked out the first time it is asked for, and kept.
 */

//a tile, and where its middle is
var LINE_TILE = Terrain.convertToIndex(100, 100);

//the line a way through a junction drives along, from the middle of the
//tile: in by way a (DIRS) in lane li, out by way b in lane lo
var lines = new Map();

function lineOf(a, b, li, lo) {
  li = li || 1;
  lo = lo || 1;

  var key = a * 16 + b * 4 + (li < 0 ? 2 : 0) + (lo < 0 ? 1 : 0),
    line = lines.get(key);

  if (line === undefined) {
    var din = DIRS[a],
      dout = DIRS[b],
      r = rightOf(din),
      ro = rightOf(dout);

    line = [
      [-din[0] * 0.5 + r[0] * LANE * li, -din[1] * 0.5 + r[1] * LANE * li],
    ];
    tileWaypoints([], LINE_TILE, din, dout, false, li, lo).forEach(
      function (p) {
        line.push([p.x - 100, p.y - 100]);
      },
    );
    line.push([
      dout[0] * 0.5 + ro[0] * LANE * lo,
      dout[1] * 0.5 + ro[1] * LANE * lo,
    ]);
    lines.set(key, line);
  }

  return line;
}

//how close two lines come: every so often along one, to the other
function apart(p, q) {
  var best = Infinity,
    i,
    j,
    k;

  for (i = 0; i + 1 < p.length; i++)
    for (k = 0; k <= 10; k++) {
      var mx = p[i][0] + ((p[i + 1][0] - p[i][0]) * k) / 10,
        my = p[i][1] + ((p[i + 1][1] - p[i][1]) * k) / 10;

      for (j = 0; j + 1 < q.length; j++)
        best = Math.min(
          best,
          segmentDistance(mx, my, q[j][0], q[j][1], q[j + 1][0], q[j + 1][1]),
        );
    }

  return best;
}

//how far along p it is that p last comes closer to q than CONFLICT
function lastNear(p, q) {
  var last = -Infinity,
    at = 0,
    i,
    j,
    k;

  for (i = 0; i + 1 < p.length; i++) {
    var l = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);

    for (k = 0; k <= 10; k++) {
      var mx = p[i][0] + ((p[i + 1][0] - p[i][0]) * k) / 10,
        my = p[i][1] + ((p[i + 1][1] - p[i][1]) * k) / 10;

      for (j = 0; j + 1 < q.length; j++)
        if (
          segmentDistance(mx, my, q[j][0], q[j][1], q[j + 1][0], q[j + 1][1]) <
          CONFLICT
        )
          last = at + (l * k) / 10;
    }

    at += l;
  }

  return last;
}

//a way through by number, its lanes and all: 0..63
function moveKey(m) {
  return (
    m.i * 16 + m.o * 4 + ((m.li || 1) < 0 ? 2 : 0) + ((m.lo || 1) < 0 ? 1 : 0)
  );
}

var pairs = new Map();

//{cross, clear} for way m against way n (see above)
function pairOf(m, n) {
  var key = moveKey(m) * 64 + moveKey(n),
    pair = pairs.get(key);

  if (pair === undefined) {
    var lm = lineOf(m.i, m.o, m.li, m.lo),
      ln = lineOf(n.i, n.o, n.li, n.lo),
      cross =
        !(m.i === n.i && (m.li || 1) === (n.li || 1)) &&
        Math.min(apart(lm, ln), apart(ln, lm)) < CONFLICT;

    pair = { cross: cross, clear: cross ? lastNear(lm, ln) : -Infinity };
    pairs.set(key, pair);
  }

  return pair;
}

function crosses(m, n) {
  return pairOf(m, n).cross;
}

/**
 * Whether h, going through junction tile its way, is in the way of a car
 * that would go through it m's way: where their ways cross, and not yet past
 * where they do with the whole of it - so a car does not wait for one that
 * crosses its way to be off the junction, only out of its way.
 */
function inWay(h, m, tile) {
  var pair = pairOf(h, m);

  if (!pair.cross) return false;

  var d = h.d,
    line = lineOf(h.i, h.o, h.li, h.lo),
    px = d.x - Terrain.extractX(tile),
    py = d.y - Terrain.extractY(tile);

  return alongLine(line, px, py) - d.length / 2 < pair.clear + PAST;
}

//how far along a line through a tile the point nearest x, y is - less than
//0 short of where it comes into it
function alongLine(line, x, y) {
  var best = Infinity,
    found = 0,
    at = 0;

  for (var i = 0; i + 1 < line.length; i++) {
    var ax = line[i][0],
      ay = line[i][1],
      dx = line[i + 1][0] - ax,
      dy = line[i + 1][1] - ay,
      l = Math.sqrt(dx * dx + dy * dy),
      t = l === 0 ? 0 : ((x - ax) * dx + (y - ay) * dy) / (l * l);

    //before the first point, along the way it comes in
    if (i > 0 || t > 0) t = Math.max(0, t);
    t = Math.min(1, t);

    var ex = ax + dx * t - x,
      ey = ay + dy * t - y,
      e = ex * ex + ey * ey;

    if (e < best) {
      best = e;
      found = at + t * l;
    }

    at += l;
  }

  return found;
}

var nextId = 1;

/**
 * Something that drives the roads.
 *
 * @param traffic {Traffic}
 * @param length {number} how long it is, in tiles
 * @param width {number} and how wide
 * @param owner {{nearEnd: function(Driver), end: function(Driver)}} told as
 *        it starts on the last bit of its way - when it can be given more of
 *        it - and when it gets to the end of it
 * @constructor
 */
function Driver(traffic, length, width, owner) {
  this.id = nextId++;
  this.traffic = traffic;
  this.length = length;
  this.width = width;
  this.owner = owner;
  this.wps = [];
  this.target = 0;
  this.x = 0;
  this.y = 0;
  //the way it is going, a unit long
  this.hx = 1;
  this.hy = 0;
  this.v = 0;
  //how fast it would go with nothing in its way, tiles a second
  this.v0 = 1.4;
  //standing in its lane for a while - a bus at its stop - to be gone round
  //by the traffic behind it
  this.passable = false;
  //pulled in at the kerb, out of everybody's way
  this.parked = false;
  //whether it stops at the end of its way, rather than driving on into
  //whatever it is given next - and whether there it pulls in to the kerb,
  //or stands in its lane
  this.stopAtEnd = false;
  this.pullIn = false;
  //on its way to the kerb, broken down: it stands there once it gets there
  this.pullingOver = false;
  //what it is keeping its distance from, as last found
  this.leader = null;
  //why it stands, if it does: "queue", "junction", "merge", "stop", "kerb",
  //""
  this.held = "";
  //the change of lane on a one-way road just ahead of it, if any - over
  //into the other lane, and whether it waits for room there (crossingAhead)
  //- and how long it has waited for room, ms
  this.merging = null;
  this.mergeWaited = 0;
  //the junction tiles it has been given, and those of them it has been on
  //- once it is off one of those again, it is through it
  this.grants = [];
  this.entered = new Set();
  //going round what stands in front of it - and to that one, the car going
  //round it now
  this.overtaking = null;
  this.passBack = -1;
  this.passer = null;
  //the way it was last told it is near the end of
  this.nearFor = null;
  //how long it has followed something slow, ms
  this.trailed = 0;
  //how fast the road it was last on is driven, and which tile that was
  //(pace)
  this.paceAt = -1;
  this.paceOf = 1;
  this.alive = true;
  //since when it has waited for the junction ahead of it, or -1
  this.asked = -1;
  //whether it is on the brakes, for its brake lights - and when it last was
  this.braking = false;
  this.brakedAt = -Infinity;
  //which way it turns at the next junction (turnAhead), as worked out for
  //which way and how far along it
  this.turn = 0;
  this.turnFor = null;
  this.turnAt = -1;
}

/**
 * Puts it at the start of a new way, and on it. Whatever junctions it was
 * given on the old one are let go.
 */
Driver.prototype.setPath = function (wps) {
  this.traffic.releaseAll(this);
  this.asked = -1;
  this.endOvertake();
  this.wps = wps;
  this.target = wps.length > 1 ? 1 : 0;
  this.parked = false;
  this.pullingOver = false;

  if (wps.length > 0) {
    this.x = wps[0].x;
    this.y = wps[0].y;
    this.aim();
  }
};

/**
 * Joins more on to the end of its way, from the tile it is going to last -
 * so it drives straight on into it. What is behind it is dropped, and the
 * last point of the old way: the new one starts on that same tile.
 */
Driver.prototype.extend = function (next) {
  var wps = this.wps.slice(this.target - 1, this.wps.length - 1),
    i;

  for (i = 0; i < next.length; i++) wps.push(next[i]);

  if (this.passBack !== -1) this.passBack -= this.target - 1;
  this.wps = wps;
  this.target = 1;
};

/**
 * Where it could go another way, stood first at a junction because the way
 * it goes out of it is jammed - something standing there, not driving on
 * away - and not just waiting for the traffic across it: the junction, the
 * way it comes into it, where on its way it does, and every other way out
 * of it that has its lane clear - never back the way it came. Null when it
 * is not jammed there, or there is no other way.
 *
 * @returns {{tile: number, din: number[], at: number, outs: number[][]}|null}
 */
Driver.prototype.jammedAt = function () {
  if (this.held !== "junction" || this.passBack !== -1 || this.stopAtEnd)
    return null;

  //as far ahead as it looks for one as it drives (step)
  var junction = this.junctionAhead(
      this.length / 2 + MIN_GAP + this.v0 * HEADWAY + 2.4,
    ),
    wps = this.wps,
    k;

  if (junction === null || junction.out < 0 || junction.stop < 0) return null;

  var exit = this.scan(junction.out, junction.out + this.length + MIN_GAP * 2);

  if (exit === null || drivingAway(this, exit.driver)) return null;

  var tile = junction.tiles[0];

  for (k = this.target; k < wps.length && wps[k].tile !== tile; k++);

  if (k >= wps.length || wps[k].din === null || wps[k].dout === null)
    return null;

  var din = wps[k].din,
    dout = wps[k].dout,
    outs = [];

  for (var i = 0; i < DIRECTIONS.length; i++) {
    var d = DIRECTIONS[i];

    if (d[0] === -din[0] && d[1] === -din[1]) continue;
    if (d[0] === dout[0] && d[1] === dout[1]) continue;
    if (!canDrive(this.traffic.roadman, tile, d)) continue;
    if (!this.traffic.laneFree(tile + d[2], d)) continue;

    outs.push([d[0], d[1]]);
  }

  return outs.length > 0 ? { tile: tile, din: din, at: k, outs: outs } : null;
};

/**
 * The tile it is on, from where it is - not from its way, which may have
 * gone from under it.
 */
Driver.prototype.here = function () {
  return tileAt(this.x, this.y);
};

/**
 * Which lane it is in, going the way it goes: 1 the right, -1 the left - of
 * a one-way road, where it can be in either.
 */
Driver.prototype.lane = function () {
  var hx = Math.round(this.hx),
    hy = Math.round(this.hy),
    //how far right of the middle of the road it is (rightOf)
    side =
      (this.x - Math.round(this.x)) * hy - (this.y - Math.round(this.y)) * hx;

  return side < -LANE / 2 ? -1 : 1;
};

/**
 * Drives on from where it is, at the speed it is going, along next instead
 * of the rest of its way - a way that starts on the tile it is on, the way
 * it is going: what of that is behind it is left out.
 */
Driver.prototype.redirect = function (next) {
  var d = [Math.round(this.hx), Math.round(this.hy)],
    here = this.here(),
    v = this.v;

  while (
    next.length > 1 &&
    next[0].tile === here &&
    (next[0].x - this.x) * d[0] + (next[0].y - this.y) * d[1] < 0.05
  )
    next.shift();

  this.setPath(
    [{ tile: here, x: this.x, y: this.y, din: d, dout: d }].concat(next),
  );
  this.stopAtEnd = this.pullIn = false;
  this.v = v;
};

/**
 * Goes another way from point `at` of its way on: next instead of the rest
 * of it - starting in the same tile, the way it comes into it.
 */
Driver.prototype.divert = function (at, next) {
  var wps = this.wps.slice(this.target - 1, at),
    i;

  for (i = 0; i < next.length; i++) wps.push(next[i]);

  this.wps = wps;
  this.target = 1;
};

//the tile it was last on the way through
Driver.prototype.tile = function () {
  return this.wps.length === 0
    ? -1
    : this.wps[Math.max(0, this.target - 1)].tile;
};

/**
 * The last point of its way, and the way it came into it.
 */
Driver.prototype.last = function () {
  var wps = this.wps;

  return wps.length === 0 ? null : wps[wps.length - 1];
};

//points the way it goes along the bit of its way it is on
Driver.prototype.aim = function () {
  var wps = this.wps,
    to = wps[this.target],
    from = wps[Math.max(0, this.target - 1)];

  if (to === undefined || from === to) return;

  var dx = to.x - from.x,
    dy = to.y - from.y,
    l = Math.sqrt(dx * dx + dy * dy);

  if (l > 1e-6) {
    this.hx = dx / l;
    this.hy = dy / l;
  }
};

//the pieces of its way ahead of it, as far as far: [ax, ay, bx, by, from,
//length, index of b] each - kept from one call to the next, each piece
//too (SEG_KEPT): filled in again, not made again, three or four times a car
//a frame. Whoever reads them reads them there and then, never keeps one
var SEG = [],
  SEG_KEPT = [];

function ahead(self, far) {
  var wps = self.wps,
    n = 0,
    at = 0,
    ax = self.x,
    ay = self.y,
    i,
    b,
    l,
    s;

  for (i = self.target; i < wps.length && at <= far; i++) {
    b = wps[i];
    l = Math.sqrt((b.x - ax) * (b.x - ax) + (b.y - ay) * (b.y - ay));

    if (l > 1e-6) {
      s = SEG_KEPT[n];
      if (s === undefined) s = SEG_KEPT[n] = [0, 0, 0, 0, 0, 0, 0];
      s[0] = ax;
      s[1] = ay;
      s[2] = b.x;
      s[3] = b.y;
      s[4] = at;
      s[5] = l;
      s[6] = i;
      SEG[n++] = s;
      at += l;
    }

    ax = b.x;
    ay = b.y;
  }

  SEG.length = n;

  return at;
}

//how far along SEG a point is that lies on it, within CORRIDOR either side
//of it - or -1 when it is not on it
function onWay(px, py, from, to) {
  var best = -1;

  for (var i = 0; i < SEG.length; i++) {
    var s = SEG[i],
      dx = s[2] - s[0],
      dy = s[3] - s[1],
      t = ((px - s[0]) * dx + (py - s[1]) * dy) / (s[5] * s[5]);

    if (t < 0 || t > 1) continue;

    var ex = s[0] + dx * t - px,
      ey = s[1] + dy * t - py;

    if (ex * ex + ey * ey > CORRIDOR * CORRIDOR) continue;

    var along = s[4] + t * s[5];

    if (along >= from && along <= to && (best === -1 || along < best))
      best = along;
  }

  return best;
}

/**
 * The nearest thing on its way between from and to, measured from its
 * middle along its way: {along, driver}, or null. Something parked at the
 * kerb is not in the way, nor the car it is going round.
 */
Driver.prototype.scan = function (from, to) {
  var traffic = this.traffic,
    best = null,
    seen = traffic.seen,
    tiles = traffic.tilesAlong(SEG, to),
    i,
    j,
    k;

  seen.clear();

  for (i = 0; i < tiles.length; i++) {
    var here = traffic.index.get(tiles[i]);

    if (here === undefined) continue;

    for (j = 0; j < here.length; j++) {
      var d = here[j];

      if (d === this || seen.has(d) || d.parked || d === this.overtaking)
        continue;
      seen.add(d);

      //what is behind it going the same way is never in its way, however
      //close up behind it it is
      if (behind(this, d)) continue;

      //two that each have the other in their way would wait for each other
      //for good: the first one out goes, the other waits for it - but never
      //into the back of one in front of it going the same way
      if (d.leader === this && this.id < d.id && !inFront(this, d)) continue;

      //one in the other lane ahead of it, about to come over into this one:
      //room left for it where it comes in - as long as it can still stop
      //short of there
      var mg = d.merging;

      if (mg !== null && mg.at < MERGE_LOOK && letIn(this, d, mg)) {
        var into = onWay(mg.x, mg.y, from, to + d.length);

        if (
          into !== -1 &&
          into - d.length / 2 - this.length / 2 >= MIN_GAP / 2 &&
          (best === null || into - d.length / 2 < best.along)
        )
          best = { along: into - d.length / 2, driver: d };
      }

      //along it, from the back of it to the front
      for (k = 0; k <= 4; k++) {
        var o = ((k - 2) / 4) * d.length,
          along = onWay(d.x + d.hx * o, d.y + d.hy * o, from, to);

        if (along !== -1 && (best === null || along < best.along))
          best = { along: along, driver: d };
      }
    }
  }

  return best;
};

//whether other is behind self, going the same way
function behind(self, other) {
  return (
    self.hx * other.hx + self.hy * other.hy > 0.7 &&
    (other.x - self.x) * self.hx + (other.y - self.y) * self.hy < 0
  );
}

//whether other is in front of self, going the same way
function inFront(self, other) {
  return (
    self.hx * other.hx + self.hy * other.hy > 0.7 &&
    (other.x - self.x) * self.hx + (other.y - self.y) * self.hy > 0
  );
}

/*
 * Changing lanes on a one-way road - for a turn coming up, or out of a queue
 * - a car waits at the start of the change, still in its own lane, till
 * there is room for it in the other: nothing there alongside where it comes
 * in, nor coming up close behind (Traffic#mergeBlocker). One coming up that
 * lane behind it that can still stop short lets it in, zip-fashion (scan);
 * of two level with each other that each want the other's lane, the one
 * behind puts its change off a tile, or with a junction next turns from the
 * lane it is in (putOffMerge). Without this, one would cut across into a car alongside and each
 * wait for the other for good.
 */

//how far short of where it comes over a car about to change lanes is let in
//by those coming up the lane it goes into, tiles
var MERGE_LOOK = 1.2,
  //how long it waits for room in the other lane before it gives up
  //changing lanes, ms (keepLane)
  MERGE_WAIT = 2500;

/**
 * The change of lane just ahead of it along its way, as far as far, if any:
 * where it starts, along its way from its middle; where it ends, in the
 * other lane; the way the road goes; and the lane it goes into, 1 the right,
 * -1 the left. Swinging over the width of a lane along a straight bit of
 * one-way road - not to or from the kerb, nor round in a turn.
 */
function crossingAhead(self, far) {
  ahead(self, far);

  for (var i = 0; i < SEG.length; i++) {
    var sg = SEG[i],
      p = self.wps[sg[6]],
      d = p.din;

    if (d === null || (p.dout !== null && !same(d, p.dout))) continue;

    var r = rightOf(d),
      tx = Terrain.extractX(p.tile),
      ty = Terrain.extractY(p.tile),
      a = (sg[0] - tx) * r[0] + (sg[1] - ty) * r[1],
      b = (sg[2] - tx) * r[0] + (sg[3] - ty) * r[1];

    if (Math.abs(a - b) > LANE * 1.5 && Math.abs(Math.abs(b) - LANE) < 0.03)
      return {
        at: sg[4],
        x: sg[2],
        y: sg[3],
        hx: d[0],
        hy: d[1],
        lane: b > 0 ? 1 : -1,
        waiting: false,
      };
  }

  return null;
}

//whether self, waiting to come over into the lane `other` is in, is behind
//it - or level with it and last of the two - while `other` waits to come over
//into self's
function swapsWith(self, other, m) {
  var mg = other.merging;

  if (mg === null || !mg.waiting || mg.lane === m.lane) return false;

  var lead = (other.x - self.x) * m.hx + (other.y - self.y) * m.hy;

  return lead > 0.05 || (lead > -0.05 && other.id < self.id);
}

/**
 * Puts off the change of lane just ahead of it till the next tile: on in the
 * lane it is in to there, and over from there. With a junction there, there
 * is no more room to change in: it keeps to the lane it is in into the
 * junction, and turns from that one. Whether it did either.
 */
Driver.prototype.putOffMerge = function () {
  var wps = this.wps,
    here = this.here(),
    tiles = [here],
    heading = [Math.round(this.hx), Math.round(this.hy)],
    lane = this.lane(),
    i;

  for (i = this.target; i < wps.length; i++)
    if (wps[i].tile !== tiles[tiles.length - 1]) {
      if (tiles.indexOf(wps[i].tile) !== -1) return false;
      tiles.push(wps[i].tile);
    }

  if (tiles.length < 3 || !same(direction(tiles[0], tiles[1]), heading))
    return false;

  if (!this.traffic.isJunction(tiles[1])) {
    if (!oneWayAt(tiles[1])) return false;

    this.redirect(routeWaypoints(tiles.slice(1), heading, false, true, lane));
    return true;
  }

  //on this tile in its lane, and from the junction on from that lane
  var next = tileWaypoints(
    [],
    here,
    heading,
    heading,
    false,
    lane,
    lane,
  ).concat(routeWaypoints(tiles.slice(1), heading, false, true, lane));

  while (
    next.length > 1 &&
    (next[0].x - this.x) * heading[0] + (next[0].y - this.y) * heading[1] < 0.05
  )
    next.shift();

  this.redirect(next);

  return true;
};

/**
 * Gives up changing lanes: on in the lane it is in up to the next junction
 * on its way, and through that from this lane - turning from the lane it
 * was to have changed out of, which the junction's turns allow for. For a
 * car that has waited long enough for room in the other lane (MERGE_WAIT):
 * where the traffic stands in both, round a roundabout most of all, it
 * would otherwise wait for good, and all behind it. Whether it did.
 */
Driver.prototype.keepLane = function () {
  var wps = this.wps,
    here = this.here(),
    tiles = [here],
    heading = [Math.round(this.hx), Math.round(this.hy)],
    lane = this.lane(),
    traffic = this.traffic,
    next = [],
    i;

  for (i = this.target; i < wps.length; i++)
    if (wps[i].tile !== tiles[tiles.length - 1]) {
      if (tiles.indexOf(wps[i].tile) !== -1) return false;
      tiles.push(wps[i].tile);
    }

  if (tiles.length < 2 || !same(direction(tiles[0], tiles[1]), heading))
    return false;

  //up to the junction, in its lane
  for (i = 0; i < tiles.length - 1 && !traffic.isJunction(tiles[i]); i++)
    tileWaypoints(
      next,
      tiles[i],
      i === 0 ? heading : direction(tiles[i - 1], tiles[i]),
      direction(tiles[i], tiles[i + 1]),
      false,
      lane,
      lane,
    );

  next = next.concat(
    routeWaypoints(
      tiles.slice(i),
      i === 0 ? heading : direction(tiles[i - 1], tiles[i]),
      false,
      true,
      lane,
    ),
  );

  while (
    next.length > 1 &&
    (next[0].x - this.x) * heading[0] + (next[0].y - this.y) * heading[1] < 0.05
  )
    next.shift();

  this.redirect(next);
  this.mergeWaited = 0;

  return true;
};

//whether self, in the lane `other` is coming over into, lets it in: it is
//ahead of self - or level with it, and first of the two
function letIn(self, other, mg) {
  if (self.hx * mg.hx + self.hy * mg.hy < 0.7) return false;

  var lead = (other.x - self.x) * mg.hx + (other.y - self.y) * mg.hy;

  return lead > 0.05 || (lead > -0.05 && other.id < self.id);
}

//how far ahead along its way a driver looks for a change of lane - going
//round something, pulling out from the kerb or in to it - tiles, and how far
//its way has to swing off the way the road goes for that to be one (the sine
//of the angle)
var SIGNAL_AHEAD = 1,
  //how far short of where it pulls back in from going round something it
  //shows it will, tiles
  PASS_BACK_SIGNAL = 0.6,
  SIGNAL_SWING = 0.4,
  //and how many points of its way it looks along for where it turns
  TURN_LOOK = 60;

/**
 * Which way it is about to turn, for its indicators: -1 left, 1 right, 0
 * neither.
 *
 * Going round something, it shows left as it pulls out and right as it is
 * about to pull back in. Changing lanes otherwise - out from the kerb or in
 * to it - it shows which way, just before. Otherwise it shows the way it turns at the
 * next junction on its way, all the way there and through it: nothing if it
 * goes straight over that one, whatever it does at the next, and nothing
 * round a bend or a turn where the road goes no other way - nor for the
 * junction past a bend till it is round it, the road to it straight. Turning back the
 * way it came is to the left, across the other lane - though not at a dead
 * end, where there is nothing else to do. Pulling in at the kerb, broken
 * down, is to the right.
 */
Driver.prototype.signal = function () {
  if (this.pullingOver) return 1;
  if (this.parked) return 0;

  //going round something: to the left as it pulls out, to the right as it
  //is about to pull back in, and as it does
  if (this.overtaking !== null && this.passBack !== -1) {
    var k = this.target,
      back = this.passBack;

    if (k <= back - 2) return -1;
    if (k === back - 1) {
      var p = this.wps[k];

      return Math.hypot(p.x - this.x, p.y - this.y) < PASS_BACK_SIGNAL ? 1 : 0;
    }

    return 1;
  }

  var lane = laneChange(this);

  return lane !== 0 ? lane : this.turnAhead();
};

//which way it changes lanes just ahead, if it does: how its way swings off
//the way the road goes, along the straight - or to where it pulls in
function laneChange(self) {
  var most = 0;

  ahead(self, SIGNAL_AHEAD);

  for (var i = 0; i < SEG.length; i++) {
    var sg = SEG[i],
      p = self.wps[sg[6]],
      d = p.din;

    if (d === null || (p.dout !== null && !same(d, p.dout))) continue;

    var sx = (sg[2] - sg[0]) / sg[5],
      sy = (sg[3] - sg[1]) / sg[5],
      //to the left of the way the road goes, plus; right, minus (rightOf)
      swing = d[0] * sy - d[1] * sx;

    if (Math.abs(swing) > Math.abs(most)) most = swing;
  }

  return most > SIGNAL_SWING ? -1 : most < -SIGNAL_SWING ? 1 : 0;
}

/**
 * Which way it turns at the next junction on its way - the next tile where
 * it could go another way than it does - -1 left, 1 right, 0 straight over
 * it or none ahead. Worked out again only once it is on to the next point
 * of its way, or on another way.
 */
Driver.prototype.turnAhead = function () {
  if (this.turnFor !== this.wps || this.turnAt !== this.target) {
    this.turnFor = this.wps;
    this.turnAt = this.target;
    this.turn = nextTurn(this);
  }

  return this.turn;
};

function nextTurn(self) {
  var wps = self.wps,
    last = -1;

  for (
    var i = Math.max(0, self.target), n = 0;
    i < wps.length && n < TURN_LOOK;
    i++, n++
  ) {
    var p = wps[i];

    if (p.tile === last) continue;
    last = p.tile;

    //where it set off, or where its way ends
    if (p.din === null || p.dout === null) return 0;

    var ways = onward(self.traffic, p.tile, p.din);

    if (same(p.din, p.dout)) {
      //straight over a junction: nothing to show for it, nor for what it
      //does after
      if (ways >= 2) return 0;
    } else if (p.din[0] === -p.dout[0] && p.din[1] === -p.dout[1])
      //turning round, where it could have gone on - and at a dead end,
      //nothing to show yet: the road there is not straight
      return ways >= 1 ? -1 : 0;
    else if (ways >= 2) return same(p.dout, rightOf(p.din)) ? 1 : -1;
    //round a bend first: nothing to show till it is round it, on the
    //straight up to the junction
    else return 0;
  }

  return 0;
}

//how many ways a car come into tile going din can drive on out of it - any
//but back the way it came
function onward(traffic, tile, din) {
  var n = 0;

  for (var i = 0; i < DIRECTIONS.length; i++) {
    var d = DIRECTIONS[i];

    if (d[0] === -din[0] && d[1] === -din[1]) continue;
    if (canDrive(traffic.roadman, tile, d)) n++;
  }

  return n;
}

/**
 * The first junction on its way it has not been given, and those straight
 * after it: {tiles, moves, stop, out}, stop and out how far along its way
 * the edge it goes in at is and the one it comes out at - or null.
 */
Driver.prototype.junctionAhead = function (far) {
  var traffic = this.traffic,
    wps = this.wps,
    at = 0,
    ax = this.x,
    ay = this.y,
    found = null,
    current = this.tile(),
    i,
    p,
    l;

  for (i = this.target; i < wps.length && at <= far; i++) {
    p = wps[i];
    l = Math.sqrt((p.x - ax) * (p.x - ax) + (p.y - ay) * (p.y - ay));
    at += l;
    ax = p.x;
    ay = p.y;

    var held = this.grants.indexOf(p.tile) !== -1;

    if (found === null) {
      if (p.tile === current && i === this.target && p.din !== null) {
        //already on it: what it was not given there it takes now
        if (!held && traffic.isJunction(p.tile))
          return { tiles: [p.tile], moves: [moveOf(p)], stop: -1, out: -1 };
        continue;
      }

      if (held || !traffic.isJunction(p.tile)) continue;

      if (p.din === null)
        return { tiles: [p.tile], moves: [moveOf(p)], stop: -1, out: -1 };

      found = {
        tiles: [p.tile],
        moves: [moveOf(p)],
        stop: at - edgeIn(p),
        out: -1,
        open: p.dout === null,
      };
    } else if (p.tile !== found.tiles[found.tiles.length - 1]) {
      if (!held && traffic.isJunction(p.tile)) {
        found.tiles.push(p.tile);
        found.moves.push(moveOf(p));
        if (p.dout === null) found.open = true;
      } else {
        //the first point past them: the edge it came out at is behind it
        found.out = at - edgeIn(p);
        return found;
      }
    }
  }

  return found;
};

//how far into its tile a point is, from the edge it came in at
function edgeIn(p) {
  var cx = Terrain.extractX(p.tile),
    cy = Terrain.extractY(p.tile);

  return (p.x - cx) * p.din[0] + (p.y - cy) * p.din[1] + 0.5;
}

//the way through its tile a point is on: in and out, by number
function moveOf(p) {
  var din = p.din || p.dout,
    dout = p.dout || p.din;

  return {
    i: dirIndex(din),
    o: dirIndex(dout),
    li: p.li || 1,
    lo: p.lo || 1,
  };
}

/**
 * Drives on for dt ms: keeping its distance, taking its turn at junctions,
 * going round a car broken down if it can - a long frame a few short steps
 * at a time, so that it drives as far in a second however many frames there
 * are in it.
 */
Driver.prototype.update = function (dt) {
  dt = Math.min(dt, MAX_FRAME);

  do {
    this.step(Math.min(dt, MAX_DT));
    dt -= MAX_DT;
  } while (dt > 0 && this.alive && this.wps.length > 0);
};

Driver.prototype.step = function (dt) {
  var wps = this.wps,
    s = dt / 1000,
    traffic = this.traffic;

  traffic.releasePassed(this);

  if (wps.length === 0) return;

  //at the end of its way: at the kerb, or standing in its lane - with its
  //foot on the brake
  if (this.parked || this.target >= wps.length) {
    this.v = 0;
    this.leader = null;
    this.held = this.parked ? "kerb" : "stop";
    this.braking = !this.parked;
    return;
  }

  var look = this.length / 2 + MIN_GAP + this.v0 * HEADWAY + 0.9,
    end = ahead(this, look + 3.5),
    lead = this.scan(0, look),
    gap = lead === null ? Infinity : lead.along - this.length / 2,
    held = lead === null ? "" : "queue",
    junction = this.junctionAhead(look + 1.5);

  this.leader = lead === null ? null : lead.driver;

  if (junction !== null) {
    var front = junction.stop - this.length / 2;

    //asked for only once the way through it is known
    if (junction.open && !this.stopAtEnd && this.owner.nearEnd) {
      this.owner.nearEnd(this);
      end = ahead(this, look + 3.5);
      junction = this.junctionAhead(look + 1.5);
      front = junction === null ? 0 : junction.stop - this.length / 2;
    }

    //only the first in its lane asks: one behind another would otherwise
    //hold the junction for a turn it cannot take yet
    if (
      junction !== null &&
      !(
        (lead === null || lead.along > junction.stop) &&
        this.ask(junction, front)
      )
    ) {
      var stop = front + MIN_GAP - 0.02;

      if (stop < gap) {
        gap = stop;
        held = "junction";
      }
    }
  }

  //over into the other lane of a one-way road just ahead: not till there is
  //room for it there - those coming up that lane let it in (scan)
  this.merging = null;

  if (
    this.overtaking === null &&
    this.passBack === -1 &&
    !this.pullingOver &&
    !this.stopAtEnd
  ) {
    var m = crossingAhead(this, look + 1);

    if (m !== null) {
      this.merging = m;

      var blocker = m.at > 0 ? traffic.mergeBlocker(this, m) : null;

      //waiting on one level with it that wants its lane as it wants that
      //one's: the one behind puts it off a tile and drives on, so the other
      //has room
      if (blocker !== null && swapsWith(this, blocker, m) && this.putOffMerge())
        blocker = null;
      //waited long enough for room: it stays in its lane instead
      else if (
        blocker !== null &&
        this.mergeWaited > MERGE_WAIT &&
        this.keepLane()
      )
        blocker = null;
      else if (blocker !== null) {
        m.waiting = true;

        if (m.at + HARD_GAP < gap) {
          gap = m.at + HARD_GAP;
          held = "merge";
        }
      }
    }

    ahead(this, look + 3.5);
  }

  //going round something, a good deal quicker, to be past it soon - and
  //slower over cobbles or gravel than on asphalt
  var v0 =
      (this.overtaking !== null ? this.v0 * PASS_BOOST : this.v0) * this.pace(),
    vt = Math.max(0, Math.min(v0, (gap - MIN_GAP) / HEADWAY));

  //on the brakes: slowing down, or standing in the traffic - kept on a
  //moment, so they do not flicker as it keeps its distance
  if (vt < this.v - BRAKING || (this.v < 0.05 && held !== ""))
    this.brakedAt = traffic.now;
  this.braking = traffic.now - this.brakedAt < BRAKE_HOLD;

  //slowing down to stop where it is going
  if (this.stopAtEnd) {
    vt = Math.min(vt, Math.max(0.3, Math.sqrt(2 * DECEL * end)));
  }

  this.v = this.v < vt ? Math.min(vt, this.v + ACCEL * s) : vt;
  this.held = this.v < 0.05 ? held : "";
  this.mergeWaited = held === "merge" ? this.mergeWaited + dt : 0;

  var step = Math.min(this.v * s, Math.max(0, gap - HARD_GAP));

  //stuck behind something slow, with the road clear ahead of it: on for a
  //while, then round it
  this.trailed =
    lead !== null && slowAhead(this, lead.driver) ? this.trailed + dt : 0;

  if (lead !== null && (lead.driver.passable || this.trailed > TRAIL_FOR))
    this.overtake(lead);

  this.move(step);
};

/**
 * How fast the road under it is driven, a share of asphalt's
 * (RoadRules.paceOf) - looked up again only once it is on another tile.
 */
Driver.prototype.pace = function () {
  var here = this.here();

  if (here !== this.paceAt) {
    var road = this.traffic.roadman.getRoad(here);

    this.paceAt = here;
    this.paceOf = road === null ? 1 : RoadRules.paceOf(road.data);
  }

  return this.paceOf;
};

/**
 * Moves it on along its way by step tiles.
 */
Driver.prototype.move = function (step) {
  var wps = this.wps,
    wp,
    dx,
    dy,
    d;

  while (step > 0 && this.target < wps.length) {
    wp = wps[this.target];
    dx = wp.x - this.x;
    dy = wp.y - this.y;
    d = Math.sqrt(dx * dx + dy * dy);

    if (d > step) {
      this.x += (dx / d) * step;
      this.y += (dy / d) * step;
      break;
    }

    this.x = wp.x;
    this.y = wp.y;
    step -= d;

    if (this.passBack !== -1 && this.target >= this.passBack)
      this.endOvertake();

    //nothing was joined on, so this is where its way ends
    if (this.target === wps.length - 1) {
      this.arrive();
      return;
    }

    this.target++;
    this.aim();

    if (
      !this.stopAtEnd &&
      (this.target === wps.length - 1 ||
        (this.nearFor !== wps && tilesLeft(this, NEAR_TILES) < NEAR_TILES))
    ) {
      this.nearFor = wps;
      this.owner.nearEnd(this);
      wps = this.wps;
    }
  }
};

//how many tiles are left of its way, counted no further than most
function tilesLeft(self, most) {
  var wps = self.wps,
    n = 0,
    last = -1;

  for (var i = wps.length - 1; i >= self.target && n <= most; i--)
    if (wps[i].tile !== last) {
      last = wps[i].tile;
      n++;
    }

  return n;
}

Driver.prototype.arrive = function () {
  var last = this.wps[this.wps.length - 1],
    over = this.pullingOver;

  this.v = 0;
  this.target = this.wps.length;
  this.pullingOver = false;

  //stopped, facing along the road - pulled in at the kerb, out of every
  //junction, or standing in its lane
  if (this.stopAtEnd) {
    if (this.pullIn) {
      this.parked = true;
      this.traffic.releaseAll(this);
    }

    if (last.din !== null) {
      this.hx = last.din[0];
      this.hy = last.din[1];
    }
  }

  //pulled over where it broke down: nowhere it was going
  if (!over) this.owner.end(this);
};

/**
 * Asks for the junctions ahead, once it is close enough to them to need
 * them. Whether it has them.
 */
Driver.prototype.ask = function (junction, front) {
  var traffic = this.traffic;

  //already in it, or starting in it: it is let through
  if (junction.stop < 0 || front < -0.05) {
    traffic.grant(this, junction);
    return true;
  }

  if (front > this.v * HEADWAY + ASK_AHEAD + MIN_GAP) return false;

  if (this.asked < 0) this.asked = traffic.now;

  //room on the far side to come out into - for it, and for every other
  //already let in that comes out the same way, so that none is left stood
  //in the middle of the junction - or its way ends in there; or, nobody
  //else on the way out, what is there is driving on out of it, the way it
  //goes, with nothing ahead of it: it follows that through
  var going = goingOut(this, junction),
    exit =
      junction.out < 0
        ? null
        : this.scan(
            junction.out,
            junction.out + (this.length + MIN_GAP * 2) * (going + 1),
          ),
    ready = exit === null || (going === 0 && drivingAway(this, exit.driver));

  //onto a roundabout: only with room enough on it, and after what is going
  //round already
  if (ready) ready = mayEnter(this, junction);

  return traffic.request(this, junction, ready);
};

/*
 * A roundabout - any small loop of one-way road, round which the traffic
 * keeps going - locks solid once it is full: everything on it waits for
 * what is in front of it to move, all the way round. So what comes onto it
 * from outside gives way to what is going round it already, waiting at the
 * same junction, and comes on only while less than LOOP_FILL of it is
 * taken up - there is always room to go round.
 */

//how much of a roundabout may be taken up, a share of how many tiles round
//it is, for anything more to come onto it; and how many tiles round one is
//at most - longer, it is just one-way streets
var LOOP_FILL = 0.5,
  LOOP_MOST = 12;

//the tile one step on from tile going d
function stepTile(tile, d) {
  return tile + d[0] * Terrain.dx + d[1] * Terrain.dy;
}

//whether self may come through junction - ready otherwise - onto the
//roundabout it leads onto, if it does
function mayEnter(self, junction) {
  var traffic = self.traffic,
    first = junction.tiles[0],
    last = junction.tiles[junction.tiles.length - 1],
    din = DIRS[junction.moves[0].i],
    dout = DIRS[junction.moves[junction.moves.length - 1].o],
    loop = traffic.loopOf(stepTile(last, dout));

  //not onto one, or going round it already
  if (loop === null || loop.has(stepTile(first, [-din[0], -din[1]])))
    return true;

  var taken = 0,
    seen = new Set();

  loop.forEach(function (t) {
    var here = traffic.index.get(t);

    if (here !== undefined)
      here.forEach(function (d) {
        if (d !== self && !seen.has(d)) {
          seen.add(d);
          taken += d.length + MIN_GAP * 2;
        }
      });
  });

  if (taken + self.length > loop.size * LOOP_FILL) return false;

  var j = traffic.junctions.get(first);

  return (
    j === undefined ||
    !j.waiting.some(function (w) {
      return w.d !== self && loop.has(w.d.here());
    })
  );
}

//whether a road is one-way
function oneWayRoad(roadman, tile) {
  var road = roadman.getRoad(tile);

  return road !== null && RoadRules.wayOf(road.data) >= 0;
}

//how many steps along one-way roads every tile is from `from`, as far as
//LOOP_MOST - driving them forward, or back
function reach(roadman, from, forward) {
  var dist = new Map([[from, 0]]),
    queue = [from];

  while (queue.length > 0) {
    var t = queue.shift(),
      n = dist.get(t);

    if (n >= LOOP_MOST) continue;

    for (var i = 0; i < DIRECTIONS.length; i++) {
      var d = DIRECTIONS[i],
        to = t + d[2],
        ok = forward
          ? canDrive(roadman, t, d)
          : canDrive(roadman, to, [-d[0], -d[1], -d[2]]);

      if (ok && !dist.has(to) && oneWayRoad(roadman, to)) {
        dist.set(to, n + 1);
        queue.push(to);
      }
    }
  }

  return dist;
}

/**
 * The roundabout a tile is on - the small loop of one-way road through it,
 * as the set of its tiles - or null for none.
 */
Traffic.prototype.loopOf = function (tile) {
  var known = this._loops.get(tile);

  if (known !== undefined) return known;

  known = null;

  if (oneWayRoad(this.roadman, tile)) {
    var on = reach(this.roadman, tile, true),
      back = reach(this.roadman, tile, false),
      loop = new Set();

    on.forEach(function (n, t) {
      var m = back.get(t);

      if (m !== undefined && n + m <= LOOP_MOST) loop.add(t);
    });

    if (loop.size >= 3) known = loop;
  }

  this._loops.set(tile, known);

  return known;
};

//how many others let into the junctions ahead go out of the last of them
//the way self will, in the same lane, and are not out of it yet
function goingOut(self, junction) {
  var last = junction.tiles.length - 1,
    m = junction.moves[last],
    j = self.traffic.junctions.get(junction.tiles[last]),
    n = 0;

  if (j !== undefined)
    for (var i = 0; i < j.holders.length; i++) {
      var h = j.holders[i];

      if (h.d !== self && h.o === m.o && (h.lo || 1) === (m.lo || 1)) n++;
    }

  return n;
}

//whether other is driving on away from self, the way it goes, quick enough
//and with nothing in front of it to stop it - not about to stand there
function drivingAway(self, other) {
  return (
    other.v > AWAY &&
    other.leader === null &&
    !other.stopAtEnd &&
    self.hx * other.hx + self.hy * other.hy > 0.7
  );
}

//whether other, in front of self, is in no hurry: driving on slower than
//self would - a lorry, a car on its last legs - not just held up itself
function slowAhead(self, other) {
  return (
    other.v > 0.05 &&
    other.v0 < self.v0 * SLOWER &&
    other.leader === null &&
    !other.stopAtEnd &&
    !other.pullingOver &&
    !other.parked
  );
}

/**
 * Goes round what is in its lane in front of it - a bus at its stop, or
 * something driving on slower than it would, a lorry or a car on its last
 * legs, that it has followed a while - through the other lane, a good deal
 * quicker than it would otherwise go: if nobody is going round it already,
 * the other lane is clear far enough ahead - as far again as what comes the
 * other way gets while it goes past something moving - and its own lane
 * past it is clear to pull back in to, all on a straight bit of road with
 * no junction on it, short enough to get past in.
 */
Driver.prototype.overtake = function (lead) {
  var other = lead.driver,
    traffic = this.traffic,
    //something driving on, not standing: it is past it only once it has
    //made up the whole of the way to past it on it, going faster
    moving = !other.passable && other.v > 0.05;

  if (other.passer !== null && !other.passer.alive) other.passer = null;
  if (other.passer !== null || this.overtaking !== null) return;
  if (lead.along - this.length / 2 > 0.4 + (moving ? other.v * HEADWAY : 0))
    return;

  var hx = Math.round(this.hx),
    hy = Math.round(this.hy);

  //only straight along x or y, behind it in its lane
  if (Math.abs(this.hx * hx + this.hy * hy) < 0.999) return;
  if (other.hx * hx + other.hy * hy < 0.99) return;

  var off = (other.x - this.x) * -hy + (other.y - this.y) * hx;

  if (Math.abs(off) > 0.05) return;

  var back = lead.along + other.length + this.length / 2 + PASS_CLEAR,
    fast = this.v0 * PASS_BOOST,
    //as fast as it could go meanwhile, not just as it goes now
    slow = Math.max(other.v, other.v0),
    gain = fast - slow,
    //how long it takes to get past, s
    takes = 0,
    wps = this.wps,
    at = 0,
    rest = -1,
    i;

  //past something moving: as much further on as it gets in the meantime -
  //speeding up from its speed, then gaining on it as fast as it can
  if (moving) {
    if (gain < 0.2) return;

    var speedUp = gain / ACCEL,
      gained = (gain * speedUp) / 2;

    takes =
      back <= gained
        ? Math.sqrt((2 * back) / ACCEL)
        : speedUp + (back - gained) / gain;
    back += slow * takes;

    if (back > PASS_MOST) return;
  }

  //its way straight on past it, in the lane it is in, and no junction
  for (i = this.target; i < wps.length; i++) {
    var p = wps[i],
      side = (p.x - this.x) * -hy + (p.y - this.y) * hx,
      fwd = (p.x - this.x) * hx + (p.y - this.y) * hy;

    if (Math.abs(side) > 0.01 || fwd < at - 1e-6) return;
    if (traffic.isJunction(p.tile)) return;
    //in the left lane of a one-way road already: nowhere to go round it
    if ((p.li || 1) < 0 || (p.lo || 1) < 0) return;

    at = fwd;

    if (fwd > back + 0.35) {
      rest = i;
      break;
    }
  }

  if (rest === -1) return;

  //the other lane: twice LANE to the left of its own - left of going
  //(hx, hy) is (-hy, hx) - clear from just behind it to well past where it
  //pulls back in
  var lx = -hy * 2 * LANE,
    ly = hx * 2 * LANE;

  if (
    !traffic.laneClear(
      this.x + lx,
      this.y + ly,
      hx,
      hy,
      -0.6,
      //and what comes the other way gets as far again while it goes past
      //something moving
      back + PASS_LOOK + (moving ? fast * takes : 0),
      this,
    ) ||
    !traffic.laneClear(
      this.x,
      this.y,
      hx,
      hy,
      lead.along + 0.05,
      back + 0.3,
      this,
      other,
    )
  )
    return;

  for (var a = -0.5; a <= back + PASS_LOOK; a += 0.5) {
    var t = tileAt(this.x + hx * a, this.y + hy * a);

    if (a <= back + 0.5 && traffic.isJunction(t)) return;
  }

  var self = this,
    //how far along it goes over into the other lane, and back
    swing = Math.min(0.45, back / 2 - 0.05);

  function point(along, side) {
    var x = self.x + hx * along + lx * side,
      y = self.y + hy * along + ly * side;

    return { tile: tileAt(x, y), x: x, y: y, din: [hx, hy], dout: [hx, hy] };
  }

  var path = [
    { tile: this.tile(), x: this.x, y: this.y, din: [hx, hy], dout: [hx, hy] },
    point(swing, 1),
    point(back - swing, 1),
    point(back, 0),
  ];

  for (i = rest; i < wps.length; i++) path.push(wps[i]);

  this.wps = path;
  this.target = 1;
  this.passBack = 3;
  this.overtaking = other;
  other.passer = this;
  this.aim();
};

/**
 * On a one-way road, over into the other lane, if it is better off there:
 * out of a queue in the right lane into the left, when the left is clear
 * alongside and has fewer in it ahead; and back into the right as soon as
 * that is clear for a good way ahead - never where it has to be in the lane
 * it is in for a turn coming up. Whether it did.
 */
Driver.prototype.switchLane = function () {
  if (
    this.parked ||
    this.stopAtEnd ||
    this.pullingOver ||
    this.overtaking !== null ||
    this.passBack !== -1 ||
    this.passer !== null ||
    this.target >= this.wps.length
  )
    return false;

  var hx = Math.round(this.hx),
    hy = Math.round(this.hy),
    here = this.here(),
    traffic = this.traffic;

  if (Math.abs(this.hx * hx + this.hy * hy) < 0.999) return false;
  if (!oneWayAt(here) || traffic.isJunction(here)) return false;

  var lane = this.lane(),
    want = -lane,
    //the other lane: 2 LANE to the left of the right, or the right of the
    //left
    ox = this.x - hy * 2 * LANE * lane,
    oy = this.y + hx * 2 * LANE * lane;

  if (lane > 0) {
    //out of a queue: something just ahead, slow
    var lead = this.leader;

    if (
      this.held !== "queue" ||
      lead === null ||
      lead.v > this.v0 * 0.5 ||
      Math.hypot(lead.x - this.x, lead.y - this.y) > 1.4
    )
      return false;
    if (!traffic.laneClear(ox, oy, hx, hy, -0.8, 1.2, this)) return false;
  } else if (!traffic.laneClear(ox, oy, hx, hy, -0.9, 2.2, this)) return false;

  //the rest of its way, tile by tile, from here
  var wps = this.wps,
    tiles = [here],
    i;

  for (i = this.target; i < wps.length; i++)
    if (wps[i].tile !== tiles[tiles.length - 1]) {
      if (tiles.indexOf(wps[i].tile) !== -1) return false;
      tiles.push(wps[i].tile);
    }

  if (tiles.length < 3) return false;

  //out of a queue only into a lane with fewer in it ahead
  if (
    lane > 0 &&
    laneCount(tiles, [hx, hy], 0, -1) + LANE_BUSY >
      laneCount(tiles, [hx, hy], 0, 1)
  )
    return false;

  var next = routeWaypoints(tiles, [hx, hy], false, true, want);

  //and it can stay there a while
  if (
    next[next.length - 1].tile === here ||
    (
      next.find(function (p) {
        return p.tile === tiles[1];
      }) || {}
    ).li !== want
  )
    return false;

  //over to it some way ahead, not sideways where it is
  while (
    next.length > 1 &&
    (next[0].x - this.x) * hx + (next[0].y - this.y) * hy < SWITCH_ALONG
  )
    next.shift();

  //and room for it there where it comes in
  if (
    traffic.mergeBlocker(this, {
      x: next[0].x,
      y: next[0].y,
      hx: hx,
      hy: hy,
      lane: want,
      waiting: false,
    }) !== null
  )
    return false;

  this.redirect(next);

  return true;
};

//how far along it goes over to the other lane, in tiles
var SWITCH_ALONG = 0.45;

Driver.LANE_EVERY = LANE_EVERY;

/**
 * Whether it can pull over to the kerb just ahead of where it is: going
 * straight along a street, with the road going on straight for a little way
 * yet, and no junction there.
 */
Driver.prototype.canPullOver = function () {
  var wps = this.wps,
    hx = Math.round(this.hx),
    hy = Math.round(this.hy),
    need = PULL_OVER + 0.15,
    at = 0,
    i;

  if (this.parked || this.target >= wps.length) return false;
  if (Math.abs(this.hx * hx + this.hy * hy) < 0.999) return false;
  //over to the kerb from the right lane, not across it from the left
  if (this.lane() < 0) return false;

  for (i = this.target; i < wps.length && at < need; i++) {
    var p = wps[i],
      side = (p.x - this.x) * -hy + (p.y - this.y) * hx,
      fwd = (p.x - this.x) * hx + (p.y - this.y) * hy;

    if (Math.abs(side) > 0.01 || fwd < at - 1e-6) break;

    at = fwd;
  }

  if (at < need) return false;

  for (var a = 0; a <= need; a += 0.25)
    if (this.traffic.isJunction(tileAt(this.x + hx * a, this.y + hy * a)))
      return false;

  return true;
};

/**
 * Pulls over to the kerb just ahead - broken down - and stands there once
 * it gets there, its way forgotten. See canPullOver for where it can.
 */
Driver.prototype.pullOver = function () {
  var hx = Math.round(this.hx),
    hy = Math.round(this.hy),
    d = [hx, hy],
    r = rightOf(d),
    x = this.x + hx * PULL_OVER + r[0] * (PARK - LANE),
    y = this.y + hy * PULL_OVER + r[1] * (PARK - LANE),
    v = this.v;

  this.setPath([
    { tile: this.tile(), x: this.x, y: this.y, din: d, dout: d },
    { tile: tileAt(x, y), x: x, y: y, din: d, dout: null },
  ]);
  this.stopAtEnd = this.pullIn = this.pullingOver = true;
  this.passable = false;
  //slowing down to it from the speed it was going
  this.v = v;
};

Driver.prototype.endOvertake = function () {
  if (this.overtaking !== null && this.overtaking.passer === this)
    this.overtaking.passer = null;

  this.overtaking = null;
  this.passBack = -1;
};

/**
 * Puts it at the kerb of tile, facing d, pulled in and standing there - or,
 * inLane, standing in its lane in the middle of the tile.
 */
Driver.prototype.parkAt = function (tile, d, inLane) {
  var at = kerb(tile, d),
    r = rightOf(d);

  if (inLane)
    at = {
      x: Terrain.extractX(tile) + r[0] * LANE,
      y: Terrain.extractY(tile) + r[1] * LANE,
    };

  this.setPath([{ tile: tile, x: at.x, y: at.y, din: d, dout: null }]);
  this.target = 1;
  this.hx = d[0];
  this.hy = d[1];
  this.parked = !inLane;
  this.stopAtEnd = true;
  this.pullIn = !inLane;
  this.v = 0;
};

/**
 * Whether it stands at the end of its way: at the kerb, or in its lane.
 */
Driver.prototype.standing = function () {
  return this.wps.length > 0 && this.target >= this.wps.length;
};

/**
 * Whether it can pull out from the kerb into its lane now: nothing coming
 * up the lane behind it, close.
 */
Driver.prototype.canPullOut = function () {
  var r = rightOf([Math.round(this.hx), Math.round(this.hy)]),
    //its lane, alongside it
    x = this.x - r[0] * (PARK - LANE),
    y = this.y - r[1] * (PARK - LANE);

  return this.traffic.laneClear(
    x,
    y,
    Math.round(this.hx),
    Math.round(this.hy),
    -1.8,
    0.6 + this.length / 2,
    this,
  );
};

/**
 * Pulls out from the kerb along a route that starts on the tile it stands
 * on and goes the way it faces. Whether it could.
 */
Driver.prototype.pullOut = function (route, park) {
  var d = [Math.round(this.hx), Math.round(this.hy)],
    r = rightOf(d),
    from = { tile: this.tile(), x: this.x, y: this.y, din: d, dout: d },
    kerbed = this.parked,
    next;

  next = routeWaypoints(route, d, park, true, 1);

  //what of it is behind where it stands is left out
  while (
    next.length > 1 &&
    next[0].tile === from.tile &&
    (next[0].x - this.x) * d[0] + (next[0].y - this.y) * d[1] < 0.1
  )
    next.shift();

  //from the kerb, out into its lane a little way ahead - not along the
  //whole way to the next point on it
  if (kerbed && next.length > 0) {
    var lx = this.x - r[0] * (PARK - LANE),
      ly = this.y - r[1] * (PARK - LANE),
      p = next[0],
      fwd = (p.x - lx) * d[0] + (p.y - ly) * d[1],
      side = (p.x - lx) * -d[1] + (p.y - ly) * d[0];

    if (Math.abs(side) < 0.01 && fwd > PULL_OVER + 0.15)
      next.unshift({
        tile: tileAt(lx + d[0] * PULL_OVER, ly + d[1] * PULL_OVER),
        x: lx + d[0] * PULL_OVER,
        y: ly + d[1] * PULL_OVER,
        din: d,
        dout: d,
      });
  }

  this.setPath([from].concat(next));
  this.stopAtEnd = this.pullIn = park === true;
  this.v = 0;

  return true;
};

/**
 * Sets off from where it stands in its lane - a bus from its stop - along
 * a route that starts on the tile it stands on and goes the way it faces.
 *
 * @param [stop] {boolean} to stand in its lane again at the end of it
 */
Driver.prototype.driveOn = function (route, stop) {
  var d = [Math.round(this.hx), Math.round(this.hy)],
    from = { tile: this.tile(), x: this.x, y: this.y, din: d, dout: d },
    next = routeWaypoints(route, d, false, false);

  this.setPath([from].concat(next));
  this.stopAtEnd = stop === true;
  this.pullIn = false;
  this.passable = false;
  this.v = 0;
};

/**
 * Everything on the roads: where each one is, for the others to look for -
 * and the junctions, who has them and who waits for them.
 *
 * @param roadman {Roadman} the loaded roads
 * @constructor
 */
function Traffic(roadman) {
  this.roadman = roadman;
  laneTraffic = this;
  this.drivers = [];
  //the drivers by every tile they are on, some part of them
  this.index = new Map();
  //the lists of drivers it is made of, kept from one frame to the next to
  //be filled in again (index), and how many of them are in it this frame
  this.lists = [];
  this.listsUsed = 0;
  //junction tile -> {holders: [{d, i, o}], waiting: [{d, i, o, since, at,
  //ready}]}
  this.junctions = new Map();
  this._isJunction = new Map();
  this._loops = new Map();
  this._junctionAt = 0;
  this.seen = new Set();
  this._tiles = [];
  this.now = 0;
}

Traffic.prototype.add = function (driver) {
  driver.alive = true;
  this.drivers.push(driver);

  return driver;
};

Traffic.prototype.remove = function (driver) {
  var i = this.drivers.indexOf(driver);

  driver.alive = false;
  this.releaseAll(driver);
  driver.endOvertake();

  if (driver.passer !== null) {
    driver.passer.overtaking = null;
    driver.passer = null;
  }

  if (i !== -1) this.drivers.splice(i, 1);
};

//puts a driver under every tile some part of it is on
function index(self, d) {
  var last = -1,
    k;

  for (k = -1; k <= 1; k++) {
    var o = (k * d.length) / 2,
      t = tileAt(d.x + d.hx * o, d.y + d.hy * o);

    if (t === last) continue;
    last = t;

    var here = self.index.get(t);

    if (here === undefined) {
      here = self.lists[self.listsUsed];
      if (here === undefined) here = self.lists[self.listsUsed] = [];
      else here.length = 0;
      self.listsUsed++;
      here.push(d);
      self.index.set(t, here);
    } else if (here.indexOf(d) === -1) here.push(d);
  }
}

/**
 * Has a driver just put on the roads seen where it is straight away, rather
 * than from the next frame - so that nothing else is put on top of it.
 */
Traffic.prototype.enter = function (driver) {
  index(this, driver);
};

/**
 * Once a frame, before anything drives: where everything is, put by the
 * tiles it is on.
 */
Traffic.prototype.frame = function (now) {
  var drivers = this.drivers,
    i;

  this.now = now;
  this.index.clear();
  this.listsUsed = 0;

  if (now - this._junctionAt > JUNCTION_TTL) {
    this._isJunction.clear();
    this._loops.clear();
    this._junctionAt = now;
  }

  for (i = 0; i < drivers.length; i++)
    if (drivers[i].wps.length > 0) index(this, drivers[i]);

  //whoever stopped asking is not waiting any more
  pruneAt = now;
  this.junctions.forEach(prune);
};

//the time a frame prunes the junctions at (prune)
var pruneAt = 0;

//a junction's waiting and holders, of only those still about, in the order
//they were in - and the junction let go of once nobody is
function prune(j, tile, all) {
  var waiting = j.waiting,
    holders = j.holders,
    n = 0,
    i;

  for (i = 0; i < waiting.length; i++)
    if (waiting[i].d.alive && pruneAt - waiting[i].at < WAIT_TTL)
      waiting[n++] = waiting[i];
  waiting.length = n;

  for (i = 0, n = 0; i < holders.length; i++)
    if (holders[i].d.alive) holders[n++] = holders[i];
  holders.length = n;

  if (holders.length === 0 && waiting.length === 0) all.delete(tile);
}

/**
 * The tiles the pieces of a way go through, as far as far along it.
 */
/**
 * Whether the lane going d on tile is clear to drive into: nothing there
 * going that way, standing or crawling.
 */
Traffic.prototype.laneFree = function (tile, d) {
  var here = this.index.get(tile);

  if (here === undefined) return true;

  for (var i = 0; i < here.length; i++) {
    var o = here[i];

    if (o.hx * d[0] + o.hy * d[1] > 0.7 && (o.v < AWAY || o.parked))
      return false;
  }

  return true;
};

Traffic.prototype.tilesAlong = function (segs, far) {
  var out = this._tiles,
    i,
    s,
    t,
    k;

  out.length = 0;

  for (i = 0; i < segs.length; i++) {
    s = segs[i];
    if (s[4] > far) break;

    for (k = 0; k <= 2; k++) {
      t = tileAt(
        s[0] + ((s[2] - s[0]) * k) / 2,
        s[1] + ((s[3] - s[1]) * k) / 2,
      );
      if (out.indexOf(t) === -1) out.push(t);
    }
  }

  return out;
};

/**
 * Whether a road tile is a junction: joined up three or four ways - driven
 * out of it or into it, a one-way road coming into it as much as one going
 * out of it; or where a one-way road joins one both ways, the end of that
 * as far as anything on it goes - the way on is against the one-way road -
 * where it turns round across the way of what comes off the one-way road,
 * and the two take their turns.
 */
Traffic.prototype.isJunction = function (tile) {
  var known = this._isJunction.get(tile);

  if (known !== undefined) return known;

  var n = 0,
    oneWay = false,
    bothWays = false;

  for (var i = 0; i < DIRECTIONS.length; i++) {
    var d = DIRECTIONS[i],
      out = canDrive(this.roadman, tile, d),
      into = canDrive(this.roadman, tile + d[2], [-d[0], -d[1], -d[2]]);

    if (out || into) {
      n++;
      if (out && into) bothWays = true;
      else oneWay = true;
    }
  }

  known = n >= 3 || (n === 2 && oneWay && bothWays);
  this._isJunction.set(tile, known);

  return known;
};

function junctionOf(self, tile) {
  var j = self.junctions.get(tile);

  if (j === undefined) {
    j = { holders: [], waiting: [] };
    self.junctions.set(tile, j);
  }

  return j;
}

/**
 * Asks for the junctions ahead of driver: given them when nothing going
 * through them is in its way (inWay - crosses its way, and is not yet past
 * where it does), nobody who has waited longer for a way that crosses it is
 * ready to go, and it is ready itself - it has somewhere to come out to.
 * Ways that never cross go through together: straight on from either side,
 * turning right from any two, one turning right and the other going
 * straight - unless into the same street, where they merge.
 */
Traffic.prototype.request = function (driver, junction, ready) {
  var now = this.now,
    ok = ready,
    mines = [],
    held = false,
    i,
    k,
    j,
    m,
    mine;

  //where it waits, at each of them - and whether anything going through
  //any of them is in its way
  for (i = 0; i < junction.tiles.length; i++) {
    j = junctionOf(this, junction.tiles[i]);
    m = junction.moves[i];
    mine = null;

    for (k = 0; k < j.waiting.length; k++)
      if (j.waiting[k].d === driver) mine = j.waiting[k];

    if (mine === null) {
      mine = { d: driver, i: m.i, o: m.o, at: now, ready: ready };
      j.waiting.push(mine);
    }

    //the same for it at every junction it waits for, so that two waiting
    //for the same two never each have the other ahead of them
    mine.since = driver.asked < 0 ? now : driver.asked;
    mine.i = m.i;
    mine.o = m.o;
    mine.li = m.li;
    mine.lo = m.lo;
    mine.at = now;
    mine.ready = ready;
    mines.push(mine);

    for (k = 0; k < j.holders.length; k++)
      if (
        j.holders[k].d !== driver &&
        inWay(j.holders[k], m, junction.tiles[i])
      )
        held = true;
  }

  //held up by what is going through: it cannot go yet whoever is let
  //through first, so it holds up nobody after it in the meantime - not for
  //long, though: past PATIENCE its turn is kept for it whatever
  mines.forEach(function (w) {
    w.blocked = held;
  });

  if (held) ok = false;

  for (i = 0; ok && i < junction.tiles.length; i++) {
    j = this.junctions.get(junction.tiles[i]);
    m = junction.moves[i];
    mine = mines[i];

    for (k = 0; ok && k < j.waiting.length; k++) {
      var w = j.waiting[k];

      if (
        w.d !== driver &&
        w.ready &&
        !(w.blocked && now - w.since < PATIENCE) &&
        (w.since < mine.since ||
          (w.since === mine.since && w.d.id < driver.id)) &&
        crosses(w, m)
      )
        ok = false;
    }
  }

  if (ok) this.grant(driver, junction);

  return ok;
};

Traffic.prototype.grant = function (driver, junction) {
  driver.asked = -1;

  for (var i = 0; i < junction.tiles.length; i++) {
    var tile = junction.tiles[i],
      j = junctionOf(this, tile);

    j.waiting = j.waiting.filter(function (w) {
      return w.d !== driver;
    });

    if (driver.grants.indexOf(tile) === -1) {
      driver.grants.push(tile);
      j.holders.push({
        d: driver,
        i: junction.moves[i].i,
        o: junction.moves[i].o,
        li: junction.moves[i].li,
        lo: junction.moves[i].lo,
      });
    }
  }
};

Traffic.prototype.release = function (driver, tile) {
  var j = this.junctions.get(tile),
    i = driver.grants.indexOf(tile);

  if (i !== -1) driver.grants.splice(i, 1);
  driver.entered.delete(tile);
  if (j === undefined) return;

  j.holders = j.holders.filter(function (h) {
    return h.d !== driver;
  });
};

Traffic.prototype.releaseAll = function (driver) {
  while (driver.grants.length > 0) this.release(driver, driver.grants[0]);
};

/**
 * Lets go of the junctions it is through: it has been on the tile, and all of
 * it is off it again. A junction it was given is held for that one time
 * through - one its way comes back to later, having turned round at the next
 * junction, is asked for again then: held all the while, nothing could
 * cross it while the car waits its turn somewhere else, and that locks the
 * streets round it. One given that is no longer on its way at all is let go
 * of too.
 */
Traffic.prototype.releasePassed = function (driver) {
  var grants = driver.grants,
    wps = driver.wps,
    i,
    k;

  for (i = grants.length - 1; i >= 0; i--) {
    var tile = grants[i],
      cx = Terrain.extractX(tile),
      cy = Terrain.extractY(tile),
      out =
        Math.max(Math.abs(driver.x - cx), Math.abs(driver.y - cy)) >
        0.5 + driver.length / 2,
      coming = false;

    if (!out) {
      driver.entered.add(tile);
      continue;
    }

    if (driver.entered.has(tile)) {
      this.release(driver, tile);
      continue;
    }

    for (k = driver.target; k < wps.length && !coming; k++)
      if (wps[k].tile === tile) coming = true;

    if (!coming) this.release(driver, tile);
  }
};

/**
 * Whether a lane is clear: nothing but those left out driving along the line
 * through (x, y) going (hx, hy), from `from` to `to` along it - parked at the
 * kerb or not, whichever way it goes.
 */
Traffic.prototype.laneClear = function (x, y, hx, hy, from, to, self, also) {
  var seen = this.seen,
    a,
    j;

  seen.clear();

  for (a = from - 0.5; a <= to + 0.5; a += 0.5) {
    var here = this.index.get(tileAt(x + hx * a, y + hy * a));

    if (here === undefined) continue;

    for (j = 0; j < here.length; j++) {
      var d = here[j];

      if (d === self || d === also || d.parked || seen.has(d)) continue;
      seen.add(d);

      for (var k = -1; k <= 1; k++) {
        var o = (k * d.length) / 2,
          px = d.x + d.hx * o - x,
          py = d.y + d.hy * o - y,
          along = px * hx + py * hy,
          side = Math.abs(px * -hy + py * hx);

        if (side < CORRIDOR && along >= from && along <= to) return false;
      }
    }
  }

  return true;
};

/**
 * What keeps a driver from coming over into the other lane where its change
 * of lane `m` (crossingAhead) brings it, or null for nothing: anything in
 * that lane alongside where it comes in, or coming up close behind - more
 * room the quicker that comes. One stood back to let it in is not in its
 * way.
 */
Traffic.prototype.mergeBlocker = function (self, m) {
  var seen = this.seen,
    half = self.length / 2,
    a,
    j;

  seen.clear();

  for (a = -2.5; a <= 1.5; a += 0.5) {
    var here = this.index.get(tileAt(m.x + m.hx * a, m.y + m.hy * a));

    if (here === undefined) continue;

    for (j = 0; j < here.length; j++) {
      var d = here[j];

      if (d === self || d.parked || seen.has(d)) continue;
      seen.add(d);

      var lo = Infinity,
        hi = -Infinity;

      for (var k = -1; k <= 1; k++) {
        var o = (k * d.length) / 2,
          px = d.x + d.hx * o - m.x,
          py = d.y + d.hy * o - m.y,
          along = px * m.hx + py * m.hy,
          side = Math.abs(px * -m.hy + py * m.hx);

        if (side < CORRIDOR + 0.04) {
          lo = Math.min(lo, along);
          hi = Math.max(hi, along);
        }
      }

      if (hi < lo) continue;

      //stood back for it, far enough
      if (d.leader === self && hi < -half - 0.02) continue;

      if (hi > -(half + 0.3 + d.v * 0.7) && lo < half + MIN_GAP) return d;
    }
  }

  return null;
};

/**
 * Whether there is room for something length long at (x, y): nothing else
 * that close to it.
 */
Traffic.prototype.roomAt = function (x, y, length) {
  var t = tileAt(x, y),
    dx,
    dy,
    j;

  for (dx = -1; dx <= 1; dx++)
    for (dy = -1; dy <= 1; dy++) {
      var here = this.index.get(t + dx + dy * Terrain.dy);

      if (here === undefined) continue;

      for (j = 0; j < here.length; j++) {
        var d = here[j],
          ex = d.x - x,
          ey = d.y - y;

        if (
          !d.parked &&
          Math.sqrt(ex * ex + ey * ey) < (d.length + length) / 2 + MIN_GAP
        )
          return false;
      }
    }

  return true;
};

Traffic.Driver = Driver;
Traffic.route = route;
Traffic.routeWaypoints = routeWaypoints;
Traffic.neighbours = neighbours;
Traffic.joins = joins;
Traffic.canDrive = canDrive;
Traffic.direction = direction;
Traffic.rightOf = rightOf;
Traffic.kerb = kerb;
Traffic.DIRECTIONS = DIRECTIONS;
Traffic.LANE = LANE;
Traffic.PARK = PARK;

export default Traffic;
