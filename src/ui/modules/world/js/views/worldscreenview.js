import Backbone from "backbone";
import __templateSource from "../../templates/worldscreen.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";
import BuildingCode from "data/buildingcode";

var template = Handlebars.compile(__templateSource);

var btns = {
    confirm: {
        icon: "tick-icon",
        action: function (view) {

        }
    },
    cancel: {
        icon: "cross-icon",
        action: function (view) {

        }
    },
    "return": {
        icon: "back-icon",
        action: function (view) {

        }
    },
    config: {
        icon: "gear-icon",
        action: function (view) {

        }
    },
    lab: {
        icon: "face-icon",
        action: function (view) {

        }
    },
    destroy: {
        icon: "bulldozer-icon",
        action: function (view) {

        }
    },
    build: {
        icon: "coin-icon",
        action: function (view) {
            view.showBuildButtons();
        }
    },
    "build-road": {
        icon: "clock-icon",
        action: function (view) {
            view.showMainButtons();
        }
    },
    pan: {
        icon: "clock-icon",
        action: function (view) {

        }
    }
};

function setBtn(self, index, icon, f) {
    var state = self._state;
    var btn = state[index] || (state[index] = {});
    btn.icon = icon;
    btn.action = f;
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
    return this.mainCanvas;//$("#mainCanvas", this.el);
};

WorldScreenView.prototype.render = function () {
    renderBtns(this);
    return this;
};

WorldScreenView.prototype.showInitialButtons = function () {
    var view = this;
    unsetBtns(this);
    setBtn(this, 2, "house-icon", function () {
        view.controller.client.cityman.establish();
    });

    renderBtns(this);
};

WorldScreenView.prototype.showBuildButtons = function () {
    var view = this;
    unsetBtns(this);
    setBtn(this, 1, "house-icon", function () {
        view.controller.ui.navigate("catalogue");
    });
    setBtn(this, 2, "road-icon", function () {
        view.controller.ui.navigate("build", [BuildingCode.road]);
    });
    setBtn(this, 3, "bulldozer-icon", function () {
        view.controller.ui.navigate("destroy");
    });

    renderBtns(this);
};

WorldScreenView.prototype.showActionButtons = function (controls) {
    unsetBtns(this);

    setBtn(this, 2, "tick-icon", function () {
        controls.submit();
    });
    setBtn(this, 0, "back-icon", function () {
        controls.discard();
    });

    renderBtns(this);
};

WorldScreenView.prototype.hint = function (text) {
    $(".hint", this.$el).text(text);
};

export default WorldScreenView;
