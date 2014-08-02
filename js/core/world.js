//TODO make TIME. With real time, e.g. real seconds since game started.

define(function (require) {
    var Simplex = require("./vendor/simplex-noise"),
        Events = require("lib/events"),
        Terrain = require("./terrain"),
        Buildings = require("./buildings"),
        City = require("./city"),
        ResourceCode = require("lib/resourcecode"),
        ResourceMarket = require("./resourceMarket"),
        VTime = require("./virtualtime"),
        AmbientService = require("./ambient"),
        RatingsMan = require("./tileratingsmanager"),
        Config = require("./config"),
        InfluenceMap = require("./influencemap");

    function World() {
        this.simplex = new Simplex([151, 160, 137, 91, 90, 15,
            131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
            190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
            88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
            77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
            102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
            135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
            5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
            223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
            129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
            251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
            49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
            138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180]);

        //passing function generates Z value for grid points.
        //This realisation is using many octaves, to have realistic view of terrain contour, coastline.
        //but because at the same time we need it to have smooth slope <45Deg, there's a drawback - terrain is too flat
        //height varies only from -16 to 16. can't afford anymore, because then there will be cliffs.
        //it would be good to invent something better then this approach, with smooth slopes  and different landscape
        //UPDATE: now, when world size is limited, we can afford any height values. Because we always can iterate over and smooth them.

        this.time = new VTime(this);
        this.terrain = new Terrain(this);
        this.buildMan = this.buildings = new Buildings(this);
        this.resourceMarket = new ResourceMarket(this);
        this.ambientService = new AmbientService(this);

        this.ratingsman = new RatingsMan(this);

        this.influenceMap = new InfluenceMap(this);

        var self = this;
        setInterval(function(){
            Events.fire(self, self.events.tick, self, null);
        }, Config.tickDelay);
    }

    World.prototype.events = {
        cityEstablished: 0,
        tick: 1
    };

    /**
     * @private
     * @type {Simplex}
     */
    World.prototype.simplex = null;

    /**
     * Current game time
     * @type {null}
     */
    World.prototype.now = null;

    World.prototype.terrain = null;
    World.prototype.buildings = null;
    World.prototype.size = 128;

    World.prototype.start = function () {
        //this.terrain.init();

        this.time.start();
        this.ratingsman.init();
        this.ambientService.init();
    };



    World.prototype.forestDistribution = function (x, y) {
        return this.simplex.noise2D(x, y) > 0;
    };

    World.prototype.stoneDistribution = function (x, y) {
        var simplex = this.simplex,
            d;

        d = simplex.noise2D(x / 8, y / 8);
        d *= simplex.noise2D(x / 24, y / 24);
        return d * 64 > 40;
    };

    World.prototype.coalDistribution = function (x, y) {
        var simplex = this.simplex,
            d;

        d = simplex.noise2D(y / 8, x / 8);
        d *= simplex.noise2D(y / 16, x / 16);
        return d * 64 > 40;
    };


    World.prototype.ironDistribution = function (x, y) {
        var simplex = this.simplex,
            d;

        //d = simplex.noise2D(x / 8, y / 8 );
        //d *= simplex.noise2D(x / 64, y / 64);

        //return simplex.noise2D(x / 64, y / 64 ) * 64 > 50;

        if (simplex.noise2D(x / 64, y / 64) * 64 > 50)
            return simplex.noise2D(x / 8, y / 8) * 64 > 50;
    };

    World.prototype.oilDistribution = function (x, y) {
        var simplex = this.simplex,
            d;

        //d = simplex.noise2D(x / 8, y / 8 );
        //d *= simplex.noise2D(x / 64, y / 64);

        //return simplex.noise2D(x / 64, y / 64 ) * 64 > 50;

        if (simplex.noise2D(y / 64, x / 64) * 64 > 50)
            return simplex.noise2D(y / 8, x / 8) * 64 > 50;
    };

    World.prototype.resourceDistribution = function (x, y) {
        if (this.stoneDistribution(x, y))
            return ResourceCode.stone;
        else if (this.coalDistribution(x, y))
            return ResourceCode.coal;
        else if (this.ironDistribution(x, y))
            return ResourceCode.iron;
        else if (this.oilDistribution(x, y))
            return ResourceCode.oil;
        else
            return null;
    };

    World.prototype.establishCity = function (x,y, name) {
        if (!this.city) {
            this.city = new City(this);
            this.city.world = this;
            this.city.name = name;
            this.city.x = x;
            this.city.y = y;

            Events.fire(this, this.events.cityEstablished, this.city);
            //this.eventManager.dispatchEvent(this.events.cityEstablished, this, this.city);
            return this.city;
        }
        return false;
    };

    World.prototype.new = function () {

    };

    World.prototype.save = function () {
        var save = {
            //terrain: this.terrain.save(),
            city: (this.city && this.city.save()) || null,
            buildings: this.buildings.save(),
            //tiles: this.tiles.save(),
            time: this.time.save()
        };

        console.log(save);

        return save;
    };

    World.prototype.load = function (savedGameState) {
        this.time.load(savedGameState.time);
        //this.terrain.load(savedGameState.terrain);
        this.buildings.load(savedGameState.buildings);
        //this.tiles.load(savedGameState.tiles);
        if (savedGameState.city) {
            this.city = new City(this);
            this.city.load(savedGameState.city);
            Events.fire(this, this.events.cityEstablished, this, null);
            //this.eventManager.dispatchEvent(this.events.cityEstablished, this, this.city);
        }
    };

    return World;
});
