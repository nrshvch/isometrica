/**
 * Created by User on 07.08.2014.
 */
define(function (require) {
    var Engine = require("engine/main");
    var glMatrix = require("../vendor/gl-matrix");
    var Vec3 = glMatrix.vec3;
    var Core = require("core/main");
    var Config = require("../config");
    var Terrain = Core.Terrain;
    var RenderLayer = require("../renderlayer");
    var Events = require("events");

    var float32Buffer = new Float32Array(3);
    var dash = [4];

    //region funcs
    function calculateBorderPoints(city) {
        var a, b, c, d, i, len, idx;
        var tiles = city.area.getInfluenceArea();
        var yIndexUnit = Terrain.convertToIndex(0, 1);
        var edges = {}, paths = [];

        //process every tile and add perimeter edges;
        //if edges are overlaping and are of opposite direction,
        //then these edges are internal, and should be deleted;
        len = tiles.length;
        for(i = 0; i < len; i++){
            idx = parseInt(tiles[i], 10);

            a = idx; // x,y
            b = idx + 1; // x+1,y
            c = idx + yIndexUnit + 1; // x+1,y+1
            d = idx + yIndexUnit; // x,y+1

            edges[a] = edges[a] || {};
            edges[b] = edges[b] || {};
            edges[c] = edges[c] || {};
            edges[d] = edges[d] || {};

            if (edges[b][a] === undefined)
                edges[a][b] = {
                    from: a,
                    to: b,
                    revised: false
                };
            else
                delete edges[b][a];

            if (edges[c][b] === undefined)
                edges[b][c] = {
                    from: b,
                    to: c,
                    revised: false
                };
            else
                delete edges[c][b];

            if (edges[d][c] === undefined)
                edges[c][d] = {
                    from: c,
                    to: d,
                    revised: false
                };
            else
                delete edges[d][c];

            if (edges[a][d] === undefined)
                edges[d][a] = {
                    from: d,
                    to: a,
                    revised: false
                };
            else
                delete edges[a][d];
        }

        //make paths
        for (i in edges) {
            len = edges[i];
            i = parseInt(i, 10);

            a = len[i + 1];
            b = len[i - 1];
            c = len[i + yIndexUnit];
            d = len[i - yIndexUnit];

            if (a !== undefined && !a.revised) {
                len = [];
                paths.push(len);
                path(edges, len, a);
            }

            if (b !== undefined && !b.revised) {
                len = [];
                paths.push(len);
                path(edges, len, b);
            }

            if (c !== undefined && !c.revised) {
                len = [];
                paths.push(len);
                path(edges, len, c);
            }

            if (d !== undefined && !d.revised) {
                len = [];
                paths.push(len);
                path(edges, len, d);
            }
        }

        //remove redundant points
        simplify(paths);

        return paths;
    }

    function path(map, arr, pair) {
        var a, b, c, d, e, f, g,
            yIndexUnit = Terrain.convertToIndex(0, 1);

        e = Config.tileSize;
        f = Config.tileZStep;
        g = pair.from;

        pair.revised = true;

        a = Terrain.extractX(g);
        b = isometrica.core.world.terrain.getGridPointHeight(g);
        c = Terrain.extractY(g);

        a = a * e - e / 2;
        b = b * f;
        c = c * e - e / 2;

        arr.push([a, b, c]);

        e = null;
        f = pair.to;
        g = map[f];
        if (g !== undefined) {
            a = g[f + 1];
            b = g[f - 1];
            c = g[f + yIndexUnit];
            d = g[f - yIndexUnit];

            if (a !== undefined && !a.revised) {
                e = a;
            }else if(b !== undefined && !b.revised){
                e = b;
            }else if(c !== undefined && !c.revised){
                e = c;
            }else if(d !== undefined && !d.revised){
                e = d;
            }
        }

        if (e !== null)
            path(map, arr, e);
    }

    function simplify(paths) {
        var path, curr, prev, next,
            jl, il = paths.length,
            buf = [], newpath, a, b, c;

        for (var i = 0; i < il; i++) {
            path = paths[i];
            newpath = [];
            jl = path.length;

            prev = next = undefined;
            for (var j = 0; j < jl; j++) {
                curr = path[j];
                next = path[j + 1];
                prev = path[j - 1];

                if (next && prev) {
                    Vec3.sub(buf, prev, next);

                    a = buf[0];
                    b = buf[1];
                    c = buf[2];

                    if ((a === 0 && b === 0 && c !== 0) ||
                        (a !== 0 && b === 0 && c === 0) ||
                        (a === 0 && b !== 0 && c === 0))
                            continue;
                }

                newpath.push(curr);
            }

            paths[i] = newpath;
        }
    }

    function lerp(r, from, to, c) {
        var il = from.length;
        for (var i = 0; i < il; i++) {
            var jl = from[i].length;
            for (var j = 0; j < jl; j++) {
                Vec3.lerp(r[i][j], from[i][j], to[i][j], c);
                //r[i][j] = to[i][j];
            }
        }
    }

    function lerpBorder(self, to) {
        self.points = to;
        return;

        //make copy of new border
        var from = JSON.parse(JSON.stringify(to));
        var old = self.points;

        //if no points, then lerp from city center
        if (old.length === 0) {
            old.push([
                [self.city.x * Config.tileSize, 0, self.city.y * Config.tileSize]
            ]);
        }

        //put all new border points on old border
        for (var ii = 0; ii < from.length; ii++) {
            var f = from[ii];

            for (var i = 0; i < f.length; i++) {
                var p = null;

                for (var jj = 0; jj < old.length; jj++) {
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
        Engine.Coroutine.startCoroutine(function () {
            lerp(curr, from, to, c);
            c += 0.1;
            self.points = curr;
            if (c < 1)
                return 0.1;
            else
                return -1;
        });
    }

    //endregion

    //region event handlers
    function onAreaChange(sender, args, self) {
        var city = self.city;
        if (city)
            self.points = calculateBorderPoints(city);
    }

    //endregion

    /**
     *
     * @constructor
     */
    function CityBorderRenderer(city) {
        this.layer = RenderLayer.groundDrawLayer;
        this.city = city;
        var inflmap = city.root.areaService;
        Events.on(inflmap, inflmap.events.areaChange, onAreaChange, this);
    }

    CityBorderRenderer.prototype = Object.create(Engine.Renderer.prototype);

    /**
     * Array of arrays of border points
     * @type {[][]}
     */
    CityBorderRenderer.prototype.points = null;

    CityBorderRenderer.prototype.start = function () {
        this.points = calculateBorderPoints(this.city);
    };

    CityBorderRenderer.prototype.cullingTest = function (viewport, vprender) {
        var buffer = float32Buffer;
        var points = this.points;
        for (var ii = 0; ii < points.length; ii++) {
            var l = points[ii].length;
            for (var i = 0; i < l; i++) {
                Vec3.transformMat4(buffer, points[ii][i], vprender.V);
                if (buffer[0] > -1 && buffer[0] < 1 && buffer[1] > -1 && buffer[1] < 1)
                    return true;
            }
        }
        return false;
    };

    CityBorderRenderer.prototype.render = function (ctx, viewportrenderer, viewport, me) {
        var pps = this.points, ppsl = pps.length;
        var ps, l;
        var m = viewportrenderer.M;
        var buffer = float32Buffer;

        ctx.beginPath();
        for (var u = 0; u < ppsl; u++) {
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
