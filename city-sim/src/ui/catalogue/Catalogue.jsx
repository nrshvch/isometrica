/**
 * The catalogue: everything there is to build (buildings.js), a card each -
 * its picture, what it costs, who lives and works in it, what it needs and
 * what it gives. A card picked is built: back in the world, its selection
 * up to be dragged out. Before there is a city, only the houses one can be
 * founded with - the first of it founds it (isometrica client/buildman).
 */
import { useMemo } from "react";
import Data from "isometrica/data/buildings";
import CityPopulation from "isometrica/core/city/citypopulation";
import { Screen } from "../kit";
import { build, goWorld } from "../session";
import { useGame } from "../store";
import { buildings } from "./buildings";
import Preview from "./Preview";

//a figure of a card, or nothing for a building with nothing to say
function Figure({ label, value }) {
  if (value === "\u2014") return null;

  return (
    <span className="pill bg-card px-2 py-1 text-xs">
      <span className="font-semibold text-muted">{label}</span>
      {value}
    </span>
  );
}

function Card({ building }) {
  var s = building.stats;

  return (
    <button
      type="button"
      onClick={function () {
        build(building.code);
      }}
      className="flex cursor-pointer flex-col gap-2.5 rounded-[3px] bg-inset/60 p-2 text-left transition hover:-translate-y-0.5 hover:bg-inset focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Preview code={building.code} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <h3 className="leading-tight font-extrabold">{building.displayName}</h3>
        <div
          className="truncate font-black text-good tabular-nums"
          title={s.cost}
        >
          {s.cost}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Figure label="Homes" value={s.citizens} />
          <Figure label="Jobs" value={s.jobs} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs font-semibold">
          {/* only what it does need, and what it costs to keep */}
          {s.needs !== "nothing" && (
            <>
              <dt className="text-muted">Needs</dt>
              <dd className="truncate" title={s.needs}>
                {s.needs}
              </dd>
            </>
          )}
          {s.upkeep && (
            <>
              <dt className="text-muted">Upkeep</dt>
              <dd className="truncate text-bad">{s.upkeep}</dd>
            </>
          )}
          <dt className="text-muted">Gives</dt>
          <dd className="truncate text-good" title={s.benefits}>
            {s.benefits}
          </dd>
        </dl>
      </div>
    </button>
  );
}

export default function Catalogue() {
  var hasCity = useGame(function (s) {
      return s.hasCity;
    }),
    all = useMemo(buildings, []),
    shown = hasCity
      ? all
      : all.filter(function (b) {
          return CityPopulation.canFound(Data[b.code]);
        });

  return (
    <Screen
      title={hasCity ? "Build" : "Found a city"}
      aside={
        hasCity
          ? shown.length + " to choose from"
          : "with its first house - " + shown.length + " to choose from"
      }
      onClose={goWorld}
      className="grid grid-cols-2 content-start gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {shown.map(function (b) {
        return <Card key={b.code} building={b} />;
      })}
    </Screen>
  );
}
