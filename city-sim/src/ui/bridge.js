/**
 * What isometrica's client sees of the game's screens (client/vkaria `ui`):
 * ui.gameScreen() and its worldScreen(), the way every game hands them over -
 * hints over the world, the buttons of an action going on, a word asked
 * for, the world given back. Here they go into the store (store.js), for the
 * React screens to show.
 */
import ReactiveProperty from "reactive-property";
import BuildingCode from "isometrica/data/buildingcode";
import { store } from "./store";
import WorldAction from "./world/worldaction";

var set = store.setState;

/**
 * @param go {{client(), world(), catalogue(), city(), build(code)}} the
 *        client, and how to get to the game's screens and do what its
 *        buttons do (session.js)
 */
export function createBridge(go) {
  //the action holding the buttons, and what it is listened to by
  var holding = null,
    unwatch = [];

  function release() {
    unwatch.forEach(function (f) {
      f();
    });
    unwatch = [];
    holding = null;
  }

  var worldScreen = {
    //true while an action holds the buttons, so the world's decorations
    //know to stay out of the way (client/serviceman)
    busy: ReactiveProperty(false),

    showHint: function (text) {
      set({ hint: text });
    },

    hideHint: function () {
      set({ hint: "" });
    },

    /**
     * The world with nothing else going on: its buttons - to found a city
     * where there is none, the building tools once there is.
     *
     * @param [name] {string} "build" for the building tools, whatever the
     *        city
     */
    show: function (name) {
      release();
      worldScreen.busy(false);
      set({ busy: false, buttons: idle(go, name) });
    },

    /**
     * Puts up the buttons, nothing holding them.
     *
     * @param buttons {Object[]} per slot, {icon, label, action, on, go,
     *        disabled} - a slot left undefined has none
     */
    showButtons: function (buttons) {
      release();
      set({ buttons: buttons.slice() });
    },

    /**
     * Hands the buttons to an action - leaving it, confirming it, turning
     * what it puts up round, its own toggles - which gives them back by
     * showing the world again.
     *
     * @returns {WorldAction}
     */
    showControls: function (controls) {
      if (controls === undefined) controls = new WorldAction();

      release();
      holding = controls;

      function render() {
        if (holding === controls) set({ buttons: actionButtons(controls) });
      }

      [
        controls.canRotate,
        controls.canShuffle,
        controls.tools,
        controls.canSubmit,
      ].forEach(function (prop) {
        if (!prop) return;

        var token = prop.onChange(render);

        unwatch.push(function () {
          prop.onChange(token);
        });
      });

      render();
      worldScreen.busy(true);
      set({ busy: true });

      return controls;
    },

    showTools: function (buttons) {
      worldScreen.showButtons(buttons);
      worldScreen.busy(true);
      set({ busy: true });
    },
  };

  var gameScreen = {
    worldScreen: function () {
      return worldScreen;
    },

    showActionControls: function () {
      return worldScreen.showControls();
    },

    showToolControls: function (buttons) {
      return worldScreen.showTools(buttons);
    },

    //back to the world from whatever was up - a screen, a word asked for
    showWorld: function () {
      set({ prompt: null });
      go.world();
      worldScreen.show();
    },

    /**
     * Asks the player for a word - a new city's name.
     */
    showPrompt: function (message, callback, placeholder, onDiscard) {
      set({
        prompt: {
          message: message,
          placeholder: placeholder,
          submit: callback,
          discard: onDiscard || function () {},
        },
      });
    },
  };

  return {
    gameScreen: function () {
      return gameScreen;
    },
  };
}

/**
 * The buttons of an action: leaving it at one end, confirming it at the
 * other, and between them its toggles of its own - or turning round and the
 * dice.
 */
function actionButtons(controls) {
  var tools = controls.tools ? controls.tools() : null,
    buttons = [];

  buttons[0] = {
    icon: "close",
    label: "Cancel",
    action: function () {
      controls.discard();
    },
  };

  //one that cannot be confirmed as it stands has its tick all the same,
  //not to be pressed, so that the bar stays as it is
  buttons[4] = {
    icon: "check",
    label: "Done",
    go: true,
    disabled: !controls.canSubmit(),
    action: function () {
      controls.submit();
    },
  };

  if (tools) {
    tools.forEach(function (tool, i) {
      buttons[i + 1] = tool;
    });

    return buttons;
  }

  if (controls.canRotate())
    buttons[1] = {
      icon: "rotate",
      label: "Turn",
      action: function () {
        controls.rotate();
      },
    };

  //and another of the same, picked at random, on the same selection
  if (controls.canShuffle && controls.canShuffle())
    buttons[3] = {
      icon: "dice",
      label: "Another",
      action: function () {
        controls.shuffle();
      },
    };

  return buttons;
}

/**
 * The city builder's buttons when nothing else is going on: the one it
 * starts on - to found a city where there is none - and the building tools
 * once there is: the city screen, the catalogue, a road and shaping the
 * ground. A road is picked - what it is laid in, which ways it goes
 * - as it is laid (isometrica client/buildman build). Starting afresh, which
 * leaves the city, is in the menu (world/Hud).
 */
function idle(go, name) {
  var client = go.client();

  if (name !== "build" && !client.core.cities.getCity(0))
    return [
      {
        icon: "found",
        label: "Found a city",
        go: true,
        action: function () {
          client.cityman.establish();
        },
      },
    ];

  return [
    { icon: "city", label: "City", action: go.city },
    { icon: "build", label: "Build", action: go.catalogue },
    {
      icon: "asphalt",
      label: "Road",
      action: function () {
        go.build(BuildingCode.road);
      },
    },
    {
      icon: "clear",
      label: "Terrain",
      action: function () {
        go.world();
        client.terrainman.enter();
      },
    },
  ];
}
