/**
 * What the game's screens show that is not React's own to know: set from
 * the world's side - isometrica's client, through the bridge (bridge.js), and
 * the game coming up (session.js) - and read by the screens.
 */
import { createStore, useStore } from "zustand";

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
    //true while an action (build, shape the ground, buy land...) holds the
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
  };
});

export function useGame(selector) {
  return useStore(store, selector);
}
