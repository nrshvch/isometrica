import engine from "engine";
import Core from "../core/main";
import Config from "./config";
import View from "./view";
import RenderLayer from "./renderlayer";
import Carman from "./carman";
import WorkLights from "./worklights";

var Terrain = Core.Terrain,
  Surface = Core.Surface;

/**
 * Roads being laid, and the machines laying them.
 *
 * A road takes a while to lay (data/buildings constructionTime), in two
 * stages: the earth dug out over the first half of it, and a bed of crushed
 * stone rolled in over the second (client/road stage, shared/gen/roads
 * works) - and nothing drives on it till it is finished (client/roadman).
 * Every stretch of road being laid that hangs together is a section, closed
 * off at its ends with barriers (client/roadview), and worked by a crew of
 * two machines going along the whole of it from one end to the other over
 * each stage: first the digger, stopping on every tile to turn and dig, a
 * lorry behind it to cart the earth away; then back the other way, the
 * lorry ahead tipping stone, the digger behind it spreading it. A long
 * section has a crew to every few tiles of it.
 *
 * Every machine has its amber beacon going on its roof, and after dark its
 * work lamps on (client/worklights). Where a machine is is worked out from
 * how far along the road is - the same after a reload as before it.
 */

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//how often the roads being laid are looked over, ms
var SCAN_EVERY = 400;

//how many stretches between one tile and the next a crew takes on at most
var CREW_STRETCH = 6;

//how long at most a machine takes to drive on to the next tile, ms - it
//works there the rest of its time on it
var DRIVE_MOST = 2600;

//how a digger digs, over and over while it works: turned to the side for so
//long, then back the way it goes
var DIG_TURNED = 2200,
  DIG_BACK = 700;

//what works, and in what colour
var COLORS = { excavator: "yellow", lorry: "orange" };

function Roadworks(root) {
  this.root = root;
  //the crews at work, by their section
  this.crews = {};
  this.scanned = 0;
}

Roadworks.prototype.init = function () {
  var go = new engine.GameObject("roadworks");

  go.addComponent(new RoadworksScript(this));
  this.root.game.logic.world.addGameObject(go);
};

function RoadworksScript(man) {
  engine.Component.call(this);
  this.man = man;
}

RoadworksScript.prototype = Object.create(engine.Component.prototype);
RoadworksScript.prototype.profileName = "roadworks";

RoadworksScript.prototype.tick = function (time) {
  var man = this.man;

  man.scanned += time.dt;
  if (man.scanned >= SCAN_EVERY) {
    man.scanned = 0;
    scan(man);
  }

  for (var key in man.crews) man.crews[key].forEach(move);
};

/**
 * Looks the roads being laid over: each drawn as far along as it is - dug
 * out, or its bed laid - and every section of them with its crews, the
 * crews of a section there is no more sent away.
 */
function scan(self) {
  var roadman = self.root.roadman,
    works = roadman.getWorks(),
    seen = {},
    alive = {},
    tile;

  for (tile in works) works[tile].updateProfile();

  for (tile in works) {
    if (seen[tile] === true) continue;

    var section = sectionOf(roadman, works, +tile, seen),
      key = section.tiles.join(",");

    alive[key] = true;
    if (self.crews[key] === undefined) self.crews[key] = crewsOf(self, section);
  }

  for (var k in self.crews)
    if (alive[k] !== true) {
      self.crews[k].forEach(dismiss);
      delete self.crews[k];
    }
}

/**
 * The section of road being laid tile is in - every tile of it that hangs
 * together with it, where they meet level (client/road meets) - and its
 * path: from an end of it, every tile of it in turn, the way a machine
 * goes along it.
 */
function sectionOf(roadman, works, start, seen) {
  var tiles = [start],
    open = [start],
    next = {};

  seen[start] = true;

  while (open.length > 0) {
    var tile = open.pop(),
      surface = works[tile].surface();

    next[tile] = [];

    for (var s = 0; s < 4; s++) {
      var t = tile + STEP[s],
        road = works[t];

      if (road === undefined || !Surface.meets(surface, s, road.surface()))
        continue;

      next[tile].push(t);
      if (seen[t] !== true) {
        seen[t] = true;
        tiles.push(t);
        open.push(t);
      }
    }
  }

  tiles.sort(function (a, b) {
    return a - b;
  });

  return { tiles: tiles, path: pathOf(tiles, next), roads: works };
}

/**
 * The way along a section: from an end of it - a tile with one neighbour in
 * it, or any - to every tile in turn, going back along a branch to the next
 * where it forks; no further than the last tile it comes to.
 */
function pathOf(tiles, next) {
  var start = tiles[0],
    i;

  for (i = 0; i < tiles.length; i++)
    if (next[tiles[i]].length <= 1) {
      start = tiles[i];
      break;
    }

  var out = [start],
    seen = {},
    last = 0;

  seen[start] = true;

  (function walk(tile) {
    next[tile].forEach(function (t) {
      if (seen[t] === true) return;

      seen[t] = true;
      out.push(t);
      last = out.length - 1;
      walk(t);
      out.push(tile);
    });
  })(start);

  return out.slice(0, last + 1);
}

/**
 * The points a machine goes through along path, x, y in tiles - the middle
 * of each tile of it; on a tile on its own, a little either side of its
 * middle, the way the road goes.
 */
function pointsOf(path, roads) {
  if (path.length > 1)
    return path.map(function (tile) {
      return [Terrain.extractX(tile), Terrain.extractY(tile)];
    });

  var tile = path[0],
    x = Terrain.extractX(tile),
    y = Terrain.extractY(tile),
    shape = Surface.shapeOf(roads[tile].surface()),
    alongY = shape === 1 || shape === 3;

  return alongY
    ? [
        [x, y - 0.3],
        [x, y + 0.3],
      ]
    : [
        [x - 0.3, y],
        [x + 0.3, y],
      ];
}

/**
 * The crews for a section: one to every few stretches of its path, each
 * with a share of it - a machine ahead and one behind.
 */
function crewsOf(self, section) {
  var points = pointsOf(section.path, section.roads),
    stretches = points.length - 1,
    n = Math.max(1, Math.round(stretches / CREW_STRETCH)),
    out = [];

  for (var k = 0; k < n; k++)
    out.push({
      man: self,
      section: section,
      points: points,
      //its share of the stretches, from..to
      from: (k * stretches) / n,
      to: ((k + 1) * stretches) / n,
      ahead: machine(self),
      behind: machine(self),
    });

  return out;
}

//a machine, not yet in the world - put there as it is first moved
function machine(self) {
  var go = new engine.GameObject("roadworks"),
    renderer = new WorkLights.Renderer();

  renderer.layer = RenderLayer.buildingsLayer;
  go.addComponent(renderer);
  go.machine = { type: null, heading: null };
  go.man = self;

  return go;
}

function dismiss(crew) {
  [crew.ahead, crew.behind].forEach(function (go) {
    if (go.world !== null) go.world.removeGameObject(go);
  });
}

/**
 * How far along the road being laid a section is: its stage, the one any
 * of it is still in - "dug" or "bed" - and how far through it, 0..1.
 */
function stageOf(section) {
  var least = 1;

  section.tiles.forEach(function (tile) {
    var road = section.roads[tile];

    if (road !== undefined && road.data.getProgress)
      least = Math.min(least, road.data.getProgress());
  });

  return least < 0.5
    ? { stage: "dug", t: least / 0.5 }
    : { stage: "bed", t: (least - 0.5) / 0.5 };
}

/**
 * Puts a crew's machines where they are now: the one ahead along its share
 * of the path - working on each tile a while, then driving on to the next -
 * as far as the stage has got; the one behind a tile behind it, working
 * when it does. The digger ahead the way the path goes while the earth is
 * dug, the lorry ahead the other way back while the stone is laid.
 */
function move(crew) {
  var now = stageOf(crew.section),
    digging = now.stage === "dug",
    points = digging ? crew.points : crew.points.slice().reverse(),
    from = digging ? crew.from : points.length - 1 - crew.to,
    span = crew.to - crew.from,
    at = from + now.t * span,
    //how long the stage spends on a stretch, ms, and how much of it driving
    each = stageTime(crew) / Math.max(1, span),
    drive = Math.min(DRIVE_MOST, each * 0.5) / each,
    i = Math.min(points.length - 2, Math.floor(at)),
    f = at - i,
    working = f < 1 - drive;

  //one point only: nowhere to go
  if (points.length < 2) return;

  place(
    crew.ahead,
    digging ? "excavator" : "lorry",
    points,
    i,
    working ? 0 : ease((f - (1 - drive)) / drive),
    working && digging ? digPose(each * f) : false,
  );

  //the one behind, a tile behind it - there once the one ahead is a tile
  //along, and on a section of more than two tiles
  if (at - 1 < 0 || points.length < 3) {
    if (crew.behind.world !== null)
      crew.behind.world.removeGameObject(crew.behind);
    return;
  }

  place(
    crew.behind,
    digging ? "lorry" : "excavator",
    points,
    i - 1,
    working ? 0 : ease((f - (1 - drive)) / drive),
    working && !digging ? digPose(each * f + DIG_BACK) : false,
  );
}

//how long a stage of a road takes, ms (data/buildings constructionTime)
function stageTime(crew) {
  var road = crew.section.roads[crew.section.tiles[0]],
    time = road && road.data.data ? road.data.data.constructionTime : 40000;

  return time / 2;
}

function ease(k) {
  k = Math.max(0, Math.min(1, k));

  return k * k * (3 - 2 * k);
}

//whether a digger at work is turned to the side to dig, `ms` into its work
function digPose(ms) {
  return ms % (DIG_TURNED + DIG_BACK) < DIG_TURNED;
}

/**
 * Puts go - a machine of type - k of the way from point i of points to the
 * next, facing the way it goes - or turned to its side, to dig - its
 * picture and its lights as it is seen.
 */
function place(go, type, points, i, k, turned) {
  if (i < 0) i = 0;

  var a = points[i],
    b = points[Math.min(points.length - 1, i + 1)],
    x = a[0] + (b[0] - a[0]) * k,
    y = a[1] + (b[1] - a[1]) * k,
    dx = b[0] - a[0],
    dy = b[1] - a[1],
    way = turned ? View.headingOf(-dy, dx) : View.headingOf(dx, dy),
    heading = View.heading(way || "x+"),
    man = go.man,
    state = go.machine;

  if (state.type !== type || state.heading !== heading) {
    var vehicles = man.root.generated ? man.root.generated.vehicles : null,
      looks =
        vehicles && vehicles[type] ? vehicles[type].colors[COLORS[type]] : null,
      look = looks ? looks[heading] : null;

    if (!look) return;

    var renderer = go.spriteRenderer;

    renderer.setSprite(man.root.sprites.getSprite(look.sprite));
    renderer.pivotX = look.pivotX;
    renderer.pivotY = look.pivotY;
    renderer.lights = WorkLights.machineOf(type, heading);

    state.type = type;
    state.heading = heading;
  }

  go.transform.setPosition(
    x * Config.tileSize,
    Carman.groundHeight(man.root, x, y) * Config.tileZStep,
    y * Config.tileSize,
  );

  if (go.world === null) man.root.game.logic.world.addGameObject(go);
}

export default Roadworks;
