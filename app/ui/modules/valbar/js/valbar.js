define(function (require) {
    var Items = require("./collections/items");
    var View = require("./views/view");

    function Valbar() {
        this._items = new Items();
    }

    Valbar.prototype._view = null;

    Valbar.prototype.items = function () {
        return this._items;
    };

    Valbar.prototype.view = function () {
        return this._view || (this._view = new View({
            collection: this._items
        }));
    };

    return Valbar;
});