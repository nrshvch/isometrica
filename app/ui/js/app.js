define(function(require) {
    var Backbone = require("backbone");
    var Marionette = Backbone.Marionette;

    function MainApp(){
        Marionette.Application.apply(this, arguments);
    }

    MainApp.prototype = Object.create(Marionette.Application.prototype);

    return MainApp;
});