define(function (require) {
    var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["city/map"];

    return Backbone.View.extend({
        initialize: function (options) {
            this.setElement(template());
        },
        render: function () {

        },
    });
});