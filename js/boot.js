/**
 * Created by User on 04.08.2014.
 */
define(function(require){
    var Core = require("core");
    var Client = require("client");
    var UI = require("ui");

    var boot = {};

    boot.bootstrap = function(){
        var core = new Core.CoreInterface();
        core.start();

        var client = new Client.Vkaria(core, function(){
            var ui = new UI();
            ui.start();
        });
    };

    return boot;
});