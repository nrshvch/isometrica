/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 28.04.14
 * Time: 20:23
 * To change this template use File | Settings | File Templates.
 */
define(function () {

    var global = window;

    var helpers = global.helpers = {
        isNumber: function (n) {
            return typeof n === "number" || (!isNaN(parseFloat(n)) && isFinite(n));
        }
    };

    return helpers;
});