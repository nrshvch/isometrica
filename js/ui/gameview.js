//TODO separate topBar, buttonBar and gameView into separate View classes.
define(function (require) {
    var Backbone = require("backbone");

    var template = require("text!templates/gameview.html"),
        WindowView = require("ui/windowview"),
        ResourcesBarView = require("ui/views/resourcesbarview"),
        CategoriesView = require("ui/buildingclasslistview"),
        MessageView = require("ui/messageview"),
        CityView = require("ui/views/cityview"),
        PromptView = require("ui/views/promptview"),
        LabView = require("ui/views/labview"),
        BuildingData = require("lib/buildingdata"),
        ResponseCode = require("lib/responsecode"),
        ResourceCode = require("lib/resourcecode"),
        ToolCode = require("lib/toolcode"),
        Numeral = require("numeral"),
        ResearchState = require("lib/researchstate");


    var GameView = Backbone.View.extend({
        events: {
            "click #topBar": function () {
                this.openWindow(new CityView({
                    mainView: this
                }));
            },
            "click a.button.button0": function () {
                this.tools.selectTool(5);
            },
            "click a.button.button1": function () {
                this.tools.selectTool(0);
            },
            "click a.button.button2": function () {
                this.tools.selectTool(2);
            },
            "click a.button.button3": function (e) {
                if (!$(e.currentTarget).attr("disabled"))
                    this.openWindow(new CategoriesView({mainView: this}), "Building catalogue");
            },
            "click a.button.button4": function (e) {
                if (!$(e.currentTarget).attr("disabled"))
                    this.tools.selectTool(ToolCode.builder).setBuilding(4).multiBuild(true);
            },
            "click a.button.button5": function (e) {
                if (!$(e.currentTarget).attr("disabled"))
                    this.tools.selectTool(ToolCode.bridgeBuilder).setBuilding(4).multiBuild(true);
            },
            "click a.button.button6": function (e) {
                this.openWindow(new LabView({mainView: this}), "Laboratory");
            },
            "click .buttonRotate": function(e){
                this.tools.currentTool.rotate();
            },
            "click .buttonCancel": function(e){
                this.tools.currentTool.cancel();
            },
            "click .buttonConfirm": function(e){
                this.tools.currentTool.confirm();
            }
        },
        initialize: function () {
            this.tools = vkaria.tools;

            this.resourcesBar = new ResourcesBarView();
            var mask = 0;
            mask |= 1 << ResourceCode.money;
            mask |= 1 << ResourceCode.food;
            mask |= 1 << ResourceCode.water;
            mask |= 1 << ResourceCode.electricity;
            this.resourcesBar.hideMask = ~mask;

            this.window = null;
            this.render();

            var self = this;

            this.onCityRename = function(sender, args){
                console.log("234");
                self.openWindow(new PromptView({
                    mainView: self,
                    message: "Please give city a name!",
                    placeholder: "City name",
                    value: "My City",
                    callback: function (value) {
                        sender.inputName(value);
                    }
                }), "Input");
            };
        },
        render: function () {
            this.setElement($.parseHTML(template));
            $(".resources", this.$el).append(this.resourcesBar.$el);
        },
        start: function () {
            var self = this;

            var viewport = vkaria.game.graphics.createViewport(document.getElementById("mainCanvas"));
            var camera = vkaria.game.logic.world.findByName("mainCamera");
            viewport.setCamera(camera).setSize(viewport.canvas.offsetWidth, viewport.canvas.offsetHeight);



            vkaria.city.addEventListener(vkaria.city.events.nameRequired, this.onCityRename);




            //TOOLS
            this.setupButtonState();
            vkaria.tools.addEventListener(vkaria.tools.events.toolEnabled, function(sender, args){
                self.setupButtonState();
            });
            vkaria.tools.addEventListener(vkaria.tools.events.toolDisabled, function(sender, args){
                self.setupButtonState();
            });
            /*
            Ok/Cancel tool buttons
             */
            $(".buttonConfirm, .buttonCancel, .buttonRotate", this.$el).hide();
            var tool = vkaria.tools.tools[ToolCode.builder];
            tool.addEventListener(tool.events.awaitingConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel, .buttonRotate", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel, .buttonRotate", self.$el).hide();
            });
            var tool = vkaria.tools.tools[ToolCode.tileSelector];
            tool.addEventListener(tool.events.awaitingConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel", self.$el).hide();
            });
            var tool = vkaria.tools.tools[ToolCode.remover];
            tool.addEventListener(tool.events.awaitingConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function(sender, args){
                $(".buttonConfirm, .buttonCancel", self.$el).hide();
            });
            /* end */

            var tool = vkaria.tools.tools[ToolCode.panner];

            tool.addEventListener(tool.events.clicked, function (sender, args) {
                var city = vkaria.game.logic.world.findByName('city');

                if (args.indexOf(city) !== -1)
                    self.openWindow(new CityView({
                        mainView: self
                    }));
            });






            vkaria.logicInterface.addEventListener(ResponseCode.timeAdvanced, function (sender, args) {
                if (window.matchMedia("(min-width: 800px)").matches) {
                    $("#date", self.$el).text(Numeral(args.day).format('0o') + " " + args.monthName + ", year " + args.year);
                } else {
                    $("#date", self.$el).text(args.day + " / " + args.month + " / " + args.year);
                }
            });

            vkaria.logicInterface.addEventListener(ResponseCode.cityUpdate, function (sender,data) {
                self.resourcesBar.setResources(data.resources);
            });







            vkaria.logicInterface.addEventListener(ResponseCode.errorMessage, function (sender, text) {
                self.displayMessage(text, true);
            });

            vkaria.logicInterface.addEventListener(ResponseCode.message, function (sender, args) {
                self.displayMessage(args.text);
            });




            this.openWindow(new MessageView({
                mainView: this,
                text: "Welcome! This is some (demo|prototype|whatever) city building game I made in a free time. \n Have fun building your small town! \n First you need to specify where your city will be located, and then you'll be able to put some buildings and roads!"
            }), "Welcome!");
        },
        openWindow: function (view, title) {
            if (this.window !== null)
                this.window.remove();

            this.window = new WindowView();
            this.$el.append(this.window.el);
            this.window.setView(view);
            this.window.setTitle(title);
            return this.window;
        },
        displayMessage: function (text, error) {
            var el = document.createElement("div");

            $(el).text(text);

            if (error)
                $(el).addClass("error");

            $("#messageStack", this.$el).append(el);
            setTimeout(function () {
                $(el).remove();
            }, 5000);
        },
        setupButtonState: function(){
            if (vkaria.tools.disabledTools & (1 << ToolCode.builder))
                $(".button3, .button4", this.$el).attr("disabled", true);
            else
                $(".button3, .button4", this.$el).removeAttr("disabled");
        }
    });

    return GameView;
});
