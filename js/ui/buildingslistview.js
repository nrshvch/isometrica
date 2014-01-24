define(function (require) {
    var itemTemplate = require("text!templates/buildingclasslistitem.html"),
        BuildingInfoView = require("ui/buildinginfoview"),
        BuildingClassCode = require("lib/buildingclasscode"),
        BuildingClassData = require("lib/buildingclassdata"),
        BuildingData = require("lib/buildingdata"),
        ResponseCode = require("lib/responsecode");

    var BuildingsListView = Backbone.View.extend({
        events: {
            "click .buildingClassListItem": function (e) {
                var code = parseInt(e.currentTarget.getAttribute("buildingCode"));
                var v = new BuildingInfoView({mainView: this.mainView});
                v.setBuilding(code);
                this.mainView.openWindow(v, BuildingData[code].name);
            }
        },
        initialize: function (options) {
            this.mainView = options.mainView;
            this.setBuildingClass(options.buildingClassCode);
            this.buildingClassCode = options.buildingClassCode;


            //when some new building is invented, reload list of buildings
            this.onBuildingInvented = function(sender, args){
                self.setBuildingClass(self.buildingClassCode);
            };

            var self = this;
            vkaria.logicInterface.addEventListener(ResponseCode.buildingInvented, this.onBuildingInvented);

            this.render();
        },
        remove: function(){
            vkaria.logicInterface.removeEventListener(ResponseCode.buildingInvented, this.onBuildingInvented);
            Backbone.View.prototype.remove.call(this);
        },
        render: function () {
            this.$el.css({
                height: "100%"
            });
        },
        setBuildingClass: function(buildingClassCode){
            var item, key, data;

            this.$el.empty();

            var self = this;

            vkaria.logicInterface.getAvailableBuildings(function(response){
                for(key in BuildingData){
                    data = BuildingData[key];

                    //skip if is not present in available building list
                    if(response.indexOf(data.buildingCode) === -1)
                        continue;

                    if(data.classCode == buildingClassCode){
                        item = $.parseHTML(itemTemplate);
                        $(item).attr("buildingCode", data.buildingCode);
                        $(".name", item).text(data.name || "-");
                        self.$el.append(item);
                    }
                }
            });
        }
    });

    return BuildingsListView;
});
