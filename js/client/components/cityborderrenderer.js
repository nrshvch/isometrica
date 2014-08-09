/**
 * Created by User on 07.08.2014.
 */
define(function (require) {
    var Engine = require("engine");
    var glMatrix = require("../vendor/gl-matrix");
    var Vec3 = glMatrix.vec3;
    var Core = require("core");
    var Config = require("../config");
    var Terrain = Core.Terrain;
    var Layers = require("../renderlayer");

    var float32Buffer = new Float32Array(3);

    function calcpoints(city){
        var tiles = city.getInfluenceArea();

        var edges = {};

        var yIndexUnit = Terrain.convertToIndex(0,1);
        var index,p0,p1,p2,p3;

        //process every tile and add perimeter edges;
        //if edges are overlaping and are of opposite direction,
        //then these edges are internal, and should be deleted;
        for(var key in tiles){
            index = parseInt(key,10);

            p0 = index; // x,y
            p1 = index + 1; // x+1,y
            p2 = index + yIndexUnit + 1; // x+1,y+1
            p3 = index + yIndexUnit; // x,y+1

            edges[p0] = edges[p0] || [];
            edges[p1] = edges[p1] || [];
            edges[p2] = edges[p2] || [];
            edges[p3] = edges[p3] || [];

            if(!edges[p1][p0])
                edges[p0][p1] = true;
            else
                edges[p1][p0] = false;

            if(!edges[p2][p1])
                edges[p1][p2] = true;
            else
                edges[p2][p1] = false;

            if(!edges[p3][p2])
                edges[p2][p3] = true;
            else
                edges[p3][p2] = false;

            if(!edges[p0][p3])
                edges[p3][p0] = true;
            else
                edges[p0][p3] = false;
        }


        //convert to 1d array
        var plain = [];
        var map = [];
        var from,to;
        for(var key in edges){
            from = parseInt(key, 10);
            var r = edges[from];

            //remove records of internal edges
            if(!(r[index+1] || r[index+yIndexUnit] || r[index-1] || r[index-yIndexUnit]))
                delete edges[key];

            for(var j in r){
                if (r[j]) {
                    to = parseInt(j,10);

                    var o = {
                        from: from,
                        to: to,
                        revised: false
                    };
                    map[from] = map[from] || [];
                    map[from][to] = o;
                    plain.push(o);
                }
            }
        }


        //make paths
        var paths = [];
        for(var i = 0; i < plain.length; i++){
            var head = plain[i];
            if(!head.revised){
                var arr = [];
                paths.push(arr);
                path(map,arr,head);
            }
        }

        //remove redundant points
        simplify(paths);

        return paths;
    }

    function path(map,arr,pair){
        var index = pair.from;

        pair.revised = true;

        var x = Terrain.extractX(index);
        var z = Terrain.extractY(index);
        var y = isometrica.core.world.terrain.getGridPointHeight(index);

        x *= Config.tileSize;
        z *= Config.tileSize;
        y *= Config.tileZStep;

        x -= Config.tileSize / 2;
        z -= Config.tileSize / 2;

        arr.push([x,y,z]);

        var next = null;
        if(map[pair.to] !== undefined){
            for(var dir in map[pair.to]){
                if(!map[pair.to][dir].revised){
                    next = map[pair.to][dir];
                    break;
                }
            }
        }

        if(next != null)
            path(map,arr,next);
    }

    function simplify(paths){
        var path, curr, prev, next,
            jl,il = paths.length,
            buf = [];

        for(var i = 0; i < il; i++){
            path = paths[i];
            jl = path.length;

            prev = next = undefined;
            for(var j = 0; j < jl; j++){
                curr = path[j];
                next = path[j+1];
                prev = path[j-1];

                if(next && prev){
                    Vec3.sub(buf,prev,next);

                    if((buf[0] === 0 && buf[1] === 0 && buf[2] !== 0) ||
                       (buf[0] !== 0 && buf[1] === 0 && buf[2] === 0) ||
                       (buf[0] === 0 && buf[1] !== 0 && buf[2] === 0)){
                        path.splice(j,1);
                        j--;
                        jl--;
                    }
                }
            }
        }
    }

    function onAreaChange(sender, args, meta){
        var self = meta;
        var city = isometrica.core.world.city;
        if(city)
            lerpBorder(self,calcpoints(city));
    }

    function lerp(r, from, to, c){
        var il = from.length;
        for(var i = 0; i < il; i++) {
            var jl = from[i].length;
            for (var j = 0; j < jl; j++) {
                Vec3.lerp(r[i][j], from[i][j], to[i][j], c);
                //r[i][j] = to[i][j];
            }
        }
    }

    function lerpBorder(self, to){
        self.points = to;
        return;

        //make copy of new border
        var from = JSON.parse(JSON.stringify(to));
        var old = self.points;

        //if no points, then lerp from city center
        if(old.length === 0){
           old.push([[self.city.x * Config.tileSize, 0,self.city.y * Config.tileSize]]);
        }

        //put all new border points on old border
        for(var ii = 0; ii < from.length; ii++) {
            var f = from[ii];

            for (var i = 0; i < f.length; i++) {
                var p = null;

                for(var jj = 0; jj < old.length; jj++) {
                    var o = old[jj];
                    for (var j = 0; j < o.length; j++) {
                        if (p === null || Vec3.distance(o[j], f[i]) < Vec3.distance(p, f[i]))
                            p = o[j];
                    }
                }

                f[i] = p;
            }
        }

        var curr = JSON.parse(JSON.stringify(from));



        var c = 0;
        Engine.Coroutine.startCoroutine(function(){
            lerp(curr,from,to,c);
            c+=0.1;
            self.points = curr;
            if(c<1)
                return 0.1;
            else
                return -1;
        });
    }

    function CityBorderRenderer() {
        this.layer = Layers.groundDrawLayer;

        var city = this.city = isometrica.core.world.city;
        if(city === undefined)
            throw "City is undefined";
        //array of vectors in world space
        this.points = [];//calcpoints(city);//
        lerpBorder(this,calcpoints(city));

        var inflmap = isometrica.core.world.influenceMap;
        Events.on(inflmap, inflmap.events.areaChange, onAreaChange, this);

        this.min = [0,0,0];
        this.max = [1000,1000,1000]
    }

    CityBorderRenderer.prototype = Object.create(Engine.Renderer.prototype);

    //TODO this could check just four min,max points
    CityBorderRenderer.prototype.cullingTest = function(viewport,vprender){
        var buffer = float32Buffer;
        var points = this.points;
        for(var ii = 0; ii < points.length; ii++) {
            var l = points[ii].length;
            for (var i = 0; i < l; i++) {
                Vec3.transformMat4(buffer, points[ii][i], vprender.V);
                if (buffer[0] > -1 && buffer[0] < 1 && buffer[1] > -1 && buffer[1] < 1)
                    return true;
            }
        }
        return false;
    };

    var dash = [4];
    CityBorderRenderer.prototype.render = function (ctx, viewportrenderer, viewport, me) {
        var pps = this.points,p,ppsl = pps.length;
        var ps,l;
        var m = viewportrenderer.M;
        var buffer = float32Buffer;

        ctx.beginPath();
        for(var u = 0; u < ppsl; u++) {
            ps = pps[u];
            l = ps.length;

            Vec3.transformMat4(buffer, ps[0], m);
            ctx.moveTo(buffer[0], buffer[1]);

            for (var i = 1; i < l; i++) {
                Vec3.transformMat4(buffer, ps[i], m);
                ctx.lineTo(buffer[0], buffer[1]);
            }

            ctx.closePath();
        }

        //ctx.save();
        ctx.lineWidth = 3;
        ctx.setLineDash(dash);
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        //ctx.fillStyle = "rgba(255,255,255,0.1)";
        //ctx.fill();
        ctx.stroke();
        //ctx.restore();
    };

    return CityBorderRenderer;
});
