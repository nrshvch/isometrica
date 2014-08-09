/**
 * Created by User on 04.08.2014.
 */
define(function(require){
    var Core = require("core");
    var Client = require("client");
    var UI = require("ui");

    var boot = {};

    boot.bootstrap = function(){
        console.log("boot");

        console.log("Init core")

        var core = new Core.CoreInterface();
        core.start();

        console.log("Core ready")

        console.log("Init client");
        var client = new Client.Vkaria(core, function(){
            console.log("Client ready");

            console.log("Init ui");
            var ui = new UI();
            ui.start();

            console.log("UI ready");

            console.log("boot done");
        });
    };

    return boot;
});