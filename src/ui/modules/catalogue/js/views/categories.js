import Backbone from "backbone";
import __templateSource from "../../templates/categories.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);

export default Backbone.View.extend({
    events: {
       "click a[data-category]":function(e){
            var category = $(e.currentTarget).attr("data-category");
           this.catalogue.execute(category);
        },
       "click .button.back": function(){
           this.catalogue.ui.navigate("world");
       }
    },
    tagName: "span",
    initialize: function(options){
        this.options = options || {};
        this.catalogue = options.catalogue;
    },
    render: function(){
        var flat = this.collection.toJSON();
        this.$el.append(template(flat));
        return this;
    }
});
