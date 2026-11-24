import Config from "./config";

/**
 * What the player does to the world, as plain objects - {type, ...} - and
 * the one place they are done (Logic#command): so that they can be sent
 * from anywhere, a worker or a server later, and played again the same.
 * See isometrica/.claude/skills/buildings/core.md (Commands).
 */

//the city a command is for: the one it names, or the world's first
function cityOf(world, command) {
  return command.city !== undefined && command.city !== null
    ? world.cities.getCity(command.city) || null
    : world.cities.getCities()[0] || null;
}

var run = {
  /**
   * {type: "build", code, tile, rotation, look, surface} - something put up
   * (core/city/citybuildings buildBuilding): a building, a road.
   */
  build: function (world, c) {
    return cityOf(world, c).buildingService.buildBuilding(
      c.code,
      c.tile,
      c.rotation,
      c.look,
      c.surface,
    );
  },

  /**
   * {type: "clear", tiles} - the ground and whatever stands on it cleared,
   * every tile on its own, and the bulldozers sent (core/works).
   *
   * @returns {{cleared: number[], cost: number}} the tiles cleared, and what
   *          it all came to
   */
  clear: function (world, c) {
    var city = cityOf(world, c),
      cost = 0,
      cleared = world.works.clear(c.tiles, function (tile) {
        var tiles = city.clearTile(tile);

        //every tile is charged on its own - with the rest of a building on
        //it
        cost +=
          tiles.cost !== undefined
            ? tiles.cost
            : tiles.length * Config.clearTileCost;

        return tiles;
      });

    return { cleared: cleared, cost: cost };
  },

  /**
   * {type: "replace", tile, code, rotation, look} - what stands on tile
   * brought down for another to go up (City#replace), the bulldozers sent.
   *
   * @returns {Object} City#replace's result, and the tiles cleared
   */
  replace: function (world, c) {
    var city = cityOf(world, c),
      result = null,
      cleared = world.works.clear([c.tile], function (tile) {
        result = city.replace(tile, c.code, c.rotation, c.look);

        return result.tiles;
      });

    result.cleared = cleared;
    return result;
  },

  /**
   * {type: "explode", tile, yards} - blown up (City#explode); yards, the
   * tiles that are only yards as whoever draws them knows, or none.
   */
  explode: function (world, c) {
    var yards = null;

    if (Array.isArray(c.yards)) {
      yards = Object.create(null);
      c.yards.forEach(function (t) {
        yards[t] = true;
      });
    }

    return cityOf(world, c).explode(
      c.tile,
      yards === null
        ? undefined
        : function (t) {
            return yards[t] === true;
          },
    );
  },

  /** {type: "fire", tile} - set on fire (City#fireUp). */
  fire: function (world, c) {
    return cityOf(world, c).fireUp(c.tile);
  },

  /** {type: "terraform", tiles, direction} - the ground raised or lowered. */
  terraform: function (world, c) {
    return cityOf(world, c).terraform(c.tiles, c.direction);
  },

  /** {type: "found", tile, name} - a city founded (CityService). */
  found: function (world, c) {
    return world.cities.establishCity(c.tile, c.name);
  },
};

/**
 * Does a command to the world.
 *
 * @param world {Logic}
 * @param command {{type: string}}
 * @returns {*} what it came to, by its type
 */
function runCommand(world, command) {
  var does = run[command && command.type];

  if (typeof does !== "function")
    throw new Error("No such command: " + (command && command.type));

  return does(world, command);
}

export default { run: runCommand, types: Object.keys(run) };
