/**
 * Created by denis on 9/17/14.
 */
define(function (require) {
    var Backbone = require("backbone");

    var ViewportView = Backbone.View.extend({
        tagName: "canvas",
        id: "mainCanvas",
        initialize: function (options) {
            var ui = options.ui;

            var viewport = this.viewport = ui.root.game.graphics.createViewport(this.el);
            viewport.setCamera(ui.root.camera);
        },
        updateSize: function(){
            this.viewport.setSize(this.el.offsetWidth, this.el.offsetHeight);
        }
    });

    return ViewportView;
});