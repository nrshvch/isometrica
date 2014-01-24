define(function () {
    function AABB(center, extents) {
        this.center = center || [0,0,0];
        this.extents = extents || [0,0,0];
        this.min = [];
        this.max = [];
        this.calculateMinMax();
    }

    AABB.prototype.setCenter = function(x,y,z){
        this.center[0] = x;
        this.center[1] = y;
        this.center[2] = z;
        this.calculateMinMax();
        return this;
    }

    AABB.prototype.setExtents = function(x,y,z){
        this.extents[0] = x;
        this.extents[1] = y;
        this.extents[2] = z;
        this.calculateMinMax();
        return this;
    }

    AABB.prototype.calculateMinMax = function () {
        var center = this.center,
            extents = this.extents,
            min = this.min,
            max = this.max;

        min[0] = center[0] - extents[0];
        min[1] = center[1] - extents[1];
        min[2] = center[2] - extents[2];

        max[0] = center[0] + extents[0];
        max[1] = center[1] + extents[1];
        max[2] = center[2] + extents[2];
    };

    AABB.prototype.Calculate = function (vertices) {
        var maxX = vertices[0][0],
            minX = vertices[0][0],
            maxY = vertices[0][1],
            minY = vertices[0][1],
            maxZ = vertices[0][2],
            minZ = vertices[0][2],
            verticesCount = vertices.length,
            vertex, i;

        for (i = 1; i < verticesCount; i++) {
            vertex = vertices[i];


            if (vertex[0] > maxX)
                maxX = vertex[0];
            else if (vertex[0] < minX)
                minX = vertex[0];


            if (vertex[1] > maxY)
                maxY = vertex[1];
            else if (vertex[1] < minY)
                minY = vertex[1];


            if (vertex[2] > maxZ)
                maxZ = vertex[2];
            else if (vertex[2] < minZ)
                minZ = vertex[2];
        }

        this.center[0] = minX + (maxX - minX) / 2;
        this.center[1] = minY + (maxY - minY) / 2;
        this.center[2] = minZ + (maxZ - minZ) / 2;

        this.min[0] = minX;
        this.min[1] = minY;
        this.min[2] = minZ;

        this.max[0] = maxX;
        this.max[1] = maxY;
        this.max[2] = maxZ;

        this.extents[0] = (maxX - minX) / 2;
        this.extents[1] = (maxY - minY) / 2;
        this.extents[2] = (maxZ - minZ) / 2;

        return this;
    }

    AABB.prototype.Intersects = function (b) {
        return !(this.min[0] > b.max[0] || this.max[0] < b.min[0] || this.min[1] > b.max[1] || this.max[1] < b.min[1] || this.min[2] > b.max[2] || this.max[2] < b.min[2]);
    }

    AABB.prototype.Contains = function (b) {
        return b.min[0] >= this.min[0] && b.max[0] <= this.max[0] && b.min[1] >= this.min[1] && b.max[1] <= this.max[1] && b.min[2] >= this.min[2] && b.max[2] <= this.max[2];
    }

    AABB.prototype.ContainsPoint = function (point) {
        return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1] && point[2] >= this.min[2] && point[2] <= this.max[2];
    }

    return AABB;
});
