import Backbone from "backbone";
import __templateSource from "../../templates/buildings.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);


export default Backbone.View.extend({
    tagName: "span",
    events: {
      "click a[data-building]" : function(e){
          var building = $(e.currentTarget).attr("data-building");
          this.catalogue.execute(this.model.get("code"), building);
      },
      "click a[data-build]" : function(e){
          var code = $(e.currentTarget).attr("data-build");
          this.catalogue.ui.navigate("build", [code]);
      },
      "click .button.back": function(){
          this.catalogue.execute();
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
