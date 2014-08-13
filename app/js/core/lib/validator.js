define(function () {
    var validator = {};

    /**
     *
     * @param {mixed} value to validate
     * @param {int} (optional) min value or equal to
     * @param {int} (optional) max value or equal to
     */
    validator.isInt = function (val, min, max) {
        return !isNaN(val) && parseFloat(val) == parseInt(val) && (min === undefined || val >= min) && (max === undefined || val <= max);
    }

    validator.isNumber = function(value, min, max){
        return (typeof value === "number") && (min === undefined || value >= min) && (max === undefined || value <= max);
    }

    validator.clamp = function(value, min, max){
        if(value < min)
            return min;
        else if(value > max)
            return max;
        else return value;
    }

    return validator;
});