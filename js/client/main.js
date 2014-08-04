define(function(require){
    var namespace = require("namespace");
    var Client = namespace("Isometrica.Client");

    var ToolCode = require("./tools/toolcode");
    Client.Vkaria = require("./vkaria");

    return Client;
});
