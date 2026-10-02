//TODO render only dirty areas of screen
//TODO each GO could have multiple renderers...
//TODO ...all scene renderers should be grouped in single array.
define(function (require) {
    var config = require("./config");
    var glMatrix = require("gl-matrix");
    var Transform = require("./components/transformcomponent");
    var Renderer = require("./components/renderer");
    var SpriteRenderer = require("./components/spriterenderer");
    var World = require("./world");

    function Canvas2dRenderer(graphics) {
        this.graphics = graphics;
        this.M = [];
        this.V = [];
    }

    var p = Canvas2dRenderer.prototype,
        getLocalToWorld = Transform.getLocalToWorld,
        // renderers that still cull and draw the way these do are culled -
        // and sprites drawn - by cull() and render() themselves, see there
        pointCullingTest = Renderer.prototype.cullingTest,
        spriteCullingTest = SpriteRenderer.prototype.cullingTest,
        spriteRender = SpriteRenderer.prototype.render,
        drawSprite = SpriteRenderer.draw,

        // What a gameObject's slot in World#slots holds: how it is culled,
        // where it is in the world, and for a sprite, its pivot and its
        // picture's size - everything needed to tell whether it is on screen
        // without touching it. refreshSlot fills it in.
        SLOT_SIZE = World.SLOT_SIZE,
        SLOT_KIND = 0,
        SLOT_X = 1,
        SLOT_Y = 2,
        SLOT_Z = 3,
        SLOT_PIVOT_X = 4,
        SLOT_PIVOT_Y = 5,
        SLOT_WIDTH = 6,
        SLOT_HEIGHT = 7,

        // slot kinds: nothing to draw; a sprite; a sprite whose picture is
        // not there yet (0x0), which is tested against the renderer itself
        // until it comes in; a renderer culled by its position alone
        // (Renderer#cullingTest, text for one); and any other renderer, which
        // is asked through its own cullingTest
        KIND_NONE = 0,
        KIND_SPRITE = 1,
        KIND_UNSIZED_SPRITE = 2,
        KIND_POINT = 3,
        KIND_CUSTOM = 4,

        // how an entry's renderer gets drawn: through its own render(), or as
        // a plain sprite at the screen position cull() left in drawX/drawY
        DRAW_CALL = 0,
        DRAW_SPRITE = 1,

        // Everything a frame knows about what it draws lives in the buffers
        // below, one entry per renderer that passed culling, in the order
        // cull() met them. They are allocated at a capacity of however many
        // gameObjects the world had at most (see reserve), so a frame never
        // allocates and never grows or shrinks an array of references - the
        // renderers used to be pushed onto per-layer arrays and popped off
        // them again, every frame.
        //
        // order holds the entries grouped by layer - layer i is
        // order[layerStarts[i] .. layerStarts[i + 1]) - and, in the layers
        // that are sorted, by depth within it; each layer is drawn from the
        // end of its range back to the start.
        capacity = 0,
        visibleRenderers = [],
        entryLayers = new Uint8Array(0),
        entryDraw = new Uint8Array(0),
        drawX = new Int32Array(0),
        drawY = new Int32Array(0),
        depthKeys = new Float64Array(0),
        quantizedKeys = new Uint16Array(0),
        order = new Uint32Array(0),
        orderScratch = new Uint32Array(0),
        layerStarts = new Uint32Array(0),
        layerCursors = new Uint32Array(0),

        // depth keys are sorted by a 2-pass LSD radix sort over an 8-bit
        // digit each (radix 256) -- no JS comparator callback, full 16-bit
        // depth resolution, and no 65536-wide histogram (a single pass over
        // the whole 16-bit key would need one, and clearing/prefix-summing it
        // every call turned out to cost more than the O(n) work it replaced
        // for a typical layer's renderer count -- see git history). Two
        // 256-wide digit passes keep the fixed per-call cost down to ~2*256
        // regardless of key range. Each pass is a stable counting sort by one
        // digit, and LSD order (least-significant digit first) makes the
        // composition of both passes a full, stable sort by the 16-bit key --
        // equal-key renderers keep their relative order.
        KEY_MAX = 0xffff,
        RADIX = 256,
        digitCounts = new Uint32Array(RADIX);

    /**
     * Makes room in the per-entry buffers for every one of count gameObjects
     * passing culling, and in the per-layer ones for layersCount layers.
     * Grows only, and by half again as much, so a world that keeps growing
     * reallocates now and then rather than every time a few more are added.
     */
    function reserve(count, layersCount) {
        var i;

        if (count > capacity) {
            capacity = Math.max(count + (count >> 1), 1024);

            visibleRenderers = [];
            for (i = 0; i < capacity; i++)
                visibleRenderers.push(null);

            entryLayers = new Uint8Array(capacity);
            entryDraw = new Uint8Array(capacity);
            drawX = new Int32Array(capacity);
            drawY = new Int32Array(capacity);
            depthKeys = new Float64Array(capacity);
            quantizedKeys = new Uint16Array(capacity);
            order = new Uint32Array(capacity);
            orderScratch = new Uint32Array(capacity);
        }

        if (layersCount + 1 > layerStarts.length) {
            layerStarts = new Uint32Array(layersCount + 1);
            layerCursors = new Uint32Array(layersCount);
        }
    }

    /**
     * Brings gameObject's slot up to date, see World#refreshSlots.
     */
    function refreshSlot(slots, o, gameObject) {
        var m = getLocalToWorld(gameObject.transform),
            renderer = gameObject.renderer,
            cullingTest;

        slots[o + SLOT_X] = m[12];
        slots[o + SLOT_Y] = m[13];
        slots[o + SLOT_Z] = m[14];

        if (renderer === undefined || renderer === null) {
            slots[o + SLOT_KIND] = KIND_NONE;
            return;
        }

        cullingTest = renderer.cullingTest;

        if (cullingTest === spriteCullingTest)
            settleSprite(slots, o, renderer);
        else
            slots[o + SLOT_KIND] = cullingTest === pointCullingTest ? KIND_POINT : KIND_CUSTOM;
    }

    /**
     * Takes a sprite's pivot and picture size into its slot - once there is a
     * picture, that is: an empty (0x0) sprite is still being loaded, and is
     * left for cull() to look at every frame until its size comes in. A
     * picture is taken not to change size after that (see SpriteCache); a
     * renderer changing its sprite or its pivot tells the world itself.
     */
    function settleSprite(slots, o, renderer) {
        var sprite = renderer._sprite;

        if (sprite === null || sprite.width === 0) {
            slots[o + SLOT_KIND] = KIND_UNSIZED_SPRITE;
            return;
        }

        slots[o + SLOT_KIND] = KIND_SPRITE;
        slots[o + SLOT_PIVOT_X] = renderer._pivotX;
        slots[o + SLOT_PIVOT_Y] = renderer._pivotY;
        slots[o + SLOT_WIDTH] = sprite.width;
        slots[o + SLOT_HEIGHT] = sprite.height;
    }

    /**
     * Puts every enabled renderer that is on screen in an entry of its own,
     * and returns how many there are.
     *
     * This is the one loop that runs for every gameObject there is, so it
     * goes over the world's slots rather than over the gameObjects: sprites
     * and point renderers (text, say) are tested right there, against the
     * matrices' entries held in locals, and only one that turns out to be on
     * screen is looked at itself - off screen, a gameObject costs a read of
     * its slot and nothing else. The tests are SpriteRenderer#cullingTest and
     * Renderer#cullingTest inlined, and have to stay in step with them; a
     * renderer that culls some other way is asked through its own
     * cullingTest.
     *
     * gameObjects is what the world retrieved for the camera: all of them,
     * where slot i is gameObjects[i]'s own, or those the octree picked.
     */
    function cull(world, gameObjects, viewport, self) {
        var slots = world.slots,
            direct = gameObjects === world.gameObjects,
            M = self.M,
            V = self.V,
            m0 = M[0], m1 = M[1], m4 = M[4], m5 = M[5],
            m8 = M[8], m9 = M[9], m12 = M[12], m13 = M[13],
            v0 = V[0], v1 = V[1], v4 = V[4], v5 = V[5],
            //the order things are drawn in, see CameraComponent#depthAxes
            d0 = self.D[0], d1 = self.D[1], d2 = self.D[2],
            v8 = V[8], v9 = V[9], v12 = V[12], v13 = V[13],
            width = viewport.width,
            height = viewport.height,
            count = gameObjects.length,
            visible = 0,
            renderer, sprite, kind, draw, o, x, y, z, sx, sy, i;

        for (i = 0; i < count; i++) {
            o = (direct ? i : gameObjects[i]._worldIndex) * SLOT_SIZE;
            kind = slots[o + SLOT_KIND];

            if (kind === KIND_NONE)
                continue;

            x = slots[o + SLOT_X];
            y = slots[o + SLOT_Y];
            z = slots[o + SLOT_Z];

            if (kind === KIND_SPRITE) {
                sx = (m0 * x + m4 * y + m8 * z + m12 - slots[o + SLOT_PIVOT_X]) | 0;
                sy = (m1 * x + m5 * y + m9 * z + m13 - slots[o + SLOT_PIVOT_Y]) | 0;

                if (sx > width || sx + slots[o + SLOT_WIDTH] < 0 || sy > height || sy + slots[o + SLOT_HEIGHT] < 0)
                    continue;

                renderer = gameObjects[i].renderer;

                if (!renderer.enabled)
                    continue;

                drawX[visible] = sx;
                drawY[visible] = sy;
                draw = renderer.render === spriteRender ? DRAW_SPRITE : DRAW_CALL;
            } else if (kind === KIND_POINT) {
                sx = v0 * x + v4 * y + v8 * z + v12;
                sy = v1 * x + v5 * y + v9 * z + v13;

                if (sx > 1 || sx < -1 || sy > 1 || sy < -1)
                    continue;

                renderer = gameObjects[i].renderer;

                if (!renderer.enabled)
                    continue;

                draw = DRAW_CALL;
            } else if (kind === KIND_UNSIZED_SPRITE) {
                renderer = gameObjects[i].renderer;
                sprite = renderer._sprite;

                if (!renderer.enabled || sprite === null)
                    continue;

                //its picture may have come in since; culled from its slot then
                settleSprite(slots, o, renderer);

                sx = (m0 * x + m4 * y + m8 * z + m12 - renderer._pivotX) | 0;
                sy = (m1 * x + m5 * y + m9 * z + m13 - renderer._pivotY) | 0;

                if (sx > width || sx + sprite.width < 0 || sy > height || sy + sprite.height < 0)
                    continue;

                drawX[visible] = sx;
                drawY[visible] = sy;
                draw = renderer.render === spriteRender ? DRAW_SPRITE : DRAW_CALL;
            } else {
                renderer = gameObjects[i].renderer;

                if (!renderer.enabled || !renderer.cullingTest(viewport, self, renderer))
                    continue;

                draw = DRAW_CALL;
            }

            entryDraw[visible] = draw;
            visibleRenderers[visible] = renderer;
            entryLayers[visible] = renderer.layer;
            depthKeys[visible] = d0 * x + d1 * y + d2 * z;
            visible++;
        }

        return visible;
    }

    /**
     * Fills order with entries 0 .. count, grouped by layer - a counting
     * sort, so it is stable: within a layer, entries stay in the order they
     * were culled in, which is the world's order.
     */
    function groupLayers(count, layersCount) {
        var i, layer, sum, c;

        layerStarts.fill(0);

        for (i = 0; i < count; i++)
            layerStarts[entryLayers[i]]++;

        sum = 0;
        for (layer = 0; layer < layersCount; layer++) {
            c = layerStarts[layer];
            layerStarts[layer] = layerCursors[layer] = sum;
            sum += c;
        }
        layerStarts[layersCount] = sum;

        for (i = 0; i < count; i++)
            order[layerCursors[entryLayers[i]]++] = i;
    }

    /**
     * Sorts order[start .. end) by depth key, keeping the order of the ones
     * that share a key. The keys are quantized to 16 bits over the range's
     * own min..max first; the two digit passes go from order to orderScratch
     * and back, so the result lands in order itself.
     */
    function depthSort(start, end) {
        var min = Infinity,
            max = -Infinity,
            i, entry, key, range, scale, q, d, sum, c;

        for (i = start; i < end; i++) {
            key = depthKeys[order[i]];
            if (key < min) min = key;
            if (key > max) max = key;
        }

        range = max - min;
        scale = range > 0 ? KEY_MAX / range : 0;

        for (i = start; i < end; i++) {
            entry = order[i];
            q = ((depthKeys[entry] - min) * scale) | 0;
            // guard against fp rounding pushing the max key past the last value
            if (q > KEY_MAX)
                q = KEY_MAX;
            quantizedKeys[entry] = q;
        }

        // low digit, order -> orderScratch
        digitCounts.fill(0);

        for (i = start; i < end; i++)
            digitCounts[quantizedKeys[order[i]] & 0xff]++;

        sum = start;
        for (d = 0; d < RADIX; d++) {
            c = digitCounts[d];
            digitCounts[d] = sum;
            sum += c;
        }

        for (i = start; i < end; i++) {
            entry = order[i];
            orderScratch[digitCounts[quantizedKeys[entry] & 0xff]++] = entry;
        }

        // high digit, orderScratch -> order
        digitCounts.fill(0);

        for (i = start; i < end; i++)
            digitCounts[quantizedKeys[orderScratch[i]] >> 8]++;

        sum = start;
        for (d = 0; d < RADIX; d++) {
            c = digitCounts[d];
            digitCounts[d] = sum;
            sum += c;
        }

        for (i = start; i < end; i++) {
            entry = orderScratch[i];
            order[digitCounts[quantizedKeys[entry] >> 8]++] = entry;
        }
    }

    function render(self, camera, viewport) {
        var world = camera.world,
            gameObjects = world.retrieve(camera),
            layersCount = config.layersCount,
            noLayerClearMask = config.noLayerClearMask,
            noLayerDepthSortingMask = config.noLayerDepthSortingMask,
            context = viewport.context,
            renderer, count, start, end, entry,
            i, j, ctx;

        self.M = camera.camera.getWorldToScreen();
        self.V = camera.camera.getWorldToViewport();
        self.D = camera.camera.depthAxes;

        reserve(gameObjects.length, layersCount);

        world.refreshSlots(refreshSlot);
        count = cull(world, gameObjects, viewport, self);
        groupLayers(count, layersCount);

        context.clearRect(0, 0, viewport.width, viewport.height);

        for (i = 0; i < layersCount; i++) {
            ctx = viewport.layers[i];

            if (~noLayerClearMask & 1 << i) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            }

            start = layerStarts[i];
            end = layerStarts[i + 1];

            if (end - start > 1 && (~noLayerDepthSortingMask & 1 << i)) {
                depthSort(start, end);
            }

            for (j = end - 1; j >= start; j--) {
                entry = order[j];
                renderer = visibleRenderers[entry];
                //nothing is kept alive from here until the next frame
                visibleRenderers[entry] = null;

                if (entryDraw[entry] === DRAW_SPRITE)
                    drawSprite(ctx, renderer, drawX[entry], drawY[entry]);
                else
                    renderer.render(ctx, self, viewport, renderer);
            }

            context.drawImage(ctx.canvas, 0, 0);
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
                depthSort(renderers);
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