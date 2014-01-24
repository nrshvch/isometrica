//TODO: rename to serializer
define(function () {
    var mapper = {};

    mapper.tile = function (tile) {
        return {
            x: tile.x,
            y: tile.y,
            terrainType: tile.terrainType,
            price: tile.getPrice(),
            gridPoints: tile.gridPoints,
            resource: tile.resource
        }
    }

    mapper.tiles = function (tiles) {
        var len = tiles.length,
            tiles2 = [],
            i;

        for (i = 0; i < len; i++) {
            if(tiles[i])
                tiles2.push(mapper.tile(tiles[i]));
        }

        return tiles2;
    }

    mapper.building = function(building){
        return {
            x: building.tile.x,
            y: building.tile.y,
            state: building.state,
            subPosX: building.subPosX,
            subPosY: building.subPosY,
            rotation: building.rotation,
            buildingCode: building.data.buildingCode
        }
    }

    mapper.buildings = function(buildings){
        var len = buildings.length,
            objs = new Array(buildings.length),
            i;

        for (i = 0; i < len; i++) {
            objs[i] = mapper.building(buildings[i]);
        }

        return objs;
    }

    mapper.city = function(city){
        var data = {
            name: city.name,
            x: city.position.x,
            y: city.position.y,
            resources: city.resources,
            resourceProduce: city.resourceProduce,
            resourceDemand: city.resourceDemand,
            maintenanceCost: city.maintenanceCost
        }
        return data;
    }

    return mapper;
})
