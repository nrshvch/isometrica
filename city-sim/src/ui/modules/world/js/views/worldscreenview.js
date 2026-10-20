import Backbone from "backbone";
import __templateSource from "../../templates/worldscreen.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);

//on for a toggle that is switched on - outlined
function setBtn(self, index, icon, f, on) {
  var state = self._state;
  var btn = state[index] || (state[index] = {});
  btn.icon = icon;
  btn.action = f;
  btn.on = on === true;
}

function unsetBtn(self, index) {
  delete self._state[index];
}

function unsetBtns(self) {
  unsetBtn(self, 0);
  unsetBtn(self, 1);
  unsetBtn(self, 2);
  unsetBtn(self, 3);
  unsetBtn(self, 4);
}

function renderBtns(self) {
  var $btns = $(".btn", self.$el);

  //reset
  $btns.removeClass().addClass("btn").off("click");

  var state = self._state;
  for (var key in state) {
    var btn = state[key];
    if (btn !== undefined) {
      var $btn = $btns.eq(parseInt(key, 10));
      $btn.addClass(btn.icon);
      $btn.toggleClass("on", btn.on);
      $btn.on("click", btn.action);
    }
  }
}

function WorldScreenView() {
  Backbone.View.apply(this, arguments);
}

WorldScreenView.prototype = Object.create(Backbone.View.prototype);

WorldScreenView.prototype.initialize = function (options) {
  this.controller = options.controller;

  this.mainCanvas = document.createElement("canvas");
  this.mainCanvas.id = "mainCanvas";

  this.setElement(template());
  $(".body", this.el).append(this.mainCanvas);

  this.render();

  this._state = {};
};

WorldScreenView.prototype.getCanvas = function () {
  return this.mainCanvas; //$("#mainCanvas", this.el);
};

WorldScreenView.prototype.render = function () {
  renderBtns(this);
  return this;
};

/**
 * Lays el over the world, under the buttons.
 */
WorldScreenView.prototype.addOverlay = function (el) {
  $(".body", this.el).append(el);
};

WorldScreenView.prototype.showActionButtons = function (controls) {
  var view = this;

  function render() {
    var tools = controls.tools ? controls.tools() : null;

    unsetBtns(view);

    //an action that is only ever left, never confirmed - picking which block
    //of land to buy, say - has nothing for a tick to do. With buttons of its
    //own, they go in between, and it to the far end
    if (controls.canSubmit()) {
      setBtn(view, tools ? 4 : 2, "tick-icon", function () {
        controls.submit();
      });
    }
    setBtn(view, 0, "cross-icon", function () {
      controls.discard();
    });

    if (tools) {
      tools.forEach(function (tool, i) {
        setBtn(view, i + 1, tool.icon, tool.action, tool.on);
      });

      renderBtns(view);
      return;
    }

    // canRotate may be set by the caller only after this view was
    // handed the controls, so keep the button in sync with it instead
    // of reading it once
    if (controls.canRotate()) {
      setBtn(view, 1, "rotation-icon", function () {
        controls.rotate();
      });
    }

    //and another of the same, picked at random, on the same selection
    if (controls.canShuffle && controls.canShuffle()) {
      setBtn(view, 3, "dice-icon", function () {
        controls.shuffle();
      });
    }

    renderBtns(view);
  }

  controls.canRotate.onChange(render, false, this);
  if (controls.canShuffle) controls.canShuffle.onChange(render, false, this);
  if (controls.tools) controls.tools.onChange(render, false, this);
  controls.canSubmit.onChange(render, false, this);
  render();
};

/**
 * Puts up the buttons of a mode that has more to do than confirm or cancel.
 *
 * @param buttons {Object[]} per slot, {icon, action} - a slot left undefined
 *                stays empty
 */
WorldScreenView.prototype.showToolButtons = function (buttons) {
  unsetBtns(this);

  for (var i = 0; i < buttons.length; i++) {
    if (buttons[i] !== undefined)
      setBtn(this, i, buttons[i].icon, buttons[i].action);
  }

  renderBtns(this);
};

WorldScreenView.prototype.hint = function (text) {
  $(".hint", this.$el).text(text);
};

export default WorldScreenView;
