var Enumeration = {};

Enumeration.parse = function (enumerator, value) {
    if (typeof value === "number" || !isNaN(parseInt(value, 10))) {
        for (var key in enumerator) {
            if (enumerator[key] === value) return key;
        }
    }

    return null;
};

export default Enumeration;
