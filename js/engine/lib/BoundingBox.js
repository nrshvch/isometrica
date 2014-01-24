define(function () {
    function BoundingBox(min, max, center) {
        if (min !== undefined) { //if min is set, then max is set too
            this.min = min;
            this.max = max;
        } else {
            this.min = [0, 0, 0];
            this.max = [0, 0, 0];
        }

        if (center !== undefined)
            this.center = center;
        else
            this.center = [0, 0, 0];

        this.calculateCenter();
    }

    BoundingBox.prototype.min = null;
    BoundingBox.prototype.max = null;
    BoundingBox.prototype.center = null;

    BoundingBox.prototype.calculateCenter = function () {
        var center = this.center,
            min = this.min,
            max = this.max;

        center[0] = min[0] + (max[0] - min[0]) / 2;
        center[1] = min[1] + (max[1] - min[1]) / 2;
        center[2] = min[2] + (max[2] - min[2]) / 2;
    }

    BoundingBox.prototype.setMinMax = function(x0, y0,z0,x1,y1,z1){
        var min = this.min,
            max = this.max;

        min[0] = x0;
        min[1] = y0;
        min[2] = z0;
        max[0] = x1;
        max[1] = y1;
        max[2] = z1;

        this.calculateCenter();
    }

    BoundingBox.prototype.Calculate = function (vertices) {
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

        return this;
    }

    BoundingBox.prototype.Intersects = function (b) {
        return !(this.min[0] > b.max[0] || this.max[0] < b.min[0] || this.min[1] > b.max[1] || this.max[1] < b.min[1] || this.min[2] > b.max[2] || this.max[2] < b.min[2]);
    }

    BoundingBox.prototype.Contains = function (b) {
        return b.min[0] >= this.min[0] && b.max[0] <= this.max[0] && b.min[1] >= this.min[1] && b.max[1] <= this.max[1] && b.min[2] >= this.min[2] && b.max[2] <= this.max[2];
    }

    BoundingBox.prototype.ContainsPoint = function (point) {
        return point[0] >= this.min[0] && point[0] <= this.max[0] && point[1] >= this.min[1] && point[1] <= this.max[1] && point[2] >= this.min[2] && point[2] <= this.max[2];
    }

    return BoundingBox;
});
