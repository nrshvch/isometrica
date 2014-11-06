define(function (require) {
    var Backbone = require("backbone");
    var template = require("hbs!../../templates/map");



    return Backbone.View.extend({
        initialize: function (options) {
            this.setElement(template());
        },
        render: function () {

        },
    });
});