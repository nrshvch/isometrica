import Events from "events";
import { Clock } from "shared/schedule";
import { Table, Writer } from "shared/replica";

/**
 * The world as a local server: it alone moves the world's clock on - by
 * real time, in fixed steps (shared/schedule Clock) - and does what the
 * player sends (Logic#command); everything that moved the world on goes
 * into frames (shared/replica), which a copy of it (core/mirror) plays to
 * be the same. Run in the page (client/host InThread) or on a worker
 * (core/serve). See isometrica/.claude/skills/buildings/server.md.
 */

//what a frame's records are: [n, ms] n steps of ms; [ms] a stretch too
//long for steps; paused; [ms] resumed after ms away; [id] a command, its
//JSON; a digest row (digest)
export var STEPS = 1,
  AWAY = 2,
  PAUSE = 3,
  RESUME = 4,
  COMMAND = 5,
  DIGEST = 6;

//the world's step, ms, and the most steps a frame: more than that at once
//(a page held up) is made up for as time away is (Logic#away)
export var STEP = 50,
  MOST_STEPS = 100;

//a digest's fields, a row for the world and one a city
export var FIELDS = 6;

var nums = new Float64Array(2);

/**
 * What a copy is checked against, after every tick: row 0 the world's
 * clock, last name, game time, how many buildings, bulldozers and tiles
 * waiting; a row a city - its id, money, people, buildings.
 *
 * @param world {Logic}
 * @param table {Table}
 */
export function digest(world, table) {
  var n = Object.keys(world.buildings.buildings).length;

  table.set(0, 0, world.clock);
  table.set(0, 1, world.named);
  table.set(0, 2, world.time.now);
  table.set(0, 3, n);
  table.set(0, 4, world.works.count());
  table.set(0, 5, world.works.waitingCount());

  var cities = world.cities.getCities();

  for (var i = 0; i < cities.length; i++) {
    var city = cities[i];

    table.set(i + 1, 0, city.id());
    table.set(i + 1, 1, city.resources.getResources().money || 0);
    table.set(i + 1, 2, city.populationService.getPopulation());
    table.set(i + 1, 3, city.buildingService.getBuildings().length);
  }
}

/**
 * @param world {Logic} opened already; driven from here on (Logic#driveBy)
 */
function Server(world) {
  var self = this;

  world.driveBy();
  this.world = world;
  this.clock = Clock(STEP, MOST_STEPS);
  this.writer = Writer(4096);
  this.version = 0;
  //the frame being written, from version (-1: the first, a snapshot)
  this.open = false;
  this.from = -1;
  this.digest = Table(FIELDS, 4);
  this.ticked = true;
  this.paused = false;

  Events.on(world, world.events.tick, function () {
    self.ticked = true;
  });
}

function begin(self) {
  if (self.open) return;
  self.open = true;
  self.writer.begin(self.from);
}

/**
 * Moves the world on by ms of real time: as many steps as are due, or, for
 * longer than MOST_STEPS of them, at once as time away (Logic#away).
 *
 * @param ms {number}
 */
Server.prototype.run = function (ms) {
  if (this.paused || !(ms > 0)) return;

  var world = this.world;

  begin(this);
  if (ms > STEP * MOST_STEPS) {
    nums[0] = ms;
    this.writer.record(AWAY, nums, 1);
    world.away(ms);
    this.clock.pending = 0;
    return;
  }

  var n = this.clock.advance(ms);

  if (n === 0) return;

  nums[0] = n;
  nums[1] = STEP;
  this.writer.record(STEPS, nums, 2);
  for (var i = 0; i < n; i++) world.advance(STEP);
};

/**
 * Does a command sent as JSON (Logic#command), between steps.
 *
 * @param text {string} the command, JSON
 * @param id {number} the sender's, to find its answer by in the frame
 * @returns {*} what it came to
 */
Server.prototype.receive = function (text, id) {
  begin(this);
  nums[0] = id;
  this.writer.text(COMMAND, nums, 1, text);

  return this.world.command(JSON.parse(text));
};

//the page out of sight: no ticks, nor steps, till resume
Server.prototype.pause = function () {
  if (this.paused) return;

  begin(this);
  this.paused = true;
  this.writer.record(PAUSE, nums, 0);
  this.world.pause();
};

/**
 * Back: the time away made up for (Logic#resume), however long it was by
 * the real clock.
 */
Server.prototype.resume = function () {
  if (!this.paused) return;

  var world = this.world,
    away =
      world.pausedAt === null
        ? 0
        : Math.max(0, world.realNow() - world.pausedAt);

  begin(this);
  this.paused = false;
  nums[0] = away;
  this.writer.record(RESUME, nums, 1);
  world.resume(away);
  this.clock.pending = 0;
};

/**
 * Ends the frame written since the last: with the digest's rows that
 * changed if the world ticked (all of them in the first frame).
 *
 * @returns {Uint8Array|null} the frame - the writer's own, good till
 *          anything more is done here (writer.copy() to keep it) - or null
 *          for nothing to send
 */
Server.prototype.flush = function () {
  if (this.ticked) {
    begin(this);
    digest(this.world, this.digest);
    if (this.from === -1) this.digest.snapshot(this.writer, DIGEST);
    else this.digest.changes(this.writer, DIGEST);
    this.ticked = false;
  }

  if (!this.open) return null;

  this.open = false;
  if (this.writer.count === 0 && this.from !== -1) return null;

  var bytes = this.writer.end(++this.version);

  this.from = this.version;

  return bytes;
};

export default Server;
