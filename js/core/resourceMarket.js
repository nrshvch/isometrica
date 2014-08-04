define(function(require){
    var Resources = require("core/resources");

    function Market(city){
        this.city = city;

        this.resourceBuyPrices = Resources.create();
        this.resourceSellPrices = Resources.create();
    }

    Market.prototype.buyCost = function(resourceCode, amount){
        return this.buyPrices[resourceCode] * amount;
    };

    Market.prototype.sellCost = function(resourceCode, amount){
        return this.sellPrices[resourceCode] * amount;
    };

    return Market;
});
