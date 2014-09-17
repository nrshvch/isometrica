/**
 * Created by User on 04.08.2014.
 */
define(function(require){
    var Core = require("core");
    var Client = require("client");

    var boot = {};

    boot.bootstrap = function(){
        var core = new Core.Logic();
        core.start();

        var client = new Client.Vkaria(core);
    };

    return boot;
});