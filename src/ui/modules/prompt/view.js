import Backbone from "backbone";
import __templateSource from "./templates/prompt.hbs?raw";
import Handlebars from "handlebars";
import $ from "jquery";

var template = Handlebars.compile(__templateSource);

export default Backbone.View.extend({
    events: {
        "click .button.submit": "submit",
        "click .button.discard": "discard"
    },
    initialize: function (options) {
        this.options = options || {};

    },
    render: function () {
        this.setElement(template({
            message: this.options.message,
            placeholder: this.options.placeholder
        }));
        return this;
    },
    value: function(){
        var v = $("input", this.$el).val();
        return v;
    },
    submit: function(){
        this.options.callback(this.value());
    },
    discard: function(){

    }
});
