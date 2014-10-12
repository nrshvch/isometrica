define(function (require) {
    var Backbone = require("backbone");
    var templates = require("../templates");
    var template = templates["worldscreen"];
    var $ = require("jquery");

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

    function setBtn(self, index, icon, f){
        var state = self._state;
        var btn = state[index] || (state[index] = {});
        btn.icon = icon;
        btn.action = f;
    }

    function unsetBtn(self, index){
        delete self._state[index];
    }

    function unsetBtns(self){
        unsetBtn(self, 0);
        unsetBtn(self, 1);
        unsetBtn(self, 2);
        unsetBtn(self, 3);
        unsetBtn(self, 4);
    }

    function renderBtns(self){
        var $btns = $(".btn", self.$el);

        //reset
        $btns.removeClass().addClass("btn").off("click");

        var state = self._state;
        for(var key in state){
            var btn = state[key];
            if(btn !== undefined){
                var $btn = $btns.eq(parseInt(key,10));
                $btn.addClass(btn.icon);
                $btn.on("click", btn.action);
            }
        }
    }

    var WorldScreenView = Backbone.View.extend({
        initialize: function (options) {
            this.controller = options.controller;
            this.setElement(template());

            this._state = {};
        },
        getCanvas: function () {
            return $("#mainCanvas", this.el);
        },
        showMainButtons: function(){
            var view = this;
            unsetBtns(this);
            setBtn(this, 0, "back-icon", function(){
               view.controller.ui.back();
            });
            setBtn(this, 1, "bulldozer-icon", function(){
                view.controller.ui.navigate("game/world/build");
            });

           renderBtns(this);
        },
        showBuildButtons: function(){
            var view = this;
            unsetBtns(this);
            setBtn(this, 0, "back-icon", function(){
                view.controller.ui.back();
            });
            setBtn(this, 1, "face-icon", function(){
                view.controller.ui.navigate("game/buildings");
            });
            setBtn(this, 2, "coin-icon", function(){
               view.controller.ui.navigate("game/build/road");
            });

            renderBtns(this);
        },
        showActionBtns: function(){
            unsetBtns(this);

            var view = this;
            setBtn(this, 0, "back-icon", function(){
                view.back();
            });
            setBtn(this, 3, "tick-icon", function(){
                view.showMainButtons();
            });
            setBtn(this, 4, "cross-icon", function(){
                view.showBuildButtons();
            });
            renderBtns(this);
        }
    });

    return WorldScreenView;
});
