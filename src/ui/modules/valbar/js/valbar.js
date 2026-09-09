import Items from "./collections/items";
import View from "./views/view";

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

export default Valbar;
