define(function(require){
    var namespace = require("namespace");
    var Client = namespace("Isometrica.Client");

    Client.ToolCode = {
        panner: 0,
        tileSelector: 1,
        remover: 2,
        builder: 3,
        bridgeBuilder: 4
    };

    return Client.ToolCode;
});