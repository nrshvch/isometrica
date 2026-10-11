/**
 * The city builder's buttons over the world: the ones it starts on - to found
 * a city where there is none - and the building tools once there is: start
 * afresh, the catalogue, a road, shaping the ground and buying land. And the
 * steps a road is picked in before it is laid.
 */
import BuildingCode from "data/buildingcode";

/**
 * Puts up the buttons the world shows when nothing else is going on.
 *
 * @param world {WorldScreen} (ui/modules/world)
 * @param [name] {string} "build" for the building tools whatever the city
 */
export function showWorld(world, name) {
  var client = world.client;

  if (name !== "build" && !client.core.cities.getCity(0)) {
    world.showButtons([
      undefined,
      undefined,
      {
        icon: "house-icon",
        action: function () {
          client.cityman.establish();
        },
      },
    ]);
    return;
  }

  world.showButtons([
    {
      icon: "cross-icon",
      action: function () {
        startFresh(world);
      },
    },
    {
      icon: "house-icon",
      action: function () {
        world.ui.navigate("catalogue");
      },
    },
    {
      icon: "road-icon",
      action: function () {
        pickRoad(world);
      },
    },
    {
      icon: "bulldozer-icon",
      action: function () {
        world.ui.navigate("terrain");
      },
    },
    {
      icon: "tile-dollar-icon",
      action: function () {
        world.ui.navigate("land");
      },
    },
  ]);
}

/**
 * Asks whether the player really means to leave this city behind, and starts
 * a new blank one under a new id if they do. The city they are on is kept -
 * it stays in storage under its own address.
 */
export function startFresh(world) {
  world.showHint("Do you really want to start fresh?");

  var controls = world.showControls();
  controls.canRotate(false);

  controls.onSubmit = function () {
    world.hideHint();
    world.ui.startFreshCity();
  };

  controls.onDiscard = function () {
    world.hideHint();
    world.show();
  };

  return controls;
}

/**
 * Asks what a road is to be laid in before it is laid - gravel, the lanes of
 * a village and the default; cobbles; or asphalt - the way the ground is
 * shaped by picking what to do to it first, and then which ways it goes
 * (pickWay). Gravel laid by the old town comes out cobbled (client/road
 * materialAt).
 */
export function pickRoad(world) {
  function lay(material) {
    return function () {
      pickWay(world, material);
    };
  }

  world.showHint("Lay the road in gravel, cobbles or asphalt");
  world.showTools([
    {
      icon: "cross-icon",
      action: function () {
        world.hideHint();
        world.show();
      },
    },
    { icon: "gravel-road-icon", action: lay("gravel") },
    { icon: "cobble-road-icon", action: lay("cobble") },
    { icon: "road-icon", action: lay("asphalt") },
  ]);
}

/**
 * Asks, a road's material picked, whether it is driven both ways or one way
 * only - a one-way road going the way it is dragged (client/buildman) - or
 * back to the materials.
 */
export function pickWay(world, material) {
  function lay(way) {
    return function () {
      world.hideHint();
      world.ui.navigate("build", [BuildingCode.road, material, way]);
    };
  }

  world.showHint("Both ways, or one way only?");
  world.showTools([
    {
      icon: "back-icon",
      action: function () {
        pickRoad(world);
      },
    },
    { icon: "two-way-road-icon", action: lay("two") },
    { icon: "one-way-road-icon", action: lay("one") },
  ]);
}
