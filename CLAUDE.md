# Isometrica monorepo

One isometric world and the games played in it, as npm workspaces. Node 24,
plain ES modules (no TypeScript), Prettier (`npm run format:check`).

## Packages

Dependencies point one way: games → `isometrica` → `engine`.

- `engine/` - the hand-rolled engine (renderer, game objects, components) and
  the small packages `events`, `namespace`, `reactive-property`.
- `isometrica/` - the world: terrain, buildings, roads, traffic, lighting,
  sound, the generators that paint everything, city generation, the lab
  pages. No game and no screens of its own.
- `city-sim/` - the city builder (React, Tailwind, zustand; a Cloudflare
  Worker keeps the saves). https://peeps.land
- `food-rider/` - the delivery game (older jQuery/Less UI).

Each package has its own `CLAUDE.md` and `.claude/skills/`. They load only
once you read or edit a file in that package, so knowledge stays where it
belongs:

- How the world works → `isometrica/`. Never in a game's files.
- A game's screens, saves, rules, deploy → that game's folder. Never in
  `isometrica/` or `engine/`, and never in the other game.

## Reading

Many files are 20-120 KB, a third of it comments.

- Start from the package's `CLAUDE.md` map and its skills, not the READMEs.
- Find with Grep/Glob. Read a big file (over ~20 KB) in a range round the
  match (offset/limit), not whole.
- Grep the READMEs for what you need; don't read them whole.
- Pipe long build or test output through `tail -n 40`.
- Generated and data files are denied for reading in `.claude/settings.json`.

## Writing

- How an area works is written once, in that package's skill
  (`<package>/.claude/skills/<area>/`), not again in comments and READMEs.
  The model is `isometrica/.claude/skills/citygen`.
- Code comments: a line or two of what and why, pointing at the skill when
  there is one. Don't restate the code.
- READMEs are overviews for people: change them when the layout, the
  commands or what a package is changes, not for every feature. A game's
  player-facing write-ups go in its `docs/`.
- Commit message: a one-line subject in the repo's plain style, a body of at
  most five lines.
- A change that makes a `CLAUDE.md` or a skill wrong fixes it in the same
  commit.

## Commands (root)

- `npm install` - every workspace at once.
- `npm run dev:city-sim`, `dev:food-rider`, `dev:isometrica` (the lab).
- `npm run build` (both games), `build:city-sim`, `build:food-rider`,
  `build:lab`. Each builds the engine and isometrica first.
- `npm run test:traffic`, `npm run test:cities` - isometrica's headless tests.
- Deploys: `.github/workflows/*.yml` to Cloudflare Workers; main → dev,
  `<app>/vX.Y.Z` tag → production (see README, Deploying).
