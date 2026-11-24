# The benches

- `/buildings.html` - a unit test of a building coming down
  (`lab/buildings/stand.js`, on `bench/stage.js`): a patch of grass two tiles
  wider than the building all round, one building of any kind on it, whole,
  put together from its parts the way the game does. "random" another look,
  "any" any building, it turns on its ground; "demolish" brings it down with
  the game's own `Demolition` (`client/demolition.js`), fenced, every tile
  told to come down at once; "restore" puts it back.
- `/demolition.html` (`lab/demolition/scene.js`): a few buildings, trees
  planted and a road along them. "destroy" clears it all the game's way -
  fenced, the bulldozers coming, buildings down a tile at a time, trees going
  over, the road broken up, one price floated over the lot; "reset" puts it up
  again once they are done; "again" does both.
- `/replace.html` (`lab/replace/scene.js`, `Replace.jsx`): one building, a road
  along its front, put up in the place of itself (another look) or of
  anything else covering its ground, the game's way (`client/buildman`
  replace): it comes down as the bulldozers reach it and a site goes up once
  they are done, by the bench's clock, the sites faster if asked.
- `/explosion.html` (`lab/explosion/scene.js`, `Explosion.jsx`, `boom.js`):
  one building on flat grass, a road along its front, a few trees, blown up
  the game's way (`client/buildman` explode): charges at its foot, a
  fireball, pieces thrown all round, a tile at a time down, rubble left till
  cleared by the bulldozers, its yard wrecked. Or two side by side, blown up
  one after the other - a pile each (`client/rubble`) - on the flat or a
  hillside. Or with neighbours (setAround): a terrace of three next to it (the
  nearest two close enough to come down, the third not), a park on its other
  side (wrecked), a house across the road and one further along (knocked
  about, standing), trees knocked over. The boom (`boom.js`): the game's
  blast (`shared/gen/blast.js`), a way at random, started so it comes as the
  pieces fly however fast the bench's clock goes - made in the page through
  Web Audio, not slowed (at ¼× it is over long before they land).
- `/fire.html` (`lab/fire/scene.js`, `Fire.jsx`): one building, a road, a few
  trees, set on fire the game's way (`client/buildman` fireUp) - over a day of
  game time by the bench's own clock: as fast as the game's or faster,
  stopped, an hour on, or to just before it comes down; by day or at night;
  put up again.
- `/climate.html` (`lab/climate/scene.js`): every zone on one island - desert
  at one end, savannah, green, arctic, north at the other - each a stretch as
  long as the others, its temperatures spread along it (what the world spreads
  over thousands of tiles in a dozen or so; the bench lays the climate out its
  own way, setHeat), so every border shows at once. Shallows and deep water
  all round (a sand beach; ice with frost out in the cold), a river winding
  end to end through every zone (ice closing over it from its edges where the
  snow comes in), hills in every zone for its ground on slopes, and the trees
  and stones the world puts there itself. Warmer or colder (warmth) moves
  every zone along it; it turns, is seen from above, nearer or further;
  "all" the whole island.
- `/cities.html` - the city bench (citygen skill): a generated city laid out
  on flat grass, `#size=city&seed=7`.
