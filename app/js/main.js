define(function(require) {
    require("config");
    requirejs(["ui/uimgr"], function(UI){
        var ui = new UI();
    });
});