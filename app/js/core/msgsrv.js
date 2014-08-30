/**
 * Created by denis on 8/30/14.
 */
define(function (require) {
    var Events = require("events");
    var Namespace = require("namespace");

    var Core = Namespace("Isometrica.Core");

    Core.MessagingService = MessagingService;

    var MessageType = Core.MessageType = {
        regular: 0,
        warning: 1,
        error: 2,
        tileRegular: 3,
        tileWarning: 4,
        tileError: 5
    };

    var events = {
        message: 0,
        tileMessage: 1
    };

    function MessagingService(root) {

    }

    MessagingService.events = events;

    MessagingService.prototype.sendMessage = function(type, text){
        Events.fire(this, events.message, {
            type: type,
            text: text
        });
    };

    MessagingService.prototype.sendTileMessage = function(tile, type, text){
        Events.fire(this, events.tileMessage, {
            tile: tile,
            type: type,
            text: text
        });
    };

    return MessagingService;
});