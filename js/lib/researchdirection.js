define(function (require) {
    var Enumerator = require("lib/enumerator");

    return Enumerator.create({
        municipal: 0,
        housing: 1,
        commerce: 2,
        industry: 3
    });
});