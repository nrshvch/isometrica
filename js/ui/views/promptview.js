define(function (require) {
    var Backbone = require("backbone"),
        templateText = require("text!templates/promptview.html"),
        template = $.parseHTML(templateText);

    var PromptView = Backbone.View.extend({
        events: {
            "click button": function () {
                var val = $("input", this.$el).val();
                this.callback(val);
                this.mainView.window.remove();
            }
        },
        initialize: function (options) {
            this.mainView = options.mainView;
            this.msg = options.message;
            this.placeholder = options.placeholder;
            this.value = options.value;
            this.callback = options.callback;
            this.render();
        },
        render: function () {
            this.setElement($(template).clone());

            $(".msg", this.$el).text(this.msg);
            $("input", this.$el).attr("value", this.value);
            $("input", this.$el).attr("placeholder", this.placeholder);
        }
    });

    return PromptView;
});