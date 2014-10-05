/**
 * Created by denis on 9/17/14.
 */
define(function (require) {
    var Backbone = require("backbone");
    var Events = require("events");

    function onUIReady(ui, bool, self){
        self.viewport.setSize(self.el.offsetWidth, self.el.offsetHeight);
    }

    var ViewportView = Backbone.View.extend({
        tagName: "canvas",
        id: "mainCanvas",
        initialize: function (options) {
            var ui = options.ui;

            var viewport = this.viewport = ui.root.game.graphics.createViewport(this.el);
            viewport.setCamera(ui.root.camera);

            Events.on(ui, ui.constructor.events.ready, onUIReady, this);
        }
    });

    return ViewportView;
});