define(function(require){
    var Backbone = require("backbone");
    var template = require("hbs!../templates/splash");

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
