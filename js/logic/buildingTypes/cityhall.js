define(function(require){

    var BuildingBase = require('../buildingbase');
    var BuildingCode = require('lib/buildingcode');

    function Building(){
        BuildingBase.call(this);
    }

    Building.typeCode = BuildingCode.cityHall;
    Building.size = 0x22;
    Building.price = 10;
    Building.income = 1;

    Building.prototype = Object.create(BuildingBase.prototype);
    Building.prototype.constructor = Building;

    return Building;
})
