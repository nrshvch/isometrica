define(function(require) {
    require("config");
    requirejs(["ui/js/main"], function(UI){
        var ui = new UI();
        ui.init();
    });
});