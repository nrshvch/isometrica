define(function(require){
   var Engine = require("engine/main");

    function City(){}

    City.prototype = Object.create(Engine.Component.prototype);

    City.prototype.city = null;

    return City;
});