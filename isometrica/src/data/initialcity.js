/**
 * The city a brand new player starts on - in the city builder, and in the
 * delivery game, whose streets it is.
 *
 * It is a save like any other, and it is opened the way a save is: under a
 * fresh id of its own, so the moment the player changes anything it becomes
 * their own city in their own storage row, leaving this one untouched.
 *
 * To fill it in, build the city in the city builder and put its save over
 * this one - as it is kept (core/persistence snapshot). The "id" and
 * "savedAt" fields are ignored.
 *
 * null means there is nothing to start from: the game opens on a blank world
 * and the player founds their city themselves.
 *
 * @type {Object|null}
 */
var InitialCity = {
  version: 1,
  id: "BzPP91YJPnls",
  savedAt: 1792601213494,
  time: 671700000,
  terrain: {
    points: [
      [1781759204, 1],
      [1781759205, 1],
      [1781759206, 1],
      [1781824740, 1],
      [1781824741, 1],
      [1781824742, 1],
      [1781824743, 1],
    ],
    cleared: [
      1781628137, 1781628140, 1781628141, 1781693667, 1781693668, 1781693669,
      1781693670, 1781693673, 1781693676, 1781759203, 1781759204, 1781759205,
      1781759206, 1781759207, 1781759209, 1781759212, 1781759213, 1781824739,
      1781824740, 1781824741, 1781824742, 1781824743, 1781824745, 1781824748,
      1781824749, 1781890281, 1781890284, 1781890285,
    ],
  },
  city: {
    name: "Miniville",
    tile: 1781759211,
    resources: {
      money: 10000,
    },
    population: 26.324600975054327,
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
        tile: 1781759211,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
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
        tile: 1780514027,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
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
        tile: 1780579563,
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
        code: 4,
        tile: 1782152428,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782217964,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782283481,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283482,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283483,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283484,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283485,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283486,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283487,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283488,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283489,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283490,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283491,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283492,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283493,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283494,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283495,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782283496,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 1, 2, 1],
      },
      {
        code: 4,
        tile: 1782283497,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782283498,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782283499,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782283500,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4,
        tile: 1782217945,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 4,
        tile: 1782217946,
        rotation: 0,
        look: {
          material: "gravel",
        },
        surface: [2, 2, 2, 2],
      },
      {
        code: 3012,
        tile: 1781628141,
        rotation: 2,
        look: {
          tiles: [
            {
              x: 0,
              y: 1,
              parts: ["shops/store/blue/piers/red/0/1"],
            },
            {
              x: 0,
              y: 0,
              parts: ["shops/parking/small/store-blue"],
            },
          ],
        },
        surface: [1, 1, 1, 1],
      },
      {
        code: 4022,
        tile: 1781628138,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/field/white/tile/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/field/white/tile/0/1"],
            },
            {
              x: 1,
              y: 0,
              parts: ["houses/farm/barn/ochre/tile/0/0"],
            },
            {
              x: 1,
              y: 1,
              parts: ["houses/farm/barn/ochre/tile/0/1"],
            },
          ],
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
        tile: 1781759210,
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
        tile: 1781824746,
        rotation: 3,
        look: {
          tiles: [
            {
              x: 0,
              y: 0,
              parts: ["houses/farm/sheep/stone/thatch/0/0"],
            },
            {
              x: 0,
              y: 1,
              parts: ["houses/farm/sheep/stone/thatch/0/1"],
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
              parts: ["shops/small/gable/brick/double/none/board/0/0"],
            },
          ],
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
    ],
  },
};
export default InitialCity;
