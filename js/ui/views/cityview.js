define(function (require) {
    var Backbone = require("backbone"),
        templateText = require("text!templates/cityviewtemplate.html"),
        template = $.parseHTML(templateText),
        Resources = require("lib/resources"),
        ResourcesBarView = require("ui/views/resourcesbarview"),
        ResponseCode = require("lib/responsecode"),
        BuildingCountView = require("ui/views/buildingcountlistview");

    var resourcesBuffer1 = Resources.create();

    var CityView = Backbone.View.extend({
        events: {
            "click .renameButton": function () {
                vkaria.city.rename();
            },
            "click .locateButton": function () {
                vkaria.city.locate()
                this.mainView.window.remove();
            }
        },
        initialize: function (options) {
            this.mainView = options.mainView;
            this.resourcesBar = new ResourcesBarView();
            this.produce = new ResourcesBarView();
            this.demand = new ResourcesBarView();
            this.income = new ResourcesBarView();
            this.maintenance = new ResourcesBarView();
            this.buildings = new BuildingCountView();

            this.buildings.setData(vkaria.city.getBuildingCountList());

            var self = this;
            vkaria.logicInterface.addEventListener(ResponseCode.cityUpdate, function (sender, data) {
                self.resourcesBar.setResources(data.resources);
                self.produce.setResources(data.resourceProduce);
                self.demand.setResources(data.resourceDemand);
                Resources.sub(resourcesBuffer1, data.resourceProduce, data.resourceDemand);
                Resources.sub(resourcesBuffer1, resourcesBuffer1, data.maintenanceCost);
                self.income.setResources(resourcesBuffer1);
                self.maintenance.setResources(data.maintenanceCost);
                self.name = data.name;
                $(".name .value", self.$el).text(data.name);
            });

            this.render();
        },
        render: function () {
            this.setElement($(template).clone());
            $(".resources .value", this.$el).append(this.resourcesBar.$el);
            $(".produce .value", this.$el).append(this.produce.$el);
            $(".demand .value", this.$el).append(this.demand.$el);
            $(".income .value", this.$el).append(this.income.$el);
            $(".maintenance .value", this.$el).append(this.maintenance.$el);
            $(".buildings .value", this.$el).append(this.buildings.$el);
        }
    });

    return CityView;
});