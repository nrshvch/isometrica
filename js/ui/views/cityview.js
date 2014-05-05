define(function (require) {
    var Backbone = require("backbone"),
        templateText = require("text!templates/cityviewtemplate.html"),
        template = $.parseHTML(templateText),
        Resources = require("lib/resources"),
        ResourcesBarView = require("ui/views/resourcesbarview"),
        ResponseCode = require("lib/responsecode"),
        BuildingCountView = require("ui/views/buildingcountlistview"),
        TileRatings = require("lib/tileratings");

    var resourcesBuffer1 = Resources.create();

    window.DrawMap = function DrawMap() {
        var cnv = $("#mapcnv").get(0);
        var data = vkaria.logicInterface.logic.world.ratingsman;
        var tiles = vkaria.logicInterface.logic.world.tiles.collection;
        var ctx = cnv.getContext("2d");
        var s = vkaria.logicInterface.logic.world.size;
        var p = cnv.width / s;

        var i = 0, blockSize = 64*64, tile, l = tiles.length;
        var F = function () {
            for (var j = 0; j < blockSize; j++) {
                tile = tiles[i];

                //draw terrain
                if (tile.resource != null) {
                    ctx.fillStyle = "rgb(0,0,0)";
                } else if (tile.terrainType == 0)
                    ctx.fillStyle = "rgb(0,90,170)";
                else {
                    ctx.fillStyle = "rgb(70," + (128 + tile.z * 16) + ",40)";
                }
                ctx.fillRect(tile.x * p, (s - tile.y) * p, p, p);


                //draw ecology
                //var r =
                //if(r){
                    var eco = data.getRating(tile.x, tile.y, TileRatings.TileRatingEnum.Ecology);
                    var k = (eco / 100 * 255)|0;
                    ctx.fillStyle = "rgba("+(255-k)+","+(k)+",0,1)";
                //}else{
                 //   ctx.fillStyle = "rgba(255,0,0,1)";
               // }

                ctx.fillRect(tile.x * p, (s-tile.y) * p , p,p);


                if (++i >= l)
                    break;
            }
            if (i < l - 1)
                setTimeout(F, 10);
        };
        F();
    };

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
                $(".population .value", self.$el).text(data.population);
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

            setTimeout(function () {
                DrawMap();
            }, 500);
        }
    });

    return CityView;
});