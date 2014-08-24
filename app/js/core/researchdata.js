define(function (require) {
    var BuildingData = require("./buildingdata"),
        ResearchDirection = require("./researchdirection");

    var data = {};

    for(var code in BuildingData){
        var b = BuildingData[code];
        var dir = b.researchDirection || ResearchDirection.municipal;
        var lvl = b.researchLevel || 0;

        var a = data[dir] || (data[dir] = {
            levelItems: []
        });

        var b = a.levelItems[lvl] || (a.levelItems[lvl] = []);

        b.push(parseInt(code,10));
    }

    return data;

    return data;
});
