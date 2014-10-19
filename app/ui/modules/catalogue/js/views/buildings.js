define(function(require){
    var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["catalogue/buildings"];

    return Backbone.View.extend({
        initialize: function(options){
            this.options = options || {};
            this.setElement(document.createDocumentFragment());
        },
        render: function(){
            var flat = this.model.toJSON();
            flat.buildings = this.model.buildings.toJSON();
            this.$el.append(template(flat));
            return this;
        }
    });
});