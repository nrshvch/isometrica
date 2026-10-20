/**
 * The catalogue: everything there is to build (buildings.js), a card each -
 * its picture, what it costs, who lives and works in it, what it needs and
 * what it gives. A card picked is built: back in the world, its selection
 * up to be dragged out.
 */
import { useMemo } from "react";
import { Icon, Screen } from "../kit";
import { build, goWorld } from "../session";
import { buildings } from "./buildings";
import Preview from "./Preview";

//a figure of a card, or nothing for a building with nothing to say
function Figure({ label, value }) {
  if (value === "—") return null;

  return (
    <span className="rounded-md bg-white/8 px-2 py-0.5 text-xs">
      <span className="text-muted">{label} </span>
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
      className="group flex cursor-pointer flex-col gap-3 rounded-2xl bg-white/4 p-2.5 text-left ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-white/8 hover:ring-gold/70 focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Preview code={building.code} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="leading-tight font-semibold">
            {building.displayName}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 font-semibold text-gold tabular-nums">
          <Icon name="coin" className="size-5" />
          <span className="truncate" title={s.cost}>
            {s.cost}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Figure label="Homes" value={s.citizens} />
          <Figure label="Jobs" value={s.jobs} />
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs">
          <dt className="text-muted">Needs</dt>
          <dd className="truncate" title={s.needs}>
            {s.needs}
          </dd>
          <dt className="text-muted">Gives</dt>
          <dd className="truncate text-income" title={s.benefits}>
            {s.benefits}
          </dd>
        </dl>
      </div>
    </button>
  );
}

export default function Catalogue() {
  var all = useMemo(buildings, []);

  return (
    <Screen
      title="Build"
      aside={all.length + " to choose from"}
      onClose={goWorld}
      className="grid grid-cols-2 content-start gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {all.map(function (b) {
        return <Card key={b.code} building={b} />;
      })}
    </Screen>
  );
}
