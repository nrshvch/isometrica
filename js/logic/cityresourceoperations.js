/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 04.05.14
 * Time: 20:54
 * To change this template use File | Settings | File Templates.
 */
define(function(require){
    var Resources = require("lib/resources");
    var EventManager = require("lib/eventmanager");

    function ResourceOperations(city){
        EventManager.call(this);
        this.city = city;
        this.resources = city.stats.resourcesTotal;
    }

    ResourceOperations.prototype = Object.create(EventManager.prototype);

    ResourceOperations.prototype.events = {
        update: 0
    };

    ResourceOperations.prototype.resources = null;

    ResourceOperations.prototype.addMoney = function(amount){
        if (helpers.isNumber(amount)) {
            this.resources[Resources.ResourceCode.money] += amount;
            this.dispatchEvent(this.events.update, this);
            return true;
        }
        return false;
    };

    ResourceOperations.prototype.subMoney = function(amount){
        if (helpers.isNumber(amount, 0, this.resources[Resources.ResourceCode.money])) {
            this.resources[Resources.ResourceCode.money] -= amount;
            this.dispatchEvent(this.events.update, this);
            return true;
        }
        return false;
    };

    ResourceOperations.prototype.add = function(resources){
        Resources.add(this.resources, this.resources, resources);
        this.dispatchEvent(this.events.update, this);
    };

    ResourceOperations.prototype.sub = function(resources){
        Resources.sub(this.resources, this.resources, resources);
        this.dispatchEvent(this.events.update, this);
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
