function Player(root) {
    this.root = root;
}

Player.prototype.city = function () {
    return this.root.core.cities.getCity(0);
};

Player.prototype.name = function(){
    return "unnamed";
};

export default Player;
