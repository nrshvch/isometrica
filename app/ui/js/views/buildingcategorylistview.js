define(function(require){
   var Backbone = require("backbone");
    var templates = require("../templates");
    var template = templates["buildingcategorylist"];
    var ItemView = require("./buildingcategorylistitemview");

    return Backbone.View.extend({
        initialize: function(options){
            this.options = options || {};

            var ui = this.options.ui;
            //ui.router.on("route")

            this.setElement(template());

            this.render();
        },
        render: function(){
            var item = new ItemView({
                ui: this.options.ui
            });
            $(".items", this.$el).append(item.el);
            return this;
        }
    });
});