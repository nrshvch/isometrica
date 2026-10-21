/**
 * The city a brand new player of the city builder starts on - the game's own,
 * in the place of the one the world has for every game (isometrica
 * data/initialcity), which the delivery game still starts on.
 *
 * It is a save like any other, and it is opened the way a save is: under a
 * fresh id of its own, so the moment the player changes anything it becomes
 * their own city in their own storage row, leaving this one untouched.
 *
 * To fill it in, build the city in the city builder and put its save over
 * this one - as it is kept (core/persistence snapshot). The "id" and
 * "savedAt" fields are ignored.
 *
 * @type {Object}
 */
var InitialCity = {
  version: 1,
  id: "jOZdmla7kmqI",
  savedAt: 1792605409416,
  time: 1166400000,
  terrain: {
    points: [
      [1779727597, 2],
      [1779793133, 2],
      [1780514027, 2],
      [1780514028, 2],
      [1780579563, 2],
      [1780579564, 2],
      [1780645099, 2],
      [1780645100, 2],
      [1781759172, 2],
      [1781759173, 2],
      [1781759174, 2],
      [1781759180, 2],
      [1781759181, 2],
      [1781759182, 2],
      [1781759192, 2],
      [1781759204, 1],
      [1781759205, 1],
      [1781759206, 1],
      [1781824708, 2],
      [1781824709, 2],
      [1781824710, 2],
      [1781824714, 2],
      [1781824715, 2],
      [1781824716, 2],
      [1781824717, 2],
      [1781824718, 2],
      [1781824719, 2],
      [1781824729, 2],
      [1781824730, 2],
      [1781824740, 1],
      [1781824741, 1],
      [1781824742, 1],
      [1781824743, 1],
    ],
    cleared: [
      1779662060, 1779662061, 1779727596, 1779727597, 1779793132, 1779793133,
      1780448490, 1780448491, 1780448492, 1780514026, 1780514027, 1780514028,
      1780579562, 1780579563, 1780579564, 1780645098, 1780645099, 1780645100,
      1781628137, 1781628138, 1781628140, 1781628141, 1781693635, 1781693636,
      1781693637, 1781693638, 1781693643, 1781693644, 1781693645, 1781693646,
      1781693655, 1781693656, 1781693667, 1781693668, 1781693669, 1781693670,
      1781693673, 1781693676, 1781759171, 1781759172, 1781759173, 1781759174,
      1781759177, 1781759178, 1781759179, 1781759180, 1781759181, 1781759182,
      1781759183, 1781759191, 1781759192, 1781759193, 1781759194, 1781759203,
      1781759204, 1781759205, 1781759206, 1781759207, 1781759209, 1781759210,
      1781759211, 1781759212, 1781759213, 1781824707, 1781824708, 1781824709,
      1781824710, 1781824713, 1781824714, 1781824715, 1781824716, 1781824717,
      1781824718, 1781824719, 1781824728, 1781824729, 1781824730, 1781824739,
      1781824740, 1781824741, 1781824742, 1781824743, 1781824745, 1781824746,
      1781824748, 1781824749, 1781890281, 1781890284, 1781890285, 1782152428,
      1782217945, 1782217946, 1782217964, 1782283481, 1782283482, 1782283483,
      1782283484, 1782283485, 1782283486, 1782283487, 1782283488, 1782283489,
      1782283490, 1782283491, 1782283492, 1782283493, 1782283494, 1782283495,
      1782283496, 1782283497, 1782283498, 1782283499, 1782283500,
    ],
  },
  city: {
    name: "Peepsville",
    tile: 1781759211,
    resources: {
      money: 10000,
    },
    population: 20.260838545191664,
    area: [[0, 0]],
    research: {
      0: 0,
      1: 0,
      2: 0,
      3: 0,
    },
    buildings: [
      {
        code: 4,
        tile: 1781497068,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781562604,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781955820,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782021356,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1780514028,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780579564,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780645100,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780710636,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780776172,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780841708,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780907244,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780972780,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781038316,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781103852,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781169388,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 1, 1],
      },
      {
        code: 4,
        tile: 1781234924,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781300460,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781365996,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781431532,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782086892,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4012,
        tile: 1781628137,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/field/ochre/thatch/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/field/ochre/thatch/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759208,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759209,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759214,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4012,
        tile: 1781890282,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/barn/ochre/tile/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/barn/ochre/tile/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759205,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759206,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759207,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759215,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759216,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781628140,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781693676,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759212,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781890284,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759213,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781824748,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759172,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759173,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759174,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759175,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759176,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759177,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759178,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759179,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759180,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759181,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759182,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759183,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759184,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759185,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759186,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759187,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759188,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759189,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759190,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759191,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759192,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759193,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759194,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759195,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759196,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759197,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759198,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759199,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759200,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759201,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759202,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759203,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 1, 2, 1],
      },
      {
        code: 4,
        tile: 1781759204,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1779137772,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779203308,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779268844,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779334380,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779399916,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779465452,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779530988,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779596524,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779662060,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779727596,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779793132,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779858668,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779924204,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1779989740,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780055276,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780120812,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780186348,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780251884,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780317420,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780382956,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1780448492,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1781759210,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1781759211,
        rotation: 0,
        look: {
          material: "asphalt",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 9112,
        tile: 1781693674,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["civic/church/red/tiles/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["civic/church/red/tiles/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4012,
        tile: 1781628138,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/barn/ochre/thatch/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/barn/ochre/thatch/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4012,
        tile: 1781824746,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/barn/white/tile/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/barn/white/tile/0/1"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 3312,
        tile: 1781628141,
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
        surface: [1, 1, 1, 1],
      },
      {
        code: 3011,
        tile: 1781824749,
        rotation: 1,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["shops/small/gable/brick/center/green/board/0/0"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 10,
        tile: 1781890285,
        rotation: 3,
        progress: 0.48198,
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
    ],
  },
  view: {
    turns: 2,
  },
};
export default InitialCity;
