import Backbone from "backbone";
import __templateSource from "../../templates/buildings.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);


export default Backbone.View.extend({
    tagName: "span",
    events: {
      "click .item[data-build]" : function(e){
          var code = $(e.currentTarget).attr("data-build");
          this.catalogue.ui.navigate("build", [code]);
      },
      "click .button.back": function(){
          this.catalogue.ui.navigate("world");
      }
    },
    initialize: function(options){
        this.catalogue = options.catalogue;
        this.collection = options.collection;
    },
    render: function(){
        this.$el.append(template({
            buildings: this.collection.toJSON()
        }));
        return this;
    }
});
