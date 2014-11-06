define(function(require){
    var Backbone = require("backbone");
    var template = require("hbs!../../templates/buildings");


    return Backbone.View.extend({
        tagName: "span",
        events: {
          "click a[data-building]" : function(e){
              var building = $(e.currentTarget).attr("data-building");
              this.catalogue.execute(this.model.get("code"), building);
          }
        },
        initialize: function(options){
            this.catalogue = options.catalogue;
        },
        render: function(){
            var flat = this.model.toJSON();
            flat.buildings = this.model.buildings.toJSON();
            this.$el.append(template(flat));
            return this;
        }
    });
});