/**
 * The city a brand new player starts on - in the city builder, and in the
 * delivery game, whose streets it is.
 *
 * It is a save like any other, and it is opened the way a save is: under a
 * fresh id of its own, so the moment the player changes anything it becomes
 * their own city in their own storage row, leaving this one untouched.
 *
 * To fill it in, build the city in the city builder and download it from
 * the city screen ("Download as the initial city"), then save the file over
 * this one. The "id" and "savedAt" fields are ignored.
 *
 * null means there is nothing to start from: the game opens on a blank world
 * and the player founds their city themselves.
 *
 * @type {Object|null}
 */
var InitialCity = {
  version: 1,
  id: "KrbnBX",
  savedAt: 1791928577896,
  time: 554041200000,
  terrain: {
    points: [
      [1447712348, 2],
      [1447777884, 2],
      [1447843407, 1],
      [1447843420, 2],
      [1447908936, 1],
      [1447908942, 1],
      [1447908943, 1],
      [1447974490, 2],
      [1448040002, 2],
      [1448040003, 2],
      [1448040023, 3],
      [1448105538, 2],
      [1448105539, 2],
      [1448171074, 2],
      [1448171075, 2],
      [1448236610, 2],
      [1448236611, 2],
      [1448236648, 3],
      [1448302146, 2],
      [1448302154, 2],
      [1448302155, 2],
      [1448302156, 2],
      [1448367689, 2],
      [1448367690, 2],
      [1448367691, 2],
      [1448367692, 2],
      [1448433228, 2],
      [1448433229, 2],
      [1448433230, 2],
      [1448498764, 2],
      [1448498765, 2],
      [1448498766, 2],
      [1448629843, 3],
      [1448695379, 3],
      [1448695380, 3],
      [1448695381, 3],
      [1448695382, 3],
    ],
    cleared: [
      1447581248, 1447581261, 1447646783, 1447646784, 1447646785, 1447646786,
      1447646787, 1447646788, 1447646789, 1447646790, 1447646791, 1447646811,
      1447646812, 1447712319, 1447712320, 1447712321, 1447712322, 1447712327,
      1447712328, 1447712330, 1447712331, 1447712332, 1447712333, 1447712345,
      1447712347, 1447712348, 1447777856, 1447777857, 1447777858, 1447777863,
      1447777864, 1447777870, 1447777871, 1447777883, 1447777884, 1447777888,
      1447777889, 1447777890, 1447777891, 1447777892, 1447777893, 1447777894,
      1447777895, 1447777896, 1447777897, 1447843392, 1447843393, 1447843394,
      1447843399, 1447843400, 1447843401, 1447843404, 1447843405, 1447843406,
      1447843407, 1447843408, 1447843419, 1447843420, 1447843424, 1447843426,
      1447843428, 1447843429, 1447843431, 1447908928, 1447908929, 1447908930,
      1447908931, 1447908932, 1447908933, 1447908934, 1447908935, 1447908936,
      1447908937, 1447908938, 1447908939, 1447908940, 1447908941, 1447908942,
      1447908943, 1447908944, 1447908952, 1447908953, 1447908954, 1447908960,
      1447908961, 1447908962, 1447908963, 1447908964, 1447908965, 1447908966,
      1447908967, 1447974458, 1447974465, 1447974466, 1447974467, 1447974468,
      1447974469, 1447974470, 1447974472, 1447974474, 1447974475, 1447974476,
      1447974477, 1447974479, 1447974481, 1447974482, 1447974483, 1447974484,
      1447974486, 1447974487, 1447974488, 1447974489, 1447974490, 1447974497,
      1447974498, 1448040001, 1448040002, 1448040003, 1448040004, 1448040005,
      1448040006, 1448040008, 1448040010, 1448040011, 1448040012, 1448040013,
      1448040015, 1448040017, 1448040018, 1448040019, 1448040020, 1448040021,
      1448040022, 1448040023, 1448040024, 1448040025, 1448040026, 1448040034,
      1448105537, 1448105538, 1448105539, 1448105541, 1448105542, 1448105544,
      1448105545, 1448105546, 1448105547, 1448105548, 1448105549, 1448105556,
      1448105559, 1448105560, 1448105561, 1448105562, 1448105569, 1448105570,
      1448171073, 1448171074, 1448171075, 1448171077, 1448171080, 1448171081,
      1448171082, 1448171083, 1448171085, 1448171088, 1448171089, 1448171090,
      1448171091, 1448171092, 1448171093, 1448171094, 1448171095, 1448171096,
      1448171097, 1448171098, 1448171099, 1448171100, 1448171101, 1448171102,
      1448171103, 1448171104, 1448171106, 1448171111, 1448171112, 1448236609,
      1448236610, 1448236611, 1448236613, 1448236616, 1448236617, 1448236618,
      1448236619, 1448236620, 1448236623, 1448236624, 1448236627, 1448236630,
      1448236633, 1448236635, 1448236647, 1448236648, 1448302145, 1448302146,
      1448302149, 1448302152, 1448302153, 1448302154, 1448302155, 1448302156,
      1448302157, 1448302159, 1448302160, 1448302161, 1448302162, 1448302165,
      1448302166, 1448302169, 1448367688, 1448367689, 1448367690, 1448367691,
      1448367692, 1448367693, 1448367694, 1448367695, 1448367696, 1448367697,
      1448367699, 1448367701, 1448367702, 1448433212, 1448433227, 1448433228,
      1448433229, 1448433230, 1448433231, 1448433232, 1448433233, 1448433235,
      1448498763, 1448498764, 1448498765, 1448498766, 1448564306, 1448564307,
      1448564308, 1448564309, 1448564310, 1448629837, 1448629838, 1448629842,
      1448629843, 1448629844, 1448629845, 1448629846, 1448695378, 1448695379,
      1448695380, 1448695381, 1448695382,
    ],
  },
  city: {
    name: "Miniville",
    tile: 1448171087,
    resources: {
      money: 19579723.83630973,
    },
    population: 2918.4688727787666,
    area: [
      [0, 0],
      [-1, 0],
      [0, -1],
      [0, -2],
      [-1, -1],
      [-2, 0],
      [-1, -2],
      [0, 1],
      [1, 0],
      [-1, 1],
      [1, 1],
      [2, 0],
      [-1, -3],
      [0, -3],
      [-2, -2],
      [2, -1],
      [2, 1],
      [-2, -1],
      [-3, -1],
      [-2, 1],
      [-1, 2],
      [1, -1],
      [1, -2],
      [2, -2],
      [-3, -2],
      [-3, 0],
      [-3, 1],
      [-2, 2],
      [-3, 2],
      [3, 0],
      [3, 1],
      [3, -2],
      [4, -2],
      [5, -2],
      [4, -3],
      [5, -3],
      [6, -2],
    ],
    research: {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
    },
    buildings: [
      {
        code: 4,
        tile: 1448105550,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105551,
        rotation: 0,
        look: {
          stop: true,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105552,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105553,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105554,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105555,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908942,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447974478,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448040014,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171086,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448236622,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448302158,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105543,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447974471,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448040007,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171079,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448236615,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447319111,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384647,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450183,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447515719,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447581255,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712334,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712335,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447777871,
        rotation: 0,
        look: null,
        surface: [1, 1, 2, 2],
      },
      {
        code: 4,
        tile: 1447843407,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908943,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447319118,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384654,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450190,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447515726,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447581262,
        rotation: 0,
        look: {
          stop: true,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646798,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384648,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384649,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384650,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384651,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384652,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384653,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4011,
        tile: 1447384655,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/stone/slate/flowers/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4011,
        tile: 1447450191,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/white/thatch/veg/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4011,
        tile: 1447515727,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/stone/thatch/well/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4011,
        tile: 1447450189,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/log/thatch/well/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4011,
        tile: 1447515725,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/ochre/tile/flowers/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447646799,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/hedge/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646797,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448302151,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367687,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367688,
        rotation: 0,
        look: null,
        surface: [2, 3, 2, 3],
      },
      {
        code: 4,
        tile: 1448367689,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448367690,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448367691,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448105531,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105532,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105533,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105534,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105535,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105536,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448171066,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448236602,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448302138,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448367674,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448433210,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646793,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646794,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646795,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646796,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646792,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450186,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447515722,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447581258,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712331,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447777867,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447843403,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447450184,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/narrow2/std/blue/gable/picket/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/narrow2/std/blue/gable/picket/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447450187,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/yellow/gable/hedge/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/yellow/gable/hedge/patio/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447581256,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/brick/hip/hedge/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/brick/hip/hedge/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447581259,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/cream/hip/picket/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/cream/hip/picket/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447515720,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/gable/railing/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/gable/railing/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447515723,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/railing/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/railing/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448171105,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447777898,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777899,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777900,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777901,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777902,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777903,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777904,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777905,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777906,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777907,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777908,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777909,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777910,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777911,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777912,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777913,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777914,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777915,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777916,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777917,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777918,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777919,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777920,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447777921,
        rotation: 0,
        look: null,
        surface: [4, 5, 4, 5],
      },
      {
        code: 4,
        tile: 1447777922,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777923,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777924,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777925,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4011,
        tile: 1447581263,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/cottage/std/white/tile/flowers/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448498768,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448433227,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498763,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498764,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498765,
        rotation: 0,
        look: {
          stop: true,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498766,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498767,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4112,
        tile: 1448564303,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/blue/gable/hedge/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/blue/gable/hedge/garden/0/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4112,
        tile: 1448564300,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/brick/gable/hedge/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/brick/gable/hedge/patio/0/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448564302,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4112,
        tile: 1448564304,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/narrow2/std/cream/hip/picket/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/narrow2/std/cream/hip/picket/patio/0/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498769,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498770,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 10,
        tile: 1448629838,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/watertower/brick/0/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1448629836,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/blue/gable/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/blue/gable/picket/1/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448564299,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448629835,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1448433225,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/gable/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/gable/hedge/1/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1448498761,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/yellow/gable/hedge/1/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1448564297,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/gable/railing/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/gable/railing/1/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1448629833,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/brick/gable/railing/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/brick/gable/railing/1/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 10,
        tile: 1447581261,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/watertower/steel/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448236632,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448302168,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448367704,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448433240,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498776,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498771,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498772,
        rotation: 0,
        look: {
          stop: true,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498773,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498774,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498775,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4121,
        tile: 1447253576,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/cream/hip/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/cream/hip/hedge/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447319112,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/brick/hip/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/brick/hip/picket/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447253578,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/hip/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/hip/picket/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447253579,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/hip/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/hip/hedge/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447253580,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/row21/std/cream/gable/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/row21/std/cream/gable/picket/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447188047,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/cream/gable/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/cream/gable/picket/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447253583,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/cream/gable/picket/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/cream/gable/picket/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4121,
        tile: 1447319119,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/wide/std/yellow/hip/hedge/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/wide/std/yellow/hip/hedge/1/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447188044,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/narrow2/std/cream/gable/hedge/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/narrow2/std/cream/gable/hedge/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447253581,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/yellow/gable/picket/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/yellow/gable/picket/patio/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188046,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447253582,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447253575,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447384645,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/yellow/hip/hedge/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/yellow/hip/hedge/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447384646,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/cream/gable/picket/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/cream/gable/picket/patio/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447515717,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/narrow2/std/brick/hip/picket/garden/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/narrow2/std/brick/hip/picket/garden/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447515718,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/deep/std/brick/gable/picket/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/deep/std/brick/gable/picket/patio/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4112,
        tile: 1447515715,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/narrow2/std/brick/gable/hedge/patio/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/narrow2/std/brick/gable/hedge/patio/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447319108,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384644,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450180,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447515716,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447581252,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 10,
        tile: 1447384656,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/watertower/stack/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 10,
        tile: 1447450179,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/watertower/brick/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448105530,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448498746,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 430,
        tile: 1448236633,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/start/yard",
                "flats/upper/sand/start/11",
                "flats/upper/sand/start/11",
                "flats/roof/sand/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/sand/end/yard",
                "flats/upper/sand/end/11",
                "flats/upper/sand/end/11",
                "flats/roof/sand/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448236630,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/start/yard",
                "flats/upper/mint/start/10",
                "flats/upper/mint/start/10",
                "flats/roof/mint/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/mint/end/yard",
                "flats/upper/mint/end/10",
                "flats/upper/mint/end/10",
                "flats/roof/mint/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448367701,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/01",
                "flats/upper/panel/start/01",
                "flats/roof/panel/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/01",
                "flats/upper/panel/end/01",
                "flats/roof/panel/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447777881,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447843417,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908953,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447974489,
        rotation: 0,
        look: null,
        surface: [2, 2, 3, 3],
      },
      {
        code: 1240,
        tile: 1447712343,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/emerald/start/yard",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/roof/emerald/start/2",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/emerald/end/yard",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/roof/emerald/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1447843418,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/start/yard",
                "flats/upper/sand/start/11",
                "flats/upper/sand/start/11",
                "flats/roof/sand/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/sand/end/yard",
                "flats/upper/sand/end/11",
                "flats/upper/sand/end/11",
                "flats/roof/sand/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1447712346,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/01",
                "flats/upper/panel/start/01",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/01",
                "flats/upper/panel/end/01",
                "flats/roof/panel/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1240,
        tile: 1447843415,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/teal/start/yard",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/roof/teal/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/teal/end/yard",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/roof/teal/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448564282,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448629818,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448695354,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448760890,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448826426,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448891962,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448957498,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449023034,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449088570,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449154106,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449219642,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449285178,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449350714,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1449416250,
        rotation: 0,
        look: null,
        surface: [1, 1, 2, 2],
      },
      {
        code: 4,
        tile: 1449481786,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449547322,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449612858,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449678394,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449743930,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449809466,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449875002,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449940538,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450006074,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450071610,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450137146,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450202682,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450268218,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450333754,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450399290,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450464826,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450530362,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450530363,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1450595899,
        rotation: 0,
        look: null,
        surface: [2, 2, 3, 3],
      },
      {
        code: 4,
        tile: 1450661435,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1450726971,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1450792507,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1450858043,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1450923579,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1450989115,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451054651,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451120187,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451185723,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451251259,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451316795,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451382331,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451316794,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1451382330,
        rotation: 0,
        look: null,
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447777926,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777927,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777928,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777929,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777930,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777931,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777932,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777933,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447777934,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447843470,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447909006,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447909007,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447909008,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447909009,
        rotation: 0,
        look: null,
        surface: [5, 4, 5, 4],
      },
      {
        code: 4,
        tile: 1447909010,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447909011,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447909012,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447909013,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447909014,
        rotation: 0,
        look: null,
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447909015,
        rotation: 0,
        look: null,
        surface: [4, 5, 4, 5],
      },
      {
        code: 4,
        tile: 1447909016,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447843480,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447843481,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 4,
        tile: 1447909017,
        rotation: 0,
        look: null,
        surface: [5, 5, 5, 5],
      },
      {
        code: 430,
        tile: 1448367705,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/11",
                "flats/upper/panel/start/11",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/11",
                "flats/upper/panel/end/11",
                "flats/roof/panel/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448498777,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/start/yard",
                "flats/upper/slate/start/00",
                "flats/upper/slate/start/00",
                "flats/roof/slate/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/slate/end/yard",
                "flats/upper/slate/end/00",
                "flats/upper/slate/end/00",
                "flats/roof/slate/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 1240,
        tile: 1448564311,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/azure/start/yard",
                "offices/upper/azure/start/ribbon",
                "offices/upper/azure/start/ribbon",
                "offices/upper/azure/start/ribbon",
                "offices/roof/azure/start/2",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/azure/end/yard",
                "offices/upper/azure/end/ribbon",
                "offices/upper/azure/end/ribbon",
                "offices/upper/azure/end/ribbon",
                "offices/roof/azure/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448564309,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/start/yard",
                "flats/upper/mint/start/00",
                "flats/upper/mint/start/00",
                "flats/roof/mint/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/mint/end/yard",
                "flats/upper/mint/end/00",
                "flats/upper/mint/end/00",
                "flats/roof/mint/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448564307,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/coral/start/yard",
                "flats/upper/coral/start/10",
                "flats/upper/coral/start/10",
                "flats/roof/coral/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/coral/end/yard",
                "flats/upper/coral/end/10",
                "flats/upper/coral/end/10",
                "flats/roof/coral/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 3011,
        tile: 1448171088,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/small/shed/cream/corner/red/board/0/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3022,
        tile: 1448171089,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: ["shops/bigbox/orange/stepped/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["shops/bigbox/orange/stepped/1/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/big/none"],
            },
            {
              x: 1,
              y: 0,
              parts: ["shops/parking/big/none"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367683,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367684,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367685,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367686,
        rotation: 0,
        look: null,
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447974464,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448040000,
        rotation: 0,
        look: null,
        surface: [1, 1, 1, 1],
      },
      {
        code: 7022,
        tile: 1447712324,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/market22/r/timber/tiles/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["oldtown/market22/r/timber/tiles/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/market22/r/timber/tiles/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["oldtown/market22/r/timber/tiles/1/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 7012,
        tile: 1447712323,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/lane12/r/warm/slate/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/lane12/r/warm/slate/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 7012,
        tile: 1447712326,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/lane12/r/timber/tiles/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/lane12/r/timber/tiles/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 7012,
        tile: 1447843395,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/yard12/l/pastel/slate/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/yard12/l/pastel/slate/0/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 7012,
        tile: 1447843397,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/yard12/r/warm/slate/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/yard12/r/warm/slate/0/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1448433221,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/start/yard",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/sand/end/yard",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1448564293,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/start/yard",
                "flats/upper/mint/start/10",
                "flats/upper/mint/start/10",
                "flats/roof/mint/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/mint/end/yard",
                "flats/upper/mint/end/10",
                "flats/upper/mint/end/10",
                "flats/roof/mint/end/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448433219,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/10",
                "flats/upper/sand/both/10",
                "flats/roof/sand/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448498755,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/11",
                "flats/upper/sand/both/11",
                "flats/roof/sand/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448564291,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/00",
                "flats/upper/sand/both/00",
                "flats/roof/sand/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448629827,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/10",
                "flats/upper/panel/both/10",
                "flats/roof/panel/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448367682,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448433218,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448433223,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 3, 3],
      },
      {
        code: 4,
        tile: 1448498754,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448498759,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448564290,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448564295,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448629826,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448629831,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 2, 2],
      },
      {
        code: 4,
        tile: 1448695362,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448695363,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448695364,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448695365,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448695366,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448695367,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 5012,
        tile: 1448433224,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/sports/1x2/1/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["parks/sports/1x2/1/0/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 5012,
        tile: 1448564296,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/garden/1x2/1/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["parks/garden/1x2/1/0/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 11,
        tile: 1448695369,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/1/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 5011,
        tile: 1447974488,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/sports/1x1/1/0/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 10,
        tile: 1447974487,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/watertower/brick/0/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447515732,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447515733,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447515734,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447515735,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447515736,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447515737,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447581268,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447581273,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447646804,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447646809,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712336,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 2, 1, 2],
      },
      {
        code: 4,
        tile: 1447712337,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712338,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712339,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712340,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712345,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2304,
        tile: 1447581269,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "offices/ground/bronze/start/street",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/roof/bronze/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "offices/ground/bronze/mid/street",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/roof/bronze/mid/0",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "offices/ground/bronze/end/street",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/roof/bronze/end/0",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2304,
        tile: 1447646805,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "offices/ground/teal/start/street",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/roof/teal/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "offices/ground/teal/mid/street",
                "offices/upper/teal/mid/grid",
                "offices/upper/teal/mid/grid",
                "offices/upper/teal/mid/grid",
                "offices/roof/teal/mid/1",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "offices/ground/teal/end/street",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/roof/teal/end/1",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3121,
        tile: 1447581272,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/small/gable/cream/double/amber/fascia/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["shops/small/gable/sage/corner/navy/fascia/0/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2226,
        tile: 1447777874,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/bronze/start/yard",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/roof/bronze/start/2",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "offices/ground/bronze/end/yard",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/roof/bronze/end/0",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["offices/yard/parking/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2226,
        tile: 1447777876,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/azure/start/yard",
                "offices/upper/azure/start/grid",
                "offices/upper/azure/start/grid",
                "offices/upper/azure/start/grid",
                "offices/upper/azure/start/grid",
                "offices/upper/azure/start/grid",
                "offices/roof/azure/start/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "offices/ground/azure/end/yard",
                "offices/upper/azure/end/grid",
                "offices/upper/azure/end/grid",
                "offices/upper/azure/end/grid",
                "offices/upper/azure/end/grid",
                "offices/upper/azure/end/grid",
                "offices/roof/azure/end/2",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712341,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447712342,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1447777878,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/azure/both/yard",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/roof/azure/both/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 11,
        tile: 1447384666,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/pumpstation/steel/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["utilities/pumpstation/steel/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["utilities/pumpstation/steel/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["utilities/pumpstation/steel/1/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 5011,
        tile: 1447712321,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/sports/1x1/1/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 5011,
        tile: 1447777857,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/garden/1x1/1/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 5011,
        tile: 1447843393,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/city/1x1/0/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447253572,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384642,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447384643,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450176,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450177,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447450178,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447515712,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447581248,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 3022,
        tile: 1447515713,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: ["shops/bigbox/greenstripes/flat/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["shops/bigbox/greenstripes/flat/1/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/big/none"],
            },
            {
              x: 1,
              y: 0,
              parts: ["shops/parking/big/none"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 2126,
        tile: 1447974465,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/teal/both/yard",
                "offices/upper/teal/both/grid",
                "offices/upper/teal/both/grid",
                "offices/upper/teal/both/grid",
                "offices/upper/teal/both/grid",
                "offices/upper/teal/both/grid",
                "offices/roof/teal/both/0",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/plaza/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1447974466,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/teal/both/yard",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/roof/teal/both/2",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1447974467,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/emerald/both/yard",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/roof/emerald/both/2",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1447974468,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/emerald/both/yard",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/upper/emerald/both/grid",
                "offices/roof/emerald/both/0",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1448040004,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/azure/both/yard",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/roof/azure/both/2",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 2126,
        tile: 1448105540,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/azure/both/yard",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/upper/azure/both/ribbon",
                "offices/roof/azure/both/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/plaza/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171073,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171074,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171075,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171076,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171077,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448171078,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1240,
        tile: 1448236609,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/teal/start/yard",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/upper/teal/start/grid",
                "offices/roof/teal/start/2",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/teal/end/yard",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/upper/teal/end/grid",
                "offices/roof/teal/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1240,
        tile: 1448236611,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/emerald/start/yard",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/roof/emerald/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/emerald/end/yard",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/roof/emerald/end/2",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1240,
        tile: 1448236613,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/teal/start/yard",
                "offices/upper/teal/start/ribbon",
                "offices/upper/teal/start/ribbon",
                "offices/upper/teal/start/ribbon",
                "offices/roof/teal/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/teal/end/yard",
                "offices/upper/teal/end/ribbon",
                "offices/upper/teal/end/ribbon",
                "offices/upper/teal/end/ribbon",
                "offices/roof/teal/end/2",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447646786,
        rotation: 0,
        look: {
          material: "cobble",
          way: 3,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712322,
        rotation: 0,
        look: {
          material: "cobble",
          way: 3,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447777858,
        rotation: 0,
        look: {
          material: "cobble",
          way: 3,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447843394,
        rotation: 0,
        look: {
          material: "cobble",
          way: 3,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447908928,
        rotation: 0,
        look: {
          material: "cobble",
          way: 0,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447908929,
        rotation: 0,
        look: {
          material: "cobble",
          way: 0,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447908930,
        rotation: 0,
        look: {
          material: "cobble",
          way: 3,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646784,
        rotation: 0,
        look: {
          material: "cobble",
          way: 1,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646785,
        rotation: 0,
        look: {
          material: "cobble",
          way: 2,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712320,
        rotation: 0,
        look: {
          material: "cobble",
          way: 1,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447777856,
        rotation: 0,
        look: {
          material: "cobble",
          way: 1,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447843392,
        rotation: 0,
        look: {
          material: "cobble",
          way: 1,
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646787,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646788,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646789,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646790,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447646791,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447712327,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447777863,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447843399,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 1, 2, 2],
      },
      {
        code: 4,
        tile: 1447908931,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [1, 2, 1, 2],
      },
      {
        code: 4,
        tile: 1447908932,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908933,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908934,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908935,
        rotation: 0,
        look: {
          material: "cobble",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448760898,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448760903,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448826434,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448826439,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448891970,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448891975,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448957506,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448957511,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [2, 2, 3, 3],
      },
      {
        code: 4,
        tile: 1449023042,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449023043,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449023044,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449023045,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1449023046,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 3, 2, 3],
      },
      {
        code: 4,
        tile: 1449023047,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 430,
        tile: 1448760899,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/start/yard",
                "flats/upper/slate/start/01",
                "flats/upper/slate/start/01",
                "flats/roof/slate/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/slate/end/yard",
                "flats/upper/slate/end/01",
                "flats/upper/slate/end/01",
                "flats/roof/slate/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1448891971,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/start/yard",
                "flats/upper/slate/start/10",
                "flats/upper/slate/start/10",
                "flats/roof/slate/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/slate/end/yard",
                "flats/upper/slate/end/10",
                "flats/upper/slate/end/10",
                "flats/roof/slate/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1448760901,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/coral/start/yard",
                "flats/upper/coral/start/01",
                "flats/upper/coral/start/01",
                "flats/roof/coral/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/coral/end/yard",
                "flats/upper/coral/end/01",
                "flats/upper/coral/end/01",
                "flats/roof/coral/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 430,
        tile: 1448891973,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/start/yard",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/sand/end/yard",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447122506,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122507,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122508,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122509,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122510,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122511,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122512,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122513,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122514,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122515,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122516,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447122517,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188037,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188038,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188039,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188040,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188041,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447188042,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1447253573,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1448367694,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 3, 3],
      },
      {
        code: 4,
        tile: 1448433230,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 2315,
        tile: 1447712329,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/bronze/start/yard",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/roof/bronze/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "offices/ground/bronze/mid/yard",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/roof/bronze/mid/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
            {
              x: 2,
              y: 1,
              parts: [
                "offices/ground/bronze/end/yard",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/roof/bronze/end/0",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: ["offices/yard/parking/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 2304,
        tile: 1447712328,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "offices/ground/bronze/start/street",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/upper/bronze/start/grid",
                "offices/roof/bronze/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "offices/ground/bronze/mid/street",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/upper/bronze/mid/grid",
                "offices/roof/bronze/mid/0",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "offices/ground/bronze/end/street",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/upper/bronze/end/grid",
                "offices/roof/bronze/end/2",
              ],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 2226,
        tile: 1447777868,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "offices/ground/emerald/start/yard",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/upper/emerald/start/grid",
                "offices/roof/emerald/start/0",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/plaza/0"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "offices/ground/emerald/end/yard",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/upper/emerald/end/grid",
                "offices/roof/emerald/end/0",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["offices/yard/parking/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["offices/yard/plaza/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 2204,
        tile: 1447712332,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "offices/ground/emerald/start/street",
                "offices/upper/emerald/start/ribbon",
                "offices/upper/emerald/start/ribbon",
                "offices/upper/emerald/start/ribbon",
                "offices/roof/emerald/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "offices/ground/emerald/end/street",
                "offices/upper/emerald/end/ribbon",
                "offices/upper/emerald/end/ribbon",
                "offices/upper/emerald/end/ribbon",
                "offices/roof/emerald/end/0",
              ],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 3323,
        tile: 1447974472,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/openmkt23/mixed/cobbles/rows/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["shops/openmkt23/mixed/cobbles/rows/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["shops/openmkt23/mixed/cobbles/rows/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["shops/openmkt23/mixed/cobbles/rows/1/1"],
            },
            {
              x: 0,
              y: 2,
              parts: ["shops/openmkt23/mixed/cobbles/rows/0/2"],
            },
            {
              x: 1,
              y: 2,
              parts: ["shops/openmkt23/mixed/cobbles/rows/1/2"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3113,
        tile: 1447974475,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/big/store-brick"],
            },
            {
              x: 0,
              y: 1,
              parts: ["shops/parking/small/none"],
            },
            {
              x: 0,
              y: 2,
              parts: ["shops/store/brick/piers/red/0/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3113,
        tile: 1448040011,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/big/none"],
            },
            {
              x: 0,
              y: 1,
              parts: ["shops/parking/small/none"],
            },
            {
              x: 0,
              y: 2,
              parts: ["shops/small/shed/cream/corner/amber/fascia/0/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448171084,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/both/yard",
                "flats/upper/slate/both/10",
                "flats/upper/slate/both/10",
                "flats/roof/slate/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448236620,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/00",
                "flats/upper/mint/both/00",
                "flats/roof/mint/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448302156,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/00",
                "flats/upper/sand/both/00",
                "flats/roof/sand/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448367692,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/00",
                "flats/upper/sand/both/00",
                "flats/roof/sand/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 230,
        tile: 1448433228,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/01",
                "flats/upper/panel/both/01",
                "flats/roof/panel/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 840,
        tile: 1448171080,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/11",
                "flats/upper/panel/start/11",
                "flats/upper/panel/start/11",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["flats/yard/playground/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/11",
                "flats/upper/panel/end/11",
                "flats/upper/panel/end/11",
                "flats/roof/panel/end/0",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 840,
        tile: 1448171082,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "flats/ground/mint/start/yard",
                "flats/upper/mint/start/11",
                "flats/upper/mint/start/11",
                "flats/upper/mint/start/11",
                "flats/roof/mint/start/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["flats/yard/playground/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "flats/ground/mint/end/yard",
                "flats/upper/mint/end/11",
                "flats/upper/mint/end/11",
                "flats/upper/mint/end/11",
                "flats/roof/mint/end/1",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908936,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908937,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908938,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908939,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908940,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447908941,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105544,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105545,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105546,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105547,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105548,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105549,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448040023,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040024,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040025,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448105561,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171095,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171096,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171097,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 3,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448105559,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 1,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448105556,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1448105557,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 3, 2, 3],
      },
      {
        code: 4,
        tile: 1448105558,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 840,
        tile: 1448236635,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/10",
                "flats/upper/panel/start/10",
                "flats/upper/panel/start/10",
                "flats/roof/panel/start/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/10",
                "flats/upper/panel/end/10",
                "flats/upper/panel/end/10",
                "flats/roof/panel/end/1",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["flats/yard/playground/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 840,
        tile: 1448367707,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "flats/ground/coral/start/yard",
                "flats/upper/coral/start/00",
                "flats/upper/coral/start/00",
                "flats/upper/coral/start/00",
                "flats/roof/coral/start/1",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "flats/ground/coral/end/yard",
                "flats/upper/coral/end/00",
                "flats/upper/coral/end/00",
                "flats/upper/coral/end/00",
                "flats/roof/coral/end/1",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["flats/yard/lawn/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 840,
        tile: 1448498779,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 2,
              parts: [
                "flats/ground/panel/start/yard",
                "flats/upper/panel/start/01",
                "flats/upper/panel/start/01",
                "flats/upper/panel/start/01",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 0,
              y: 1,
              parts: ["flats/yard/lawn/0"],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
            {
              x: 1,
              y: 2,
              parts: [
                "flats/ground/panel/end/yard",
                "flats/upper/panel/end/01",
                "flats/upper/panel/end/01",
                "flats/upper/panel/end/01",
                "flats/roof/panel/end/1",
              ],
            },
            {
              x: 1,
              y: 1,
              parts: ["flats/yard/playground/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [4, 4, 4, 4],
      },
      {
        code: 640,
        tile: 1448236639,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/coral/start/yard",
                "flats/upper/coral/start/00",
                "flats/upper/coral/start/00",
                "flats/upper/coral/start/00",
                "flats/roof/coral/start/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/coral/mid/yard",
                "flats/upper/coral/mid/00",
                "flats/upper/coral/mid/00",
                "flats/upper/coral/mid/00",
                "flats/roof/coral/mid/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
            {
              x: 2,
              y: 1,
              parts: [
                "flats/ground/coral/end/yard",
                "flats/upper/coral/end/00",
                "flats/upper/coral/end/00",
                "flats/upper/coral/end/00",
                "flats/roof/coral/end/0",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 640,
        tile: 1448433247,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/start/yard",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
            {
              x: 1,
              y: 1,
              parts: [
                "flats/ground/sand/mid/yard",
                "flats/upper/sand/mid/10",
                "flats/upper/sand/mid/10",
                "flats/upper/sand/mid/10",
                "flats/roof/sand/mid/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
            {
              x: 2,
              y: 1,
              parts: [
                "flats/ground/sand/end/yard",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/1",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: ["flats/yard/parking/1"],
            },
          ],
        },
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1448236638,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448302174,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448367710,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448433246,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448498782,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448564318,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 4, 4],
      },
      {
        code: 11,
        tile: 1448236628,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/1/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 530,
        tile: 1448302163,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/panel/start/street",
                "flats/upper/panel/start/00",
                "flats/upper/panel/start/00",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/panel/mid/street",
                "flats/upper/panel/mid/00",
                "flats/upper/panel/mid/00",
                "flats/roof/panel/mid/1",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "flats/ground/panel/end/street",
                "flats/upper/panel/end/00",
                "flats/upper/panel/end/00",
                "flats/roof/panel/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 530,
        tile: 1448302162,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/coral/start/street",
                "flats/upper/coral/start/10",
                "flats/upper/coral/start/10",
                "flats/roof/coral/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/coral/mid/street",
                "flats/upper/coral/mid/10",
                "flats/upper/coral/mid/10",
                "flats/roof/coral/mid/1",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "flats/ground/coral/end/street",
                "flats/upper/coral/end/10",
                "flats/upper/coral/end/10",
                "flats/roof/coral/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 530,
        tile: 1448302161,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/slate/start/street",
                "flats/upper/slate/start/11",
                "flats/upper/slate/start/11",
                "flats/roof/slate/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/slate/mid/street",
                "flats/upper/slate/mid/11",
                "flats/upper/slate/mid/11",
                "flats/roof/slate/mid/0",
              ],
            },
            {
              x: 2,
              y: 0,
              parts: [
                "flats/ground/slate/end/street",
                "flats/upper/slate/end/11",
                "flats/upper/slate/end/11",
                "flats/roof/slate/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1448302159,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/coral/start/street",
                "flats/upper/coral/start/11",
                "flats/upper/coral/start/11",
                "flats/roof/coral/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/coral/end/street",
                "flats/upper/coral/end/11",
                "flats/upper/coral/end/11",
                "flats/roof/coral/end/0",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 330,
        tile: 1448367695,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/sand/start/street",
                "flats/upper/sand/start/11",
                "flats/upper/sand/start/11",
                "flats/roof/sand/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/sand/end/street",
                "flats/upper/sand/end/11",
                "flats/upper/sand/end/11",
                "flats/roof/sand/end/1",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 330,
        tile: 1448433231,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/coral/start/street",
                "flats/upper/coral/start/01",
                "flats/upper/coral/start/01",
                "flats/roof/coral/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/coral/end/street",
                "flats/upper/coral/end/01",
                "flats/upper/coral/end/01",
                "flats/roof/coral/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 3312,
        tile: 1448171091,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/covmkt12/tiles/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["shops/covmkt12/tiles/0/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 5011,
        tile: 1448171087,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/sports/1x1/1/0/0"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3231,
        tile: 1448171092,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/bigbox31/blue/flat/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["shops/bigbox31/blue/flat/1/0"],
            },
            {
              x: 2,
              y: 0,
              parts: ["shops/bigbox31/blue/flat/2/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1448367700,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/11",
                "flats/upper/sand/both/11",
                "flats/roof/sand/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 3012,
        tile: 1448236623,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: ["shops/store/blue/glass/red/0/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/small/none"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1130,
        tile: 1447777872,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/teal/both/yard",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/roof/teal/both/2",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1130,
        tile: 1447843408,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/teal/both/yard",
                "offices/upper/teal/both/ribbon",
                "offices/upper/teal/both/ribbon",
                "offices/roof/teal/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 1130,
        tile: 1447908944,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "offices/ground/bronze/both/yard",
                "offices/upper/bronze/both/grid",
                "offices/upper/bronze/both/grid",
                "offices/roof/bronze/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["offices/yard/parking/1"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 5023,
        tile: 1447974479,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/garden/2x3/1/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["parks/garden/2x3/1/0/1"],
            },
            {
              x: 0,
              y: 2,
              parts: ["parks/garden/2x3/1/0/2"],
            },
            {
              x: 1,
              y: 0,
              parts: ["parks/garden/2x3/1/1/0"],
            },
            {
              x: 1,
              y: 1,
              parts: ["parks/garden/2x3/1/1/1"],
            },
            {
              x: 1,
              y: 2,
              parts: ["parks/garden/2x3/1/1/2"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 5023,
        tile: 1447974482,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/city/2x3/0/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["parks/city/2x3/0/0/1"],
            },
            {
              x: 0,
              y: 2,
              parts: ["parks/city/2x3/0/0/2"],
            },
            {
              x: 1,
              y: 0,
              parts: ["parks/city/2x3/0/1/0"],
            },
            {
              x: 1,
              y: 1,
              parts: ["parks/city/2x3/0/1/1"],
            },
            {
              x: 1,
              y: 2,
              parts: ["parks/city/2x3/0/1/2"],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 7022,
        tile: 1447974485,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["oldtown/church22/r/warm/slate/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["oldtown/church22/r/warm/slate/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["oldtown/church22/r/warm/slate/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["oldtown/church22/r/warm/slate/1/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 5011,
        tile: 1448105560,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["parks/garden/1x1/0/0/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447319138,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447384674,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447450210,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447515746,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447581282,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447646818,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712354,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447319139,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/both/yard",
                "flats/upper/slate/both/00",
                "flats/upper/slate/both/00",
                "flats/roof/slate/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447384675,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/11",
                "flats/upper/panel/both/11",
                "flats/roof/panel/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447450211,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/01",
                "flats/upper/mint/both/01",
                "flats/roof/mint/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447515747,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/00",
                "flats/upper/panel/both/00",
                "flats/roof/panel/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447581283,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/01",
                "flats/upper/panel/both/01",
                "flats/roof/panel/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447646819,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/01",
                "flats/upper/mint/both/01",
                "flats/roof/mint/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447319141,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/coral/both/yard",
                "flats/upper/coral/both/10",
                "flats/upper/coral/both/10",
                "flats/roof/coral/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447384677,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/coral/both/yard",
                "flats/upper/coral/both/10",
                "flats/upper/coral/both/10",
                "flats/roof/coral/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447450213,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/01",
                "flats/upper/sand/both/01",
                "flats/roof/sand/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/parking/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447515749,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/both/yard",
                "flats/upper/slate/both/11",
                "flats/upper/slate/both/11",
                "flats/roof/slate/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447581285,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/11",
                "flats/upper/panel/both/11",
                "flats/roof/panel/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447646821,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/00",
                "flats/upper/mint/both/00",
                "flats/roof/mint/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447319144,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/00",
                "flats/upper/panel/both/00",
                "flats/roof/panel/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447384680,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/slate/both/yard",
                "flats/upper/slate/both/01",
                "flats/upper/slate/both/01",
                "flats/roof/slate/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447450216,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/11",
                "flats/upper/mint/both/11",
                "flats/roof/mint/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447515752,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/sand/both/yard",
                "flats/upper/sand/both/11",
                "flats/upper/sand/both/11",
                "flats/roof/sand/both/0",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447581288,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/panel/both/yard",
                "flats/upper/panel/both/11",
                "flats/upper/panel/both/11",
                "flats/roof/panel/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/lawn/0"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 230,
        tile: 1447646824,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: [
                "flats/ground/mint/both/yard",
                "flats/upper/mint/both/11",
                "flats/upper/mint/both/11",
                "flats/roof/mint/both/1",
              ],
            },
            {
              x: 0,
              y: 0,
              parts: ["flats/yard/playground/1"],
            },
          ],
        },
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1447319143,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447384679,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447450215,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447515751,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447581287,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447646823,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712359,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 11,
        tile: 1447188072,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/0/0"],
            },
            {
              x: 1,
              y: 0,
              parts: ["utilities/pumpstation/reservoir/1/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/0/1"],
            },
            {
              x: 1,
              y: 1,
              parts: ["utilities/pumpstation/reservoir/1/1"],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447777896,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 4, 3, 4],
      },
      {
        code: 4,
        tile: 1447777897,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [4, 4, 4, 4],
      },
      {
        code: 4,
        tile: 1448040033,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447056995,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/coral/start/street",
                "flats/upper/coral/start/11",
                "flats/upper/coral/start/11",
                "flats/roof/coral/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/coral/end/street",
                "flats/upper/coral/end/11",
                "flats/upper/coral/end/11",
                "flats/roof/coral/end/0",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 330,
        tile: 1447122531,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/slate/start/street",
                "flats/upper/slate/start/11",
                "flats/upper/slate/start/11",
                "flats/roof/slate/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/slate/end/street",
                "flats/upper/slate/end/11",
                "flats/upper/slate/end/11",
                "flats/roof/slate/end/0",
              ],
            },
          ],
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 330,
        tile: 1447188067,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/mint/start/street",
                "flats/upper/mint/start/11",
                "flats/upper/mint/start/11",
                "flats/roof/mint/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/mint/end/street",
                "flats/upper/mint/end/11",
                "flats/upper/mint/end/11",
                "flats/roof/mint/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447253603,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/panel/start/street",
                "flats/upper/panel/start/00",
                "flats/upper/panel/start/00",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/panel/end/street",
                "flats/upper/panel/end/00",
                "flats/upper/panel/end/00",
                "flats/roof/panel/end/0",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447056997,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/sand/start/street",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/sand/end/street",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447122533,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/panel/start/street",
                "flats/upper/panel/start/11",
                "flats/upper/panel/start/11",
                "flats/roof/panel/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/panel/end/street",
                "flats/upper/panel/end/11",
                "flats/upper/panel/end/11",
                "flats/roof/panel/end/1",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447188069,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/sand/start/street",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/sand/end/street",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/0",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447253605,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/mint/start/street",
                "flats/upper/mint/start/01",
                "flats/upper/mint/start/01",
                "flats/roof/mint/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/mint/end/street",
                "flats/upper/mint/end/01",
                "flats/upper/mint/end/01",
                "flats/roof/mint/end/0",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447057000,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/sand/start/street",
                "flats/upper/sand/start/10",
                "flats/upper/sand/start/10",
                "flats/roof/sand/start/0",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/sand/end/street",
                "flats/upper/sand/end/10",
                "flats/upper/sand/end/10",
                "flats/roof/sand/end/0",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 330,
        tile: 1447122536,
        rotation: 0,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: [
                "flats/ground/panel/start/street",
                "flats/upper/panel/start/11",
                "flats/upper/panel/start/11",
                "flats/roof/panel/start/1",
              ],
            },
            {
              x: 1,
              y: 0,
              parts: [
                "flats/ground/panel/end/street",
                "flats/upper/panel/end/11",
                "flats/upper/panel/end/11",
                "flats/roof/panel/end/0",
              ],
            },
          ],
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447056994,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447122530,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447188066,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1447253602,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 3, 3],
      },
      {
        code: 4,
        tile: 1447056999,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447122535,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447188071,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447253607,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040026,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040027,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040028,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040029,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040030,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040031,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040032,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171098,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171099,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171100,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171101,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171102,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171103,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171104,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1446991458,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1446991459,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1446991460,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1446991461,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [2, 3, 2, 3],
      },
      {
        code: 4,
        tile: 1446991462,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1446991463,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171106,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171107,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171108,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171109,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171110,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 0,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040034,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040035,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040036,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040037,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040038,
        rotation: 0,
        look: {
          material: "asphalt",
          way: 2,
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712355,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712356,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712357,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447712358,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447777895,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447843431,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447908967,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1447974503,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448040039,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448105575,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
      {
        code: 4,
        tile: 1448171111,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [3, 3, 3, 3],
      },
    ],
  },
};
export default InitialCity;
