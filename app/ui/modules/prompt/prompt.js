define(function(require){
    var View = require("./view");

   function Module(){

   }

    Module.prototype.open = function(message, placeholder, callback){
        return new View({
            message: message,
            placeholder: placeholder,
            callback: callback
        }).render();
    }

    return Module;
});