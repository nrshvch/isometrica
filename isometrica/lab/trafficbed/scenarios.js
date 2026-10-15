/**
 * The traffic testbed's scenarios (lab/trafficbed/bed.js): a few roads each,
 * the cars put on them, how long they run, and what has to hold by then -
 * tools/traffictest.js runs them all and says which do not; the lab page
 * (lab/traffic.html) shows any one of them going.
 *
 * Maps: # a road both ways, S one with a bus stop, < ^ > v a one-way road
 * going -x, -y, +x, +y; the first line is the lowest y, so on the page +y is
 * down. Tiles start at (1000, 1000), the first column and the first line.
 */
import { Bed, World } from "./bed.js";
import CITY from "./city.json";

//what holds for every scenario unless it says otherwise: nobody turns round
//where the road just goes on, nobody stands in the traffic for more than
//STOOD seconds, nothing locks, nothing drives into anything
var EXPECT = { badTurns: 0, mostStood: 25, locks: 0, overlaps: 0, noRoute: 0 };

//a car meeting another round a tight corner, or turning at a junction past
//one queued in the other lane, can still clip its corner: a few of those
//are allowed where the traffic is thick (known, and as it was before the
//testbed)
var CLIPS = 8;

function at(x, y) {
  return [1000 + x, 1000 + y];
}

/**
 * Cars of these kinds, n in all, onto random roads, driving anywhere at
 * random on and on - as the game's do.
 */
function wanderers(bed, n, kinds) {
  var tries = 0;

  while (bed.cars.length < n && tries++ < n * 20) {
    var tile = bed.anyTile(),
      type = kinds[(bed.random() * kinds.length) | 0];

    bed.add({ type: type, at: tile });
  }
}

export var SCENARIOS = [
  {
    name: "bend",
    about:
      "A street round a corner, busy both ways: nobody turns round on the corner, and the queues go round it.",
    map: [
      "##########",
      "         #",
      "         #",
      "         #",
      "         #",
      "         #",
    ],
    seconds: 90,
    setup: function (bed) {
      for (var i = 0; i < 6; i++) {
        bed.add({
          type: i % 3 ? "car" : "truck",
          at: at(i, 0),
          to: [at(9, 5)],
          then: "gone",
        });
        bed.add({
          type: i % 2 ? "car" : "van",
          at: at(9, 5 - (i % 4)),
          to: [at(0, 0)],
          then: "gone",
        });
      }
    },
    expect: { arrived: 8 },
  },
  {
    name: "one-way in",
    about:
      "A one-way street running into the end of one both ways, and cars on that one going the other way to it: nowhere to go on there - they must not drive up it to turn round where it ends in the one-way street, but go round another way.",
    map: ["#####<<<<<", "#        ^", "#        ^", "##########"],
    seconds: 90,
    setup: function (bed) {
      //along the top street towards where the one-way comes in - their way
      //is round by the bottom
      bed.add({ type: "car", at: at(1, 0), to: [at(9, 3)], then: "gone" });
      bed.add({ type: "truck", at: at(0, 1), to: [at(5, 3)], then: "gone" });
      for (var i = 0; i < 5; i++)
        bed.add({
          type: "car",
          at: at(2 + i, 3),
          to: [at(0, 0)],
          then: "gone",
        });
      //and some calling at a house up that street, then on: they get there
      //down the one-way, the way they can go on from - not up the street,
      //to turn round at the top of it
      for (var k = 0; k < 4; k++)
        bed.add({
          type: k % 2 ? "van" : "car",
          at: at(0, 3 - (k % 2)),
          to: [at(2 + (k % 2), 0), at(6, 3)],
          then: "gone",
        });
    },
    expect: { arrived: 10 },
  },
  {
    name: "roundabout",
    about:
      "A small roundabout, one way round, with a street both ways off each side - cars, trucks and buses crossing it every way at once.",
    map: [
      "    #    ",
      "    #    ",
      "    #    ",
      "   >>v   ",
      "###^.v###",
      "   ^<<   ",
      "    #    ",
      "    #    ",
      "    #    ",
    ],
    seconds: 150,
    setup: function (bed) {
      var ends = [at(4, 0), at(8, 4), at(4, 8), at(0, 4)],
        kinds = ["car", "car", "truck", "van", "lorry"];

      for (var round = 0; round < 3; round++)
        ends.forEach(function (from, i) {
          bed.add({
            type: kinds[(round + i) % kinds.length],
            at: [from[0], from[1]],
            to: [ends[(i + 1 + round) % 4]],
            then: "gone",
          });
        });
    },
    later: function (bed) {
      //and more coming in as they go
      if (bed.now % 6000 < 33) {
        var ends = [at(4, 0), at(8, 4), at(4, 8), at(0, 4)],
          i = (bed.random() * 4) | 0;

        bed.add({
          type: bed.random() < 0.3 ? "truck" : "car",
          at: ends[i],
          to: [ends[(i + 1 + ((bed.random() * 3) | 0)) % 4]],
          then: "gone",
        });
      }
    },
    expect: { arrived: 14 },
  },
  {
    name: "one-way, two lanes",
    about:
      "A one-way street of two lanes into a junction, half turning left and half right - each has to change lanes across the other's queue.",
    map: [
      "           #",
      "           #",
      ">>>>>>>>>>>#",
      "           #",
      "           #",
    ],
    seconds: 120,
    setup: function (bed) {
      for (var i = 0; i < 10; i++)
        bed.add({
          type: i % 4 === 0 ? "truck" : "car",
          at: at(i, 2),
          to: [i % 2 ? at(11, 0) : at(11, 4)],
          then: "gone",
        });
    },
    expect: { arrived: 10 },
  },
  {
    name: "bus stop",
    about:
      "A bus standing at its stop on a street both ways, the traffic behind it going round it when the other lane is clear.",
    map: ["####S#####S#####"],
    seconds: 120,
    setup: function (bed) {
      bed.add({
        type: "bus",
        bus: true,
        at: at(3, 0),
        to: [at(4, 0), at(10, 0), at(15, 0)],
        dwell: 5000,
      });
      for (var i = 0; i < 3; i++)
        bed.add({ type: "car", at: at(i, 0), to: [at(15, 0)], then: "gone" });
      for (var j = 0; j < 3; j++)
        bed.add({
          type: "car",
          at: at(15 - j, 0),
          to: [at(0, 0)],
          then: "gone",
        });
    },
    expect: {},
  },
  {
    name: "parked",
    about:
      "Cars pulling in at the kerb along a street both ways, a while, and out again, the traffic going by them - and round them, never through them.",
    map: ["##################", "#                #", "##################"],
    seconds: 150,
    setup: function (bed) {
      for (var i = 0; i < 8; i++)
        bed.add({
          type: i % 3 ? "car" : "van",
          at: at(1 + i * 2, 0),
          to: [at(3 + ((i * 5) % 14), 2)],
          then: "again",
          dwell: 4000,
        });
      for (var k = 0; k < 6; k++)
        bed.add({ type: "car", at: at(2 + k * 2, 2) });
    },
    expect: { overlaps: 2 },
  },
  {
    name: "grid",
    about:
      "A little grid of streets, some dead ends, thirty cars about it at random.",
    map: [
      "#########",
      "#   #   #",
      "#   #   ##",
      "#########",
      "#   #   #",
      "#   #   #",
      "#########",
      "    #",
      "    #",
    ],
    seconds: 180,
    setup: function (bed) {
      wanderers(bed, 30, ["car", "car", "small", "van", "truck"]);
    },
    expect: { mostStood: 40, overlaps: CLIPS },
  },
  {
    name: "city",
    about:
      "The streets of the city the games start on, its one-way roads and its roundabout - sixty cars, trucks and vans about it at random and buses round their stops.",
    roads: CITY,
    seconds: 240,
    setup: function (bed) {
      var stops = bed.world.stops();

      wanderers(bed, 60, [
        "car",
        "car",
        "car",
        "small",
        "van",
        "lorry",
        "truck",
      ]);

      for (var b = 0; b < 2 && stops.length > 1; b++)
        bed.add({
          type: "bus",
          bus: true,
          at: stops[b],
          to: stops.slice(b + 1).concat(stops.slice(0, b + 1)),
          dwell: 6000,
        });
    },
    expect: { mostStood: 40, overlaps: CLIPS },
  },
];

/**
 * A scenario set going: its world, its bed, its cars.
 */
export function start(scenario, seed) {
  var world = scenario.roads
      ? new World(scenario.roads)
      : World.fromText(scenario.map),
    bed = new Bed(world, seed);

  scenario.setup(bed);

  return bed;
}

/**
 * Runs a scenario through, and says whether what has to hold did.
 *
 * @returns {{name, ok, failed: string[], report}}
 */
export function check(scenario, seed) {
  var bed = start(scenario, seed),
    ms = scenario.seconds * 1000;

  for (var t = 0; t < ms; t += 33) {
    bed.step(33);
    if (scenario.later) scenario.later(bed);
  }

  var report = bed.report(),
    expect = Object.assign({}, EXPECT, scenario.expect),
    failed = [];

  if (report.badTurns.length > expect.badTurns)
    failed.push(report.badTurns.length + " turned round mid-road");
  if (report.mostStood > expect.mostStood)
    failed.push("one stood " + report.mostStood + " s in the traffic");
  if (report.locks.length > expect.locks)
    failed.push(report.locks.length + " locked");
  if (report.overlaps.length > expect.overlaps)
    failed.push(report.overlaps.length + " drove into each other");
  if (report.noRoute.length > expect.noRoute)
    failed.push(report.noRoute.length + " with no way to go");
  if (expect.arrived !== undefined && report.arrived < expect.arrived)
    failed.push(
      "only " + report.arrived + " of " + expect.arrived + " got there",
    );

  return {
    name: scenario.name,
    ok: failed.length === 0,
    failed: failed,
    report: report,
    bed: bed,
  };
}
