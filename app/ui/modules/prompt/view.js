define(function (require) {
    var Backbone = require("backbone");
    var template = require("hbs!./templates/prompt");

    return Backbone.View.extend({
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
});