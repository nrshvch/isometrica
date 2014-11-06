define(function(require){
   var Backbone = require("backbone");
    var template = require("hbs!../../templates/categories");

    return Backbone.View.extend({
        events: {
           "click a[data-category]":function(e){
                var category = $(e.currentTarget).attr("data-category");
               this.catalogue.execute(category);
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
});