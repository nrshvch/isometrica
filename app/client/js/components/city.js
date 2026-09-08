import Engine from "engine/main";

function City(){}

City.prototype = Object.create(Engine.Component.prototype);

City.prototype.city = null;

export default City;
