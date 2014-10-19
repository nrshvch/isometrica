define(function(require){
    var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["splash/splash"];
    var View = Backbone.View.extend({
        initialize: function(options){
            this.options = options || {};
            this.setElement(document.createDocumentFragment());
        },
        render: function(){
            this.$el.append(template());
            return this;
        }
    });

    return View;
});
