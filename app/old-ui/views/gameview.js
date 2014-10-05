/**
 * Created by denis on 9/19/14.
 */
define(function (require) {
    var Backbone = require("backbone");
    var ViewportView = require("./viewportview");
    var Templates = require("../templates");
    var template = Templates["gameview"];

    var View = Backbone.View.extend({
        initialize: function(options) {
            this.template = Templates["gameview"];
            this.setElement(template());

            this.ui = options.ui;

            //render viewport canvas
            var vpView = new ViewportView({
                ui: this.ui
            });

            this.$el.append(vpView.el);
            this.vpView = vpView;
        }
    });

    return View;
});