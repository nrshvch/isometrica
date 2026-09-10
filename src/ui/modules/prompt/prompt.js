import View from "./view";

function Module(){

}

Module.prototype.open = function(message, placeholder, callback, onDiscard){
    return new View({
        message: message,
        placeholder: placeholder,
        callback: callback,
        onDiscard: onDiscard
    }).render();
}

export default Module;
