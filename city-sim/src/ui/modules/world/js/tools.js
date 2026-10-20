/**
 * The city builder's buttons over the world: the ones it starts on - to found
 * a city where there is none - and the building tools once there is: start
 * afresh, the catalogue, a road, shaping the ground and buying land. A road
 * is picked - what it is laid in, which ways it goes - as it is laid
 * (isometrica client/buildman build).
 */
import BuildingCode from "isometrica/data/buildingcode";

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
        world.ui.navigate("build", [BuildingCode.road]);
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
