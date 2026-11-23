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

var START_AT_KEY = "isometrica.startAt",
  //the id of a new city to start from the initial city, rather than from
  //nothing - kept over the page going up again on it (startFreshCity)
  FROM_INITIAL_KEY = "isometrica.fromInitial",
  //and of one to start from the big city, Peepstown (Game.bigCity)
  FROM_BIG_KEY = "isometrica.fromBig",
  //and of one to generate, with how: {id, size, seed, near} (Game.generator)
  GENERATE_KEY = "isometrica.generate";

//the city to generate the page is going up on, as asked before it reloaded
//(startGeneratedCity) - read once, and kept till it is generated
var generating = (function () {
  var value = null;

  try {
    value = JSON.parse(window.sessionStorage.getItem(GENERATE_KEY));
    window.sessionStorage.removeItem(GENERATE_KEY);
  } catch (e) {
    //no storage, or nothing sensible in it: nothing was asked
  }

  return value !== null && typeof value === "object" ? value : null;
})();

//whether the city asked for is the one kept under the key - asked once
function asked(key, id) {
  var value = null;

  try {
    value = window.sessionStorage.getItem(key);
    window.sessionStorage.removeItem(key);
  } catch (e) {
    //no storage: nothing was asked
  }

  return id !== null && value === id;
}

//whether the city asked for is a new one to start from the initial city -
//or the big city, to start from in its place (CityPersistence#open)
function fromInitial(id) {
  var initial = asked(FROM_INITIAL_KEY, id),
    big = asked(FROM_BIG_KEY, id);

  if (generator !== null && generating !== null && generating.id === id)
    try {
      return generator.default({
        size: generating.size,
        seed: generating.seed,
        near: generating.near,
      }).save;
    } catch (e) {
      //a city that could not be generated is a blank one, on empty land -
      //not a game that never comes up
      console.error("Could not generate the city", generating, e);
      return false;
    }

  return big && bigCity !== null ? bigCity : initial;
}

var core = null,
  client = null,
  router = null,
  starting = null,
  //the big city to start over on, once loaded (Game.bigCity)
  bigCity = null,
  //what generates a city, loaded if one is to be (Game.generator)
  generator = null,
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
 * The catalogue of what can go up in the place of the building on tile -
 * whatever covers its ground, turned one way or another.
 *
 * @param tile {number} the corner of the building
 */
export function goReplace(tile) {
  go("/replace/" + tile);
}

/**
 * Puts code up in the place of the building on tile, back in the world: it
 * comes down as the bulldozers get to it, and code goes up on its ground
 * once they are done (isometrica client/buildman replace).
 *
 * @param tile {number}
 * @param code {number|string} (isometrica data/buildingcode)
 */
export function replace(tile, code) {
  go("");
  client.buildman.replace(tile, code);
}

/**
 * Clears the building on tile away, as clearing its ground does - paid for
 * at once, fenced off and brought down by the bulldozers where it stands,
 * the ground left clear (isometrica client/buildman demolish).
 *
 * @param tile {number}
 */
export function demolish(tile) {
  client.buildman.demolish(tile);
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
    Game.initialCity ? Game.initialCity() : null,
    Game.bigCity ? Game.bigCity() : null,
    generating !== null && Game.generator ? Game.generator() : null,
  ]).then(function (modules) {
    var Vkaria = modules[0].default.Vkaria,
      Core = modules[1].default;

    bigCity = modules[4] ? modules[4].default : null;
    generator = modules[5] || null;

    core = new Core.Logic({
      tick: Game.tick,
      saves: Game.saves,
      api: Game.api,
      catchUp: Game.catchUp,
      initialCity: modules[3] ? modules[3].default : undefined,
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

      var id = core.persistence.open(requestedId, fromInitial(requestedId));

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

//how long the game has to have been away for the player to be welcomed back
//(Welcome), real ms - a reload is no time away, and what it made then only
//floats up
var WELCOME_AFTER = 60000;

/**
 * What the city made while the game was closed (isometrica core/persistence
 * caughtUp) - once, when the splash is out of the way of it: the player
 * welcomed back with it, after a while away (Welcome), or it floated up over
 * the middle of the city.
 */
export function showCaughtUp() {
  var caught = core === null ? null : core.persistence.caughtUp,
    city = core === null ? null : core.cities.getCity(0);

  if (caught === null || !city) return;

  core.persistence.caughtUp = null;

  if (caught.away >= WELCOME_AFTER) {
    store.setState({
      welcome: {
        away: caught.away,
        //game time, ms
        went: caught.ticks * Game.tick,
        money: Math.round(caught.money),
        //away longer than the city goes on for meanwhile
        capped: caught.capped === true,
        name: city.name(),
      },
    });
    return;
  }

  floatIncome(caught.money);
}

/**
 * Sees the player welcomed back (Welcome), and floats up over the city what
 * it made meanwhile.
 */
export function closeWelcome() {
  var welcome = store.getState().welcome;

  store.setState({ welcome: null });

  if (welcome) floatIncome(welcome.money);
}

function floatIncome(money) {
  var city = core === null ? null : core.cities.getCity(0);

  if (city && money >= 1) client.cityman.showIncome(city, Math.round(money));
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
 * The name of the big city to start over on (Game.bigCity), or null for none -
 * for the menu to say what starting over on it starts on.
 *
 * @returns {string|null}
 */
export function bigCityName() {
  return (bigCity && bigCity.city.name) || null;
}

/**
 * Leaves the city behind and starts a new one under an id of its own: blank,
 * the initial city every new player starts on, or the big one. The old one
 * stays in storage, to be come back to by its own address.
 *
 * @param initial {boolean|string} from the initial city, rather than from
 *        nothing - or "big", from the big city
 */
function startFreshCity(initial) {
  var id = core === null ? null : core.persistence.newCityId();

  //the initial city opens where it stands, the camera on it - and nothing
  //asked of a city with no id to go by
  if (initial && id !== null)
    try {
      window.sessionStorage.setItem(
        initial === "big" ? FROM_BIG_KEY : FROM_INITIAL_KEY,
        id,
      );
    } catch (e) {
      //no storage - a blank city, then
    }
  //a blank one is not dropped right where the player stands, but somewhere
  //within a square ClientConfig.citySpreadTiles wide around it - cityman
  //picks it up after the reload and opens the camera there
  else if (client !== null && client.camera) {
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

  reopen(id);
}

/**
 * Leaves the city behind and starts on one generated afresh, under an id of
 * its own: built up, all of it, somewhere about where a blank city would go
 * - within a square ClientConfig.citySpreadTiles wide round where the camera
 * is - out of a seed of its own. The seed and the spot go over the page
 * reloading on it, and the city is generated as it opens (fromInitial): the
 * same seed and spot, the same city.
 *
 * @param size {string} which size (citygen SIZES)
 */
function startGeneratedCity(size) {
  var id = core === null ? null : core.persistence.newCityId(),
    near = [32768, 27000];

  if (client !== null && client.camera) {
    var pos = client.camera.transform.getPosition(),
      span = ClientConfig.citySpreadTiles;

    near = [
      Math.round(pos[0] / ClientConfig.tileSize + (Math.random() - 0.5) * span),
      Math.round(pos[2] / ClientConfig.tileSize + (Math.random() - 0.5) * span),
    ];
  }

  try {
    window.sessionStorage.setItem(
      GENERATE_KEY,
      JSON.stringify({
        id: id,
        size: size,
        seed: Math.floor(Math.random() * 4294967296),
        near: near,
      }),
    );
  } catch (e) {
    //no storage - a blank city, then
  }

  reopen(id);
}

/**
 * Asks whether the player really means to leave this city behind for one
 * generated afresh, and starts on it if they do (startGeneratedCity).
 *
 * @param size {string} which size (citygen SIZES)
 */
export function startGenerated(size) {
  ask(
    "Do you really want to start on a new random " +
      (size === "town" ? "town" : "city") +
      "?",
    function () {
      startGeneratedCity(size);
    },
  );
}

//asks the player over the world, from whatever screen the menu was opened
//on, and goes on with then if they say yes
function ask(question, then) {
  var world = worldScreen(),
    controls;

  go("");
  world.showHint(question);

  controls = world.showControls();
  controls.canRotate(false);
  controls.onSubmit = function () {
    world.hideHint();
    then();
  };
  controls.onDiscard = function () {
    world.hideHint();
    world.show();
  };
}

/**
 * Asks whether the player really means to leave this city behind, and starts
 * a new one under a new id if they do - blank, the initial city, or the big
 * one. The city they are on is kept - it stays in storage under its own
 * address.
 *
 * @param [initial] {boolean|string} from the initial city, rather than from
 *        nothing - or "big", from the big city, Peepstown
 */
export function startFresh(initial) {
  ask(
    initial
      ? "Do you really want to start over on " +
          (initial === "big" ? bigCityName() : core.persistence.initialName()) +
          "?"
      : "Do you really want to start fresh?",
    function () {
      startFreshCity(initial === "big" ? "big" : initial === true);
    },
  );
}
