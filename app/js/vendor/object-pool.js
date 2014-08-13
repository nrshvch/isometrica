(function(){
    /**
     * @constructor
     */
    function ObjectPool(ctr){
        this.objs = [];
        this.ctr = ctr;
    }

    function onDispose(obj, args, pool){
        pool.returnObject(obj);
    }

    ObjectPool.borrowObject = function(pool){
        var obj;

        if (pool.objs.length > 0) {
            obj = pool.objs.pop();
        }else {
            obj = new pool.ctr();
            Events.on(obj, "dispose", onDispose, pool);
        }

        return obj;
    };

    ObjectPool.returnObject = function(pool, obj){
        return pool.objs.push(obj);
    };

    ObjectPool.prototype.borrowObject = function(){
        return ObjectPool.borrowObject(this);
    };

    ObjectPool.prototype.returnObject = function(obj){
        return ObjectPool.returnObject(this, obj);
    };

    this.ObjectPool = ObjectPool;
}).call(this);
