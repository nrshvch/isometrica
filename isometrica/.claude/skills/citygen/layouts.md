# What each size lays out and builds

`SIZES` in `index.js`: `rx, ry` (town reach each way, tiles), `margin`
(window = 2·r·margin), `money`, plus per-size switches below.
`Plan#reach(x, y)` = elliptical distance from the middle, 1 at the outline
(lobes bend it); districts and zones key off it.

## City (`city`, Peepstown's size: ~250 buildings, ~3,300 people)

- Streets (`streets.js`): main cross through the middle (level 0, asphalt,
  continued as country roads until water), then recursive subdivision of each
  quarter: cut the long side near its middle, or the short side into parts
  of 5-6 (two lot rows back to back). `DISTRICTS` by reach: core <0.34 (6x9),
  inner <0.64 (6x12), suburb <0.98 (6x15), edge <1.3 (7x20), rural. Each cut
  spans only its parent, giving staggered T-junctions. Urban = block centre
  reach <= 1 and >= 55% buildable; streets kept only next to urban blocks;
  `keepJoined` drops what is not joined to the road nearest the middle.
  Gravel farm lanes extend some level 1-3 streets.
- Boulevard along x or y downtown (see engine.md for median/ways);
  roundabouts at level-0 junctions with reach 0.42-1.02 (`ringFits`);
  square = block next to the main crossing (3x3..42 cells), paved with 1x1
  town squares.
- Zones (`lots.js zone`): square; old town = 2-3 core blocks nearest the
  square on its side of the boulevard; one park block; others = district.
  Waterside (<= 3 tiles) and hill (>= median + 2) push villas.
- Lots: `stripsOf` - two long sides, depth ceil/floor of half, max 3; ends
  filled where a middle remains; courtyards become parks downtown.
  `fillStrip` - one primary kind per strip (75%), widths reused for a uniform
  street. Strips on level <= 1 roads use `<zone>High` palettes (high street).
- Civic round each square, facing it across the street (`around`): town
  hall, church, market (district squares: church, market).
- Farms along roads outside urban blocks (reach <= 1.7), spaced.

## Small town (`town`, `village: true`: 60-100 buildings, 400-900 people)

`village.js`, u along the main road, v across (long axis of the site).
Layouts (`LAYOUTS`, or forced via `generate({layout})`): street (+ back lane
round 1-2 blocks), crossroads (+ lane block in a corner), tee (branch road,
maybe on as gravel), green (road parts round a green: church, squares, park
with pond). Main road asphalt or gravel, cobbled in the middle; lanes cobble.
Centre (<= 6 tiles): square by the road, church beside, town hall 50-60%,
market. Frontage strips along every straight run: centre palette, then an
edge ring (+4: town houses/villas), then pure village with gaps, then farms.
`ALLOWED` kinds (no flats, offices, stores) also restrict `balance`. Water
towers may go on open ground within 2 of a house (`water(plan, r, near)`).

## Peepsopolis (`metropolis`: ~900-1,050 buildings, 12-15k people)

Switches: `grid` (arterials every ~20 tiles both ways, all level 0; one
superblock near reach 0.42 left uncut = central park), `districts` (squares
in each quarter at reach 0.5-0.85, church + market, an old-town block
beside), `parks` (extra park blocks), `roundabouts: 6`, `palettes`
(offices downtown), `name`. Boulevards: main along x (reachOut 0.5), and
along y from reach 0.7 outward both ways (`reachIn 0.5`); boulevards never
extend onto existing one-ways.

## Tuning / adding a size

- Add to `SIZES`; reuse switches. Check `npm run test:cities --size=<new>`
  (all must pass) and the bench (`ZOOM` in `lab/cities/scene.js`).
- Size scales with `rx * ry`; flats-heavy palettes raise people per tile
  (flats ~12/tile, town houses ~4.5, villas ~2.8).
- Performance budget: generate < ~1 s for the biggest (site survey `STEP`
  scales with r; grading is the next cost on hilly ground).
- Balance swaps (`TO_WORK` / `TO_HOMES`) need same-footprint codes; a kind
  with no counterpart (e.g. old town before it mapped to houses) causes
  `noWorkers`.
