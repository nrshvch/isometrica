/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 04.05.14
 * Time: 20:54
 * To change this template use File | Settings | File Templates.
 */
define(function(require){
    var Resources = require("../resources");
    var Events = require("events");
    var helpers = require("helpers");

    function ResourceOperations(city){
        this.city = city;
        this.resources = city.stats.resourcesTotal;
    }

    ResourceOperations.prototype.resources = null;

    ResourceOperations.prototype.addMoney = function(amount){
        if (helpers.isNumber(amount)) {
            this.resources[Resources.ResourceCode.money] += amount;

            Events.fire(this.city, this.city.events.update, this.city);

            return true;
        }
        return false;
    };

    ResourceOperations.prototype.subMoney = function(amount){
        if (helpers.isNumber(amount, 0, this.resources[Resources.ResourceCode.money])) {
            this.resources[Resources.ResourceCode.money] -= amount;

            Events.fire(this.city, this.city.events.update, this.city);

            return true;
        }
        return false;
    };

    ResourceOperations.prototype.add = function(resources){
        Resources.add(this.resources, this.resources, resources);
        Events.fire(this.city, this.city.events.update, this.city);
    };

    ResourceOperations.prototype.sub = function(resources){
        Resources.sub(this.resources, this.resources, resources);
        Events.fire(this.city, this.city.events.update, this.city);
    };

    ResourceOperations.prototype.buy = function(resourceCode, amount){
        var cost = this.city.world.resourceMarket.buyCost(resourceCode, amount);

        if (this.resources[Resources.ResourceCode.money] >= cost) {
            this.sub(cost);
            return true;
        } else
            return false;
    };

    ResourceOperations.prototype.sell = function (resourceCode, amount) {
        var cost = this.world.resourceMarket.sellCost(resourceCode, amount);

        this.add(cost);

        return true;
    };

    return ResourceOperations;
});
