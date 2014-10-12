/**
 * Created by denis on 8/27/14.
 */
define(function(require){
    var Resources = require("../resources");
    var Resource = require("../resourcecode");

    function price(resource){
        return 10;
    }

    function MarketService(world){

    }

    MarketService.prototype.init = function(){

    };

    MarketService.prototype.buy = function(resources, resource, amount){
        var cost = amount * price(resource);
        var money = resources[Resource.money];
        if(money !== undefined && money >= cost){
            Resources.subOne(resources, resources, Resources.money, cost);
            Resources.addOne(resources, resources, resource, amount);
        }else{
            return false;
        }

        return true;
    };

    MarketService.prototype.sell = function(resources, resource, amount){
        var cost = amount * price(resource);
        var resourceAmount = resources[resource];
        if(resourceAmount !== undefined && resourceAmount >= amount){
            Resources.subOne(resources, resources, resource, amount);
            Resources.addOne(resources, resources, Resources.money, cost);
        }else{
            return false;
        }

        return true;
    };

    return MarketService;
});