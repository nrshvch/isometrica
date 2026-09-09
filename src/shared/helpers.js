var helpers = {};

/**
 * Is number
 * @param n
 * @returns {boolean}
 */
helpers.isNumber = function (n) {
    return typeof n === "number" || (!isNaN(parseFloat(n)) && isFinite(n));
};

/**
 *
 * @param {mixed} value to validate
 * @param {int} [min] min value or equal to
 * @param {int} [max] max value or equal to
 */
helpers.isInt = function (val, min, max) {
    return !isNaN(val) && parseFloat(val) == parseInt(val) && (min === undefined || val >= min) && (max === undefined || val <= max);
};

helpers.clamp = function (value, min, max) {
    if (value < min)
        return min;
    else if (value > max)
        return max;
    else return value;
};

export default helpers;
