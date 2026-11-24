import { Reader, Replica, Table } from "shared/replica";
import {
  AWAY,
  COMMAND,
  DIGEST,
  FIELDS,
  PAUSE,
  RESUME,
  STEPS,
  digest,
} from "./server";

/**
 * A copy of a world kept the same as a server's (core/server) by playing
 * its frames: the same steps, the same commands at the same moments, so it
 * is a world of the same shape the client reads as it always has. Checked
 * against the server's digest after every tick it plays. Given the
 * server's own world (same), it plays nothing - the world is moved on
 * already - and only answers the commands. See
 * isometrica/.claude/skills/buildings/server.md.
 *
 * @param world {Logic}
 * @param [same] {boolean} the server's own world
 */
function Mirror(world, same) {
  this.world = world;
  this.same = same === true;
  if (!this.same) {
    world.follows = true;
    world.driveBy();
  }
  this.reader = Reader();
  this.replica = Replica();
  //the server's digest, as its frames have it, and this world's own
  this.theirs = Table(FIELDS, 4);
  this.ours = Table(FIELDS, 4);
  //answers waited for, by the command's id: function(result)
  this.waiting = new Map();
  //frames that did not come out the same, and the version of the first
  this.diverged = 0;
  this.divergedAt = -1;
  //frames dropped, a version having been missed
  this.dropped = 0;
}

/**
 * Plays a frame.
 *
 * @param bytes {Uint8Array|ArrayBuffer}
 * @returns {boolean} whether it was played - not, for one not on top of
 *          the version this copy has
 */
Mirror.prototype.apply = function (bytes) {
  var r = this.reader,
    world = this.world,
    same = this.same,
    digested = false,
    i;

  r.open(bytes);
  if (!this.replica.accept(r)) {
    this.dropped++;
    return false;
  }

  while (r.next() >= 0) {
    switch (r.kind) {
      case STEPS:
        if (!same) for (i = 0; i < r.nums[0]; i++) world.advance(r.nums[1]);
        break;
      case AWAY:
        if (!same) world.away(r.nums[0]);
        break;
      case PAUSE:
        if (!same) world.pause();
        break;
      case RESUME:
        if (!same) world.resume(r.nums[0]);
        break;
      case COMMAND:
        command(this, r.nums[0], same ? null : r.text());
        break;
      case DIGEST:
        this.theirs.apply(r);
        digested = true;
        break;
    }
  }

  if (digested && !same) check(this, r.to);

  return true;
};

function command(self, id, text) {
  var result,
    done = self.waiting.get(id);

  if (text !== null)
    try {
      result = self.world.command(JSON.parse(text));
    } catch (e) {
      console.error("A command played went wrong:", e);
    }

  if (done !== undefined) {
    self.waiting.delete(id);
    done(result);
  }
}

//this world's digest against the server's
function check(self, version) {
  var ours = self.ours,
    theirs = self.theirs;

  digest(self.world, ours);

  var same = ours.rows === theirs.rows;

  for (var r = 0; same && r < ours.rows; r++)
    for (var f = 0; f < FIELDS; f++)
      if (ours.get(r, f) !== theirs.get(r, f)) {
        same = false;
        break;
      }

  if (!same) {
    if (self.diverged === 0) {
      self.divergedAt = version;
      console.warn("The world's copy is not the same as the server's", {
        version: version,
        ours: Array.from(ours.cols, function (c) {
          return Array.from(c.subarray(0, ours.rows));
        }),
        theirs: Array.from(theirs.cols, function (c) {
          return Array.from(c.subarray(0, theirs.rows));
        }),
      });
    }
    self.diverged++;
  }
}

export default Mirror;
