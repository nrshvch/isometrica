/**
 * The game going: the world loaded and put together once, on the way up -
 * the engine, isometrica's client with the city builder's own part of it
 * (play.js), the city opened in it - and drawn on the canvas the world
 * screen puts up for it (WorldCanvas). And the ways round the game's
 * screens, by the address (router.jsx), for what is clicked over the world
 * and for isometrica's client, which sees them through the bridge
 * (bridge.js).
 */
import ClientConfig from "isometrica/client/config";
import Game from "../game";
import { createBridge } from "./bridge";
import { store } from "./store";

var START_AT_KEY = "isometrica.startAt";

var core = null,
  client = null,
  router = null,
  starting = null,
  //where the world is drawn, once the world screen has put it up - and who
  //is waiting for it
  container = null,
  waiting = [];

var bridge = createBridge({
  client: function () {
    return client;
  },
  world: function () {
    go("");
  },
  catalogue: function () {
    go("/catalogue");
  },
  city: function () {
    go("/city");
  },
  build: build,
});

export function getCore() {
  return core;
}

export function getClient() {
  return client;
}

export function worldScreen() {
  return bridge.gameScreen().worldScreen();
}

/**
 * The router the screens are found by (router.jsx), for getting about from
 * outside React.
 */
export function connect(r) {
  router = r;
}

//where in the city the address is, under the city's own: "" the world,
//"/catalogue", "/city"
function go(where, replace) {
  var id = store.getState().cityId,
    path = (id ? "/" + id : "") + where;

  if (router !== null && router.state.location.pathname !== (path || "/"))
    router.navigate(path || "/", { replace: replace === true });
}

export function goWorld() {
  go("");
}

export function goCatalogue() {
  go("/catalogue");
}

export function goCity() {
  go("/city");
}

/**
 * Builds what is picked, in the world: a building out of the catalogue, a
 * road.
 *
 * @param code {number|string} (isometrica data/buildingcode)
 */
export function build(code) {
  go("");
  client.buildman.build(code);
}

/**
 * The world screen's canvas, put up - and taken down, with null. The world
 * goes onto it as soon as it is up.
 */
export function setContainer(el) {
  container = el;

  if (el === null) return;

  waiting.forEach(function (f) {
    f(el);
  });
  waiting = [];
}

function containerReady() {
  if (container !== null) return Promise.resolve(container);

  return new Promise(function (resolve) {
    waiting.push(resolve);
  });
}

//the engine and the world, put together - once
function load() {
  return Promise.all([
    import("isometrica/client/main"),
    import("isometrica/core/main"),
    Game.client ? Game.client() : null,
  ]).then(function (modules) {
    var Vkaria = modules[0].default.Vkaria,
      Core = modules[1].default;

    core = new Core.Logic({
      tick: Game.tick,
      saves: Game.saves,
      api: Game.api,
    });
    client = new Vkaria(core, bridge, modules[2] ? modules[2].default : null);
  });
}

//the world drawn into the container - in the place of a canvas of its own,
//which the engine swaps for the one it draws on in WebGL (engine Viewport)
function attach(el) {
  var canvas = document.createElement("canvas"),
    viewport;

  canvas.className = "block size-full";
  el.appendChild(canvas);
  viewport = client.game.graphics.createViewport(canvas);
  viewport.setCamera(client.camera);
  viewport.setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);

  //and kept the size of the container whatever makes it change
  new ResizeObserver(function () {
    viewport.setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);
  }).observe(el);
}

/**
 * Starts the game on a city: the one asked for by its id, or whichever is
 * the active one - once, however often it is asked.
 *
 * @param requestedId {string|null}
 * @returns {Promise}
 */
export function start(requestedId) {
  if (starting !== null) return starting;

  starting = load()
    .then(function () {
      return new Promise(function (resolve) {
        //the pictures, ready to be drawn by name
        client.prepare(resolve);
      });
    })
    .then(function () {
      core.start();

      //the saved city goes into the world before the client puts anything
      //on screen, so that what is drawn is drawn once - the server's save
      //of it, if that is newer than the one here
      return core.persistence.prepare(requestedId);
    })
    .then(function () {
      var cities = core.cities;

      var id = core.persistence.open(requestedId);

      //in the address bar, so the tab can be bookmarked or shared - the
      //screen it asked for, if any, kept after it
      store.setState({ cityId: id });
      if (id !== requestedId && router !== null) {
        var path = router.state.location.pathname;

        router.navigate(
          "/" + id + (requestedId ? path.slice(1 + requestedId.length) : ""),
          { replace: true },
        );
      }

      client.start();

      return containerReady().then(function (el) {
        attach(el);
        worldScreen().show();
        client.startServices();

        //the money over the world is the city's: up once there is one - out of a save,
        //or founded
        store.setState({
          phase: "ready",
          hasCity: cities.getCities().length > 0,
        });
        cities.onNewCity().on(function () {
          store.setState({ hasCity: true });
        });
      });
    });

  return starting;
}

/**
 * Opens another city, by starting the page over on it. The world, the engine
 * and everything hanging off them are built once on the way up, so this is
 * what switching cities means - and the city being left is written out on the
 * way, the same as closing the tab.
 *
 * @param id {string|null} null opens whichever city is the active one
 */
export function reopen(id) {
  window.location.assign("/" + (id === null ? "" : id));
}

/**
 * Leaves the city behind and starts a new one, blank, under an id of its own.
 * The old one stays in storage, to be come back to by its own address.
 */
function startFreshCity() {
  //the new city is not dropped right where the player stands, but somewhere
  //within a square ClientConfig.citySpreadTiles wide around it - cityman
  //picks it up after the reload and opens the camera there
  if (client !== null && client.camera) {
    var pos = client.camera.transform.getPosition(),
      span = ClientConfig.citySpreadTiles * ClientConfig.tileSize;

    try {
      window.sessionStorage.setItem(
        START_AT_KEY,
        JSON.stringify({
          x: pos[0] + (Math.random() - 0.5) * span,
          z: pos[2] + (Math.random() - 0.5) * span,
        }),
      );
    } catch (e) {
      //no storage - the new city just opens where the camera defaults to
    }
  }

  reopen(core === null ? null : core.persistence.newCityId());
}

/**
 * Asks whether the player really means to leave this city behind, and starts
 * a new blank one under a new id if they do. The city they are on is kept -
 * it stays in storage under its own address.
 */
export function startFresh() {
  var world = worldScreen(),
    controls;

  //asked over the world, from whatever screen the menu was opened on
  go("");
  world.showHint("Do you really want to start fresh?");

  controls = world.showControls();
  controls.canRotate(false);
  controls.onSubmit = function () {
    world.hideHint();
    startFreshCity();
  };
  controls.onDiscard = function () {
    world.hideHint();
    world.show();
  };
}
