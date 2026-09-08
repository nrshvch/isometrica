import Backbone from "backbone";
import __templateSource from "../templates/splash.hbs?raw";
import Handlebars from "handlebars";

var template = Handlebars.compile(__templateSource);

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

export default View;
