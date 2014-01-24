define(function (require) {
    var engine = require("engine"),
        TerrainType = require("lib/terraintype"),
        ResourceCode = require("lib/resourcecode"),
        Node = require("../pathfinding/node");

    var grass = {
        2222: 'grass/2222.png',
        2111: 'grass/2111.png',
        2223: 'grass/2223.png',
        2112: 'grass/2112.png',
        2232: 'grass/2232.png',
        2121: 'grass/2121.png',
        2233: 'grass/2233.png',
        2122: 'grass/2122.png',
        2322: 'grass/2322.png',
        2211: 'grass/2211.png',
        2323: 'grass/2323.png',
        2212: 'grass/2212.png',
        2332: 'grass/2332.png',
        2221: 'grass/2221.png',
        2333: 'grass/2333.png',
        2321: 'grass/2321.png',
        2123: 'grass/2123.png',
        2101: 'grass/2101.png',
        2343: 'grass/2343.png'
    };

    var shore = {
        2222: 'shore/2222.png',
        2111: 'shore/2111.png',
        2223: 'shore/2223.png',
        2112: 'shore/2112.png',
        2232: 'shore/2232.png',
        2121: 'shore/2121.png',
        2233: 'shore/2233.png',
        2122: 'shore/2122.png',
        2322: 'shore/2322.png',
        2211: 'shore/2211.png',
        2323: 'shore/2323.png',
        2212: 'shore/2212.png',
        2332: 'shore/2332.png',
        2221: 'shore/2221.png',
        2333: 'shore/2333.png',
        2321: 'shore/2321.png',
        2123: 'shore/2123.png',
        2101: 'shore/2101.png',
        2343: 'shore/2343.png'
    };

    var water = {
        2222: "water/2222.png"
    };

    var resourcetile = {
        coal: "coal.png",
        stone: "stone.png",
        iron: "iron.png",
        oil: "oil_spill.png"
    };


    function TileScript(x, y) {
        engine.Component.call(this);
        this.events = {
            dataSet: 0
        }

        if (x !== undefined && y !== undefined) {
            this.x = x;
            this.y = y;
            this.z = 0;
        }

        this.gridPoints = [0, 0, 0, 0];


        var self = this;
        this.node = new Node(function () {
            var n1 = vkaria.tilesman.getTile(self.x + 1, self.y);
            var n2 = vkaria.tilesman.getTile(self.x, self.y + 1);
            var n3 = vkaria.tilesman.getTile(self.x - 1, self.y);
            var n4 = vkaria.tilesman.getTile(self.x, self.y - 1);

            var r = [];
            if (n1)r.push(n1.tileScript.node);
            if (n2)r.push(n2.tileScript.node);
            if (n3)r.push(n3.tileScript.node);
            if (n4)r.push(n4.tileScript.node);

            return r;
        }, this);
    }

    TileScript.prototype = Object.create(engine.Component.prototype);
    TileScript.prototype.constructor = TileScript;

    TileScript.prototype.x = null;
    TileScript.prototype.y = null;
    TileScript.prototype.z = null;
    TileScript.prototype.type = null;
    TileScript.prototype.gridPoints = null;

    TileScript.prototype.setGameObject = function (gameObject) {
        engine.Component.prototype.setGameObject.call(this, gameObject);
        gameObject.tileScript = this;
    };

    TileScript.prototype.init = function () {
        this.type = TerrainType.water;
        this.z = 0; //WATERLEVEL!!!
        this.gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(water["2222"]));
        this.gameObject.transform.setPosition(
            this.x * engine.config.tileSize,
            this.z * engine.config.tileZStep,
            this.y * engine.config.tileSize
        );
    };

    /**
     * @param {object} data
     */
    TileScript.prototype.setData = function (data) {
        var self = this,
            gameObject = this.gameObject,
            sprite = gameObject.spriteRenderer,
            transform = gameObject.transform;

        this.data = data;

        this.gridPoints[0] = data.gridPoints[2]; //S
        this.gridPoints[1] = data.gridPoints[3]; //E
        this.gridPoints[2] = data.gridPoints[1]; //W
        this.gridPoints[3] = data.gridPoints[0]; //N


        this.type = data.terrainType;

        this.price = data.price;

        //if not water
        if (this.type === TerrainType.grass) {
            this.z = data.gridPoints[2];

            var s = vkaria.sprites.getSprite(grass[self.getSlopeId().toString()]);
            sprite.setSprite(s);


        } else if (this.type === TerrainType.shore) {
            this.z = data.gridPoints[2];

            var s = vkaria.sprites.getSprite(shore[self.getSlopeId().toString()]);
            sprite.setSprite(s);
        } else {
            this.z = 0; //WATERLEVEL!!!

            sprite.setSprite(vkaria.sprites.getSprite(water["2222"]));
        }

        if (data.resource === ResourceCode.coal) {
            sprite.setSprite(vkaria.sprites.getSprite(resourcetile["coal"]));
        } else if (data.resource === ResourceCode.iron) {
            sprite.setSprite(vkaria.sprites.getSprite(resourcetile["iron"]));
        } else if (data.resource === ResourceCode.stone) {
            sprite.setSprite(vkaria.sprites.getSprite(resourcetile["stone"]));
        } else if (data.resource === ResourceCode.oil) {
            sprite.setSprite(vkaria.sprites.getSprite(resourcetile["oil"]));
        }

        transform.setPosition(
            this.x * engine.config.tileSize,
            this.z * engine.config.tileZStep,
            this.y * engine.config.tileSize
        );


        this.dispatchEvent(this.events.dataSet, this);

        //vkaria.pathman.addNode(this.node);
    };

    //TODO: If each point z pos would be relative to lowest point, instead of x0-y0 point, then each point could be described in 0-2 int.
    TileScript.prototype.getSlopeId = function () {
        if (this.tileType === 0)return 2222;
        var gridPoints = this.gridPoints,
            z0 = gridPoints[0];
        return 2000 + (gridPoints[1] - z0 + 2) * 100 + (gridPoints[2] - z0 + 2) * 10 + (gridPoints[3] - z0 + 2);
    };

    /**
     *
     * @param {float} subx Tile x subcoordinate [-0.5;0.5]
     * @param {float} suby Tile y subcoordinate [-0.5;0.5]
     * @returns {number}
     */
    TileScript.prototype.subpositionZ = function (subx, suby) {
        //normalize the values, because
        //interpolation is done for 0 - 1 interval
        subx += 0.5;
        suby += 0.5;

        //bilinear interpolation
        var x00 = this.gridPoints[0],
            x01 = this.gridPoints[1],
            x10 = this.gridPoints[3],
            x11 = this.gridPoints[2],
            i1 = x00 * (1 - subx) + x01 * subx,
            i2 = x10 * (1 - subx) + x11 * subx;

        return ((i1 * suby + i2 * (1 - suby)) - this.z) * engine.config.tileZStep;
    };

    return TileScript;
});
