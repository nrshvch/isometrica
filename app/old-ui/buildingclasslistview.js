define(function (require) {
    var Core = require("core");
    var itemTemplate = require("text!templates/buildingclasslistitem.html"),
        BuildingsListView = require("./buildingslistview"),
        BuildingData = Core.BuildingData,
        BuildingClassData = require("core/buildingclassdata");
    var Events = require("events");

    var BuildingClassListView = Backbone.View.extend({
        events: {
            "click .buildingClassListItem": function (e) {
                var code = parseInt(e.currentTarget.getAttribute("buildingClass"));
                var v = new BuildingsListView({
                    buildingClassCode: code,
                    mainView: this.mainView
                });
                this.mainView.openWindow(v, "Building catalogue");
            }
        },
        initialize: function (options) {
            this.mainView = options.mainView;

            this.setupClasses();

            //when some new building is invented, we need to update classes
            var self = this;
            this.onBuildingInvented = function (args) {
                self.setupClasses();
            };
            //vkaria.core.addEventListener(ResponseCode.buildingInvented, this.onBuildingInvented);

            this.render();
        },
        remove: function () {
            //vkaria.core.removeEventListener(ResponseCode.buildingInvented, this.onBuildingInvented);
            Backbone.View.prototype.remove.call(this);
        },
        render: function () {
            this.$el.css({
                height: "100%"
            });

        },
        setupClasses: function () {
            this.$el.empty();

            var item,
                self = this,
                availableCategs = {};

            var arrayOfCodes = vkaria.core.world.city.lab.getAvailableBuildings();
                //make map of visible categs
                for (var i in arrayOfCodes) {

                    var bcode = arrayOfCodes[i];
                    var classCode = BuildingData[bcode].classCode;
                    if (!availableCategs[classCode])
                        availableCategs[classCode] = 1;
                    else
                        availableCategs[classCode]++
                }

                //show classes only from visible list
                for (classCode in availableCategs) {
                    var count = availableCategs[classCode];

                    if (!BuildingClassData[classCode].hidden) {
                        item = $.parseHTML(itemTemplate);
                        $(item).attr("buildingClass", classCode);
                        $(".name", item).text(BuildingClassData[classCode].name + " (" + count + ")");
                        self.$el.append(item);
                    }
                }
        }
    });

    return BuildingClassListView
});
