/**
 * What the game's screens show that is not React's own to know: set from
 * the world's side - isometrica's client, through the bridge (bridge.js), and
 * the game coming up (session.js) - and read by the screens.
 */
import { createStore, useStore } from "zustand";

//where the debug panel is kept up or put away in the browser
var DEBUG_STORE = "isometrica.debug";

//whether the debug panel is up: as asked in the address (?debug=on), or as
//kept, or not
function debugWanted() {
  var asked = /[?&]debug=(on|off)/.exec(location.search);

  if (asked) return asked[1] === "on";

  try {
    return localStorage.getItem(DEBUG_STORE) === "on";
  } catch (e) {
    return false;
  }
}

export var store = createStore(function () {
  return {
    //"loading" till the world is up and the city in it, then "ready"
    phase: "loading",
    //the city the game is playing, once it knows - for the address bar
    cityId: null,
    //whether there is a city yet: the money over the world is the city's
    hasCity: false,
    //a line of what to do, over the world
    hint: "",
    //true while an action (build, lay a road, shape the ground...) holds the
    //buttons
    busy: false,
    //the buttons along the bottom, five slots: {icon, label, on, go,
    //disabled, action} each, or undefined for an empty one
    buttons: [],
    //whether the world is drawn at night - the screens over it dark with it
    night: false,
    //asking the player for a word: {message, placeholder, submit(value),
    //discard()} - or null
    prompt: null,
    //whether the debug panel is up over the world (DebugPanel)
    debug: debugWanted(),
  };
});

/**
 * Puts the debug panel up or away - the other way round from now, unless
 * told - and keeps it so for next time.
 *
 * @param [on] {boolean}
 */
export function setDebug(on) {
  var debug = on === undefined ? !store.getState().debug : on === true;

  try {
    localStorage.setItem(DEBUG_STORE, debug ? "on" : "off");
  } catch (e) {
    //not kept: as it is now, then
  }

  store.setState({ debug: debug });
}

export function useGame(selector) {
  return useStore(store, selector);
}
