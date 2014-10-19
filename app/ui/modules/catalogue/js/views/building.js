/**
 * Created by denis on 10/6/14.
 */
define(function (require) {
    var Backbone = require("backbone");
    var templates = require("ui/js/templates");
    var template = templates["catalogue/building"];

    var View = Backbone.View.extend({
        initialize: function (options) {
            var fragment = document.createDocumentFragment();
            this.setElement(fragment);
        },
        render: function () {
            this.$el.html(template({
                building: this.model.toJSON()
            }));
            return this;
        }
    });

    return View;
});
