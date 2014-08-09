//TODO render only dirty areas of screen
//TODO each GO could have multiple renderers...
//TODO ...all scene renderers should be grouped in single array.
define(function (require) {
    var config = require("./config");
    var glMatrix = require("./vendor/gl-matrix");
    var Transform = require("./components/TransformComponent");

    function Canvas2dRenderer(graphics) {
        this.graphics = graphics;
        this.layerBuffers = [];
        for (var i = 0; i < config.layersCount; i++)
            this.layerBuffers[i] = [];
        this.M = [];
        this.V = [];
    }

    var p = Canvas2dRenderer.prototype,
        bufferVec3 = new Float32Array([0, 0, 0]),
        buffer2Vec3 = new Float32Array([0, 0, 0]),
        bufferMat4 = new Float32Array(16),
        depthSort = function (a, b) {
            //a.gameObject.transform.getPosition(bufferVec3);
            Transform.getPosition(a.gameObject.transform, bufferVec3);
            a = bufferVec3[0] - bufferVec3[1] + bufferVec3[2];
            //b.gameObject.transform.getPosition(bufferVec3);
            Transform.getPosition(b.gameObject.transform, bufferVec3);
            return a - (bufferVec3[0] - bufferVec3[1] + bufferVec3[2]);
        };

    function render(self, camera, viewport) {
        viewport.context.fillRect(0,0,100,100);

        var gameObjects = camera.world.retrieve(camera),
            gameObjectsCount = gameObjects.length,
            layersCount = config.layersCount,
            renderer, renderers, renderersCount,
            i, j, ctx;

        self.M = camera.camera.getWorldToScreen();
        self.V = camera.camera.getWorldToViewport();

        viewport.context.clearRect(0, 0, viewport.width, viewport.height);

        for (i = 0; i < gameObjectsCount; i++){
            renderer = gameObjects[i].renderer;
            if(renderer !== undefined && renderer.enabled && renderer.cullingTest(viewport, self, renderer)) {
                self.layerBuffers[renderer.layer].push(renderer)
            }
        }

        for (i = 0; i < layersCount; i++) {
            ctx = viewport.layers[i];

            if(~config.noLayerClearMask & 1<<i){
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            renderers = self.layerBuffers[i];
            renderersCount = renderers.length;

            if (~config.noLayerDepthSortingMask & 1 << i) {
                renderers.sort(depthSort);
            }

            for (j = 0; j < renderersCount; j++) {
                renderer = renderers.pop();

                renderer.render(ctx, self, viewport, renderer);
            }

            viewport.context.drawImage(ctx.canvas, 0, 0);
        }

        //if (config.renderOctree && config.useOctree && camera.world.octree.root !== null)
        //self.renderOctreeNode(camera.world.octree.root, viewport.context);

    };

    Canvas2dRenderer.render = render;

    p.graphics = null;

    /*
    p.render = function (camera, viewport) {
        var gameObjects = camera.world.retrieve(camera),
            gameObjectsCount = gameObjects.length,
            layersCount = config.layersCount,
            renderer, renderers, renderersCount,
            i, j, ctx;

        this.M = camera.camera.getWorldToScreen();
        this.V = camera.camera.getWorldToViewport();

        viewport.context.clearRect(0, 0, viewport.width, viewport.height);

        for (i = 0; i < gameObjectsCount; i++){
            var go = gameObjects[i];
            if(go.renderer !== undefined && go.renderer.enabled && go.renderer.cullingTest(viewport, this))
                this.layerBuffers[go.renderer.layer].push(go.renderer)
        }

        for (i = 0; i < layersCount; i++) {
            ctx = viewport.layers[i];

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            renderers = this.layerBuffers[i];
            renderersCount = renderers.length;

            if (config.depthSortingMask & (1 << i)) {
                renderers.sort(depthSort);
            }

            for (j = 0; j < renderersCount; j++) {
                renderer = renderers.pop();

                renderer.render(ctx, this, viewport);
            }

            viewport.context.drawImage(ctx.canvas, 0, 0);
        }

        //if (config.renderOctree && config.useOctree && camera.world.octree.root !== null)
        //this.renderOctreeNode(camera.world.octree.root, viewport.context);

    };
    */
                           /*

    p.renderAxis = function (gameObject, ctx) {
        var W = gameObject.transform.getLocalToWorld(),
            pos0 = gameObject.transform.getPosition();

        glMatrix.vec3.transformMat4(pos0, pos0, this.M);

        var pos = bufferVec3;

        //draw X
        pos[0] = 100;
        pos[1] = 0;
        pos[2] = 0;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#ff0000';
        ctx.stroke();

        //draw Y
        pos[0] = 0;
        pos[1] = 100;
        pos[2] = 0;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#00ff00';
        ctx.stroke();

        //draw Z
        pos[0] = 0;
        pos[1] = 0;
        pos[2] = 100;

        glMatrix.vec3.transformMat4(pos, pos, W);
        glMatrix.vec3.transformMat4(pos, pos, this.M);

        ctx.beginPath();
        ctx.moveTo(pos0[0], pos0[1]);
        ctx.lineTo(pos[0], pos[1]);
        ctx.closePath();
        ctx.strokeStyle = '#0000ff';
        ctx.stroke();
    }

    p.renderOctreeNode = function (node, ctx) {
        if (node.type === 0)
            this.renderBound(node.x, node.y, node.z, node.ex, node.ey, node.ez, ctx);

        //render childs
        if (node.type === 1) {
            if (node.nodesMask & 1)
                this.renderOctreeNode(node.subnode0, ctx);

            if (node.nodesMask & 2)
                this.renderOctreeNode(node.subnode1, ctx);

            if (node.nodesMask & 4)
                this.renderOctreeNode(node.subnode2, ctx);

            if (node.nodesMask & 8)
                this.renderOctreeNode(node.subnode3, ctx);

            if (node.nodesMask & 16)
                this.renderOctreeNode(node.subnode4, ctx);

            if (node.nodesMask & 32)
                this.renderOctreeNode(node.subnode5, ctx);

            if (node.nodesMask & 64)
                this.renderOctreeNode(node.subnode6, ctx);

            if (node.nodesMask & 128)
                this.renderOctreeNode(node.subnode7, ctx);
        }
    }


    p.renderBound = function (x, y, z, ex, ey, ez, ctx) {
        var min = [x - ex, y - ey, z - ez],
            max = [x + ex, y + ey, z + ez],
            w = max[0] - min[0],
            h = max[1] - min[1],
            d = max[2] - min[2];

        var m1 = [min[0] + w, min[1], min[2]],
            m2 = [min[0], min[1] + h , min[2]],
            m3 = [min[0] + w, min[1] + h, min[2]];

        var mx1 = [min[0], min[1], min[2] + d],
            mx2 = [min[0] + w, min[1] , min[2] + d],
            mx3 = [min[0], min[1] + h, min[2] + d];


        var p = bufferVec3;

        ctx.beginPath();
        glMatrix.vec3.transformMat4(p, min, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m1, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m3, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, m2, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, min, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx1, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx2, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, max, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx3, this.M);
        ctx.lineTo(p[0], p[1]);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx1, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m1, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx2, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m2, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, mx3, this.M);
        ctx.lineTo(p[0], p[1]);

        glMatrix.vec3.transformMat4(p, m3, this.M);
        ctx.moveTo(p[0], p[1]);
        glMatrix.vec3.transformMat4(p, max, this.M);
        ctx.lineTo(p[0], p[1]);

        var bound = {};
        ctx.closePath();
        //ctx.strokeStyle = bound.color || (bound.color = '#' + ((0xFFFFFF * Math.random()) | 0).toString(16));
        ctx.stroke();

    };


              */
    return Canvas2dRenderer;
});