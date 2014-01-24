define(["../Component"], function (Component) {
    function Sprite(sprite) {
        Component.call(this);

        this.events = {
            ready: 0
        }

        this.enabled = false;
    }

    var p = Sprite.prototype = Object.create(Component.prototype);

    p.constructor = Sprite;

    p.sprite = null;

    p.pivotX = 0;
    p.pivotY = 0;

    p.layer = 0;

    p.setGameObject = function(gameObject){
        Component.prototype.setGameObject.call(this, gameObject);
        gameObject.spriteRenderer = this;
    };

    p.setSprite = function(sprite){
        this.sprite = sprite;
        this.enabled = true;

        return this;
    };

    p.setPivot = function(x, y){
        this.pivotX = x;
        this.pivotY = y;
        return this;
    };

    p.unsetGameObject = function(){
        this.gameObject.spriteRenderer = undefined;
        Component.prototype.unsetGameObject.call(this);
    };

    return Sprite;
});