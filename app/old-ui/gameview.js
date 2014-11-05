//TODO separate topBar, buttonBar and gameView into separate View classes.
define(function (require) {
    var Backbone = require("backbone");

    var template = require("text!templates/gameview.html"),
        WindowView = require("./windowview"),
        ResourcesBarView = require("./views/resourcesbarview"),
        CategoriesView = require("./buildingclasslistview"),
        MessageView = require("./messageview"),
        CityView = require("./views/cityview"),
        PromptView = require("./views/promptview"),
        LabView = require("./views/labview"),
        ResourceCode = require("core/resourcecode"),
        Numeral = require("numeral");
    var Core = require("core");
    var Events = require("events");
    var ViewportView = require("./views/viewportview");


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
            "click a.button.button6": function (e) {
                this.openWindow(new LabView({mainView: this}), "Laboratory");
            },
            "click .buttonRotate": function (e) {
                this.tools.currentTool.rotate();
            },
            "click .buttonCancel": function (e) {
                this.tools.currentTool.cancel();
            },
            "click .buttonConfirm": function (e) {
                this.tools.currentTool.confirm();
            }
        },
        initialize: function (options) {
            this.ui = options.ui;

            this.setElement($.parseHTML(template));

            //render viewport canvas
            var vpView = new ViewportView({
                ui: this.ui
            });

            $("#mainCanvasContainer", this.el).append(vpView.el);
            this.vpView = vpView;

            this.tools = vkaria.tools;
            this.client = vkaria;
            this.resourcesBar = new ResourcesBarView();
            var mask = 0;
            mask |= 1 << ResourcesBarView.ResourceIndex[ResourceCode.money];
            mask |= 1 << ResourcesBarView.ResourceIndex[ResourceCode.food];
            mask |= 1 << ResourcesBarView.ResourceIndex[ResourceCode.water];
            mask |= 1 << ResourcesBarView.ResourceIndex[ResourceCode.electricity];
            this.resourcesBar.hideMask = ~mask;

            this.window = null;
            $(".resources", this.$el).append(this.resourcesBar.$el);
            this.render();
        },
        render: function () {



        },
        start: function () {
            var self = this;

            //TOOLS
            this.setupButtonState();
            vkaria.tools.addEventListener(vkaria.tools.events.toolEnabled, function (sender, args) {
                self.setupButtonState();
            });
            vkaria.tools.addEventListener(vkaria.tools.events.toolDisabled, function (sender, args) {
                self.setupButtonState();
            });
            /*
             Ok/Cancel tool buttons
             */
            $(".buttonConfirm, .buttonCancel, .buttonRotate", this.$el).hide();
            var tool = vkaria.tools.tools[ToolCode.builder];
            tool.addEventListener(tool.events.awaitingConfirmation, function (sender, args) {
                $(".buttonConfirm, .buttonCancel, .buttonRotate", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function (sender, args) {
                $(".buttonConfirm, .buttonCancel, .buttonRotate", self.$el).hide();
            });
            var tool = vkaria.tools.tools[ToolCode.tileSelector];
            tool.addEventListener(tool.events.awaitingConfirmation, function (sender, args) {
                $(".buttonConfirm, .buttonCancel", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function (sender, args) {
                $(".buttonConfirm, .buttonCancel", self.$el).hide();
            });
            var tool = vkaria.tools.tools[ToolCode.remover];
            tool.addEventListener(tool.events.awaitingConfirmation, function (sender, args) {
                $(".buttonConfirm, .buttonCancel", self.$el).show();
            });
            tool.addEventListener(tool.events.receivedConfirmation, function (sender, args) {
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

            var core = vkaria.core;

            Events.on(core.time, core.time.events.advance, function (sender, args, self) {
                if (window.matchMedia("(min-width: 800px)").matches) {
                    $("#date", self.$el).text(Numeral(args.day).format('0o') + " " + args.monthName + ", year " + args.year);
                } else {
                    $("#date", self.$el).text(args.day + " / " + args.month + " / " + args.year);
                }
            }, this);

            Events.on(core.cities, Core.CityService.events.cityNew, function (sender, city, self) {
                Events.on(city, Core.City.events.update, function (sender, data) {
                    self.resourcesBar.setResources(city.resourcesService.getResources());
                    $(".population .val", self.$el).text(city.populationService.getPopulation());
                    $(".population .cap", self.$el).text(city.populationService.getCapacity());
                });
            }, this);

            //we need to call it manually as DOM element doesnt detect itself if it was added to DOM tree.
            this.vpView.updateSize();
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
        setupButtonState: function () {
            if (vkaria.tools.disabledTools & (1 << ToolCode.builder))
                $(".button3, .button4", this.$el).attr("disabled", true);
            else
                $(".button3, .button4", this.$el).removeAttr("disabled");
        }
    });

    return GameView;
});
