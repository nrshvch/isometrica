define(function(require){
    var BuildingCode = require("core/buildingcode");

    /*
     Для точного перемещения внутри ячейки патфайндер запрашивает
     вэйпойтны от входа, до выхода.
     Входы и выходы обозначаются цыфрами.
     Цыфры мапятса на направления (северо-запад итп)
     При вращении здания цыфры мапятся по новой.
     Вэйпойтны должны указываться в локальных координатах, и при вразении объекта
     также должен вращаться транфсформ объекта.
     */


    //paths are identified by entrance and exit ID. Both IDs form an ID of path.
    //Id of path is 6 bits long, where:
    //first(most-right) 2 bits - entrance id
    //second 2 bits - exit id
    //next 1 bit - flag that identicates that path lead from entrance
    //last 1 bit - flag that identicated that path lead to exit

    var Direction = {
        NE: 0, // 1 0
        SE: 1, // 0 -1
        SW: 2, // -1 0
        NW: 3 // 0 1
    };

   var w = {};

    //The key for every waypoint path is defined as 16bit number, where first 8 bits are entrance gate index
    //and last 8 bits are exit gate index. 0 index is reserved to indicated that path finishes or starts here.
    //Thats why each gate index should increased by 1.

    //generic road
    var road = w[BuildingCode.road] = {};

    road[(Direction.NE + 1) | (Direction.SE + 1) << 8] = [[12,0,8],[-8,0,8],[-8,0,-12]];
    road[(Direction.NE + 1) | (Direction.SW + 1) << 8] = [[12,0,8],[-12,0,8]];
    road[(Direction.NE + 1) | (Direction.NW + 1) << 8] = [[12,0,8],[8,0,8],[8,0,12]];

    road[(Direction.SE + 1) | (Direction.NE + 1) << 8] = [[8,0,-12],[8,0,-8],[12,0,-8]];
    road[(Direction.SE + 1) | (Direction.SW + 1) << 8] = [[8,0,-12],[8,0,8],[-12,0,8]];
    road[(Direction.SE + 1) | (Direction.NW + 1) << 8] = [[8,0,-12],[8,0,12]];

    road[(Direction.SW + 1) | (Direction.NE + 1) << 8] = [[-12,0,-8],[12,0,-8]];
    road[(Direction.SW + 1) | (Direction.SE + 1) << 8] = [[-12,0,-8],[-8,0,-8], [-8,0,-12]];
    road[(Direction.SW + 1) | (Direction.NW + 1) << 8] = [[-12,0,-8],[8,0,-8],[8,0,12]];

    road[(Direction.NW + 1) | (Direction.NE + 1) << 8] = [[-8,0,12],[-8,0,-8],[12,0,-8]];
    road[(Direction.NW + 1) | (Direction.SE + 1) << 8] = [[-8,0,12],[-8,0,-12]];
    road[(Direction.NW + 1) | (Direction.SW + 1) << 8] = [[-8,0,12],[-8,0,8],[-12,0,8]];

    road[Direction.NE + 1] = [[0,0,0]];
    road[Direction.SE + 1] = [[0,0,0]];
    road[Direction.SW + 1] = [[0,0,0]];
    road[Direction.NW + 1] = [[0,0,0]];

    road[(Direction.NE + 1) << 8] = [[0,0,0]];
    road[(Direction.SE + 1) << 8] = [[0,0,0]];
    road[(Direction.SW + 1) << 8] = [[0,0,0]];
    road[(Direction.NW + 1) << 8] = [[0,0,0]];


    //mobile house
    var house0 = w[BuildingCode.house0] = {};

    house0[1] = [[0,0,0]];
    house0[2] = [[0,0,0]];
    house0[3] = [[0,0,0]];
    house0[4] = [[0,0,0]];
    house0[1 << 8] = [[0,0,0]];
    house0[2 << 8] = [[0,0,0]];
    house0[3 << 8] = [[0,0,0]];
    house0[4 << 8] = [[0,0,0]];





    return w;
});
