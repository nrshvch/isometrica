/**
 * Created by denis on 10/6/14.
 */
define(function (require) {
    var Backbone = require("backbone");
    var template = require("hbs!../../templates/building");

    var View = Backbone.View.extend({
        initialize: function (options) {
            var fragment = document.createDocumentFragment();
            this.setElement(fragment);
        },
        render: function () {
            this.$el.append(template({
                building: this.model.toJSON()
            }));
            return this;
        }
    });

    return View;
});
