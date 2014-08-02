/**
 * Created by User on 28.07.2014.
 */
define(function(require){
    var Client = namespace("Isometrica.Client");
    Client.Config = {
        tileSize: 45.255,
        tileZStep: 9.238,
        //chunkSize: (window.matchMedia("handheld").matches ? 8 : 24)
        chunkSize: (window.matchMedia("(max-width: 800px)").matches ? 8 : 24),
        //chunkSize: 1
    };

    return Client.Config;
});
