define(function (require) {
    var Backbone = require("backbone"),
        templateText = require("text!templates/buildingcountlistview.html"),
        template = $($.parseHTML(templateText)),
        itemTemplate = $(".item", template),
        BuildingClassData = require("core/buildingclassdata");

    template.empty(); //remove item template from view template

    var View = Backbone.View.extend({
        initialize:function(){
            this.render();
        },
        render: function(){
            this.setElement(template);
        },
        setData: function(data){
            this.itemsData = data;

            template.empty();

            for(var key in data){
                var itemCount = data[key];

                var itemNode = itemTemplate.clone();
                $(".key", itemNode).text(BuildingClassData[key].name);
                $(".value", itemNode).text(itemCount);

                this.$el.append(itemNode);
            }
        }
    });

    return View;
});