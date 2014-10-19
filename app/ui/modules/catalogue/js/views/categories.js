define(function(require){
   var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["catalogue/categories"];

    return Backbone.View.extend({
        initialize: function(options){
            this.options = options || {};

            this.setElement(document.createDocumentFragment());
        },
        render: function(){
            var flat = this.collection.toJSON();
            this.$el.append(template(flat));
            return this;
        }
    });
});