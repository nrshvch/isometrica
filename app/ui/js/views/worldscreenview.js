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
        var state = self.state;
        var btn = state[index] || (state[index] = {});
        btn.icon = icon;
        btn.action = f;
    }

    function unsetBtn(self, index){
        delete self.state[index];
    }

    function renderBtns(self){
        var $btns = $(".btn", self.$el);

        //reset
        $btns.removeClass().addClass("btn").off("click");

        var state = self.state;
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

            this.state = {};
            this.history = [];

            this.showMainButtons();
        },
        getCanvas: function () {
            return $("#mainCanvas", this.el);
        },
        save: function(){
            var copy = $.extend(true, {}, this.state);
            this.history.push(copy);
        },
        back: function(){
            if(this.history.length > 1) {
                this.history.pop();
                this.state = this.history[this.history.length - 1];
                renderBtns(this);
            }
        },
        showMainButtons: function(){
            var view = this;
            setBtn(this, 0, "back-icon", function(){
               view.back();
            });
            setBtn(this, 1, "citizen-icon", function(){
                view.showBuildButtons();
            });
            unsetBtn(this, 2);
            unsetBtn(this, 3);
            unsetBtn(this, 4);

            this.save();

           renderBtns(this);
        },
        showBuildButtons: function(){
            var view = this;

            setBtn(this, 1, "clock-icon", function(){
                view.showActionBtns();
            });
            unsetBtn(this, 2);
            unsetBtn(this, 3);
            unsetBtn(this, 4);

            this.save();

            renderBtns(this);
        },
        showActionBtns: function(){
            var view = this;
            setBtn(this, 0, "back-icon", function(){
                view.back();
            });
            unsetBtn(this, 1);
            unsetBtn(this, 2);
            setBtn(this, 3, "tick-icon", function(){
                view.showMainButtons();
            });
            setBtn(this, 4, "cross-icon", function(){
                view.showBuildButtons();
            });
            renderBtns(this);
            this.save();
        }
    });

    return WorldScreenView;
});
