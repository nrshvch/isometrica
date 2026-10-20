/**
 * The catalogue: everything there is to build (buildings.js), a card each -
 * its picture, what it costs, who lives and works in it, what it needs and
 * what it gives. A card picked is built: back in the world, its selection
 * up to be dragged out.
 */
import { useMemo } from "react";
import { Screen } from "../kit";
import { build, goWorld } from "../session";
import { buildings } from "./buildings";
import Preview from "./Preview";

var STATS = [
  ["cost", "Cost"],
  ["citizens", "Citizens"],
  ["jobs", "Jobs"],
  ["needs", "Needs"],
  ["benefits", "Gives"],
];

function Card({ building }) {
  return (
    <button
      type="button"
      onClick={function () {
        build(building.code);
      }}
      className="group ui-shadow block cursor-pointer overflow-clip rounded-md text-left text-inherit"
    >
      <div className="ui-block truncate px-1 py-2 text-center group-hover:border-button-light group-hover:border-r-button-dark group-hover:border-b-button-dark group-hover:bg-button">
        {building.displayName}
      </div>
      <div className="ui-block p-[4%]">
        <div className="bg-white p-[4%]">
          <Preview code={building.code} />
        </div>
      </div>
      {/* a fixed number of single lines, clipped rather than wrapped, so no
          card grows taller than its neighbours whatever the building has to
          say */}
      <div className="ui-block px-[4%] py-[3%] text-[9pt] leading-normal">
        {STATS.map(function (s) {
          return (
            <div key={s[0]} className="truncate" title={building.stats[s[0]]}>
              <span className="inline-block w-[6em] opacity-70">{s[1]}</span>
              {building.stats[s[0]]}
            </div>
          );
        })}
      </div>
    </button>
  );
}

export default function Catalogue() {
  var all = useMemo(buildings, []);

  return (
    <Screen
      className="grid grid-cols-2 content-start gap-3 p-3 sm:grid-cols-3 lg:grid-cols-4"
      buttons={[{ icon: "cross-icon", text: "Close", onClick: goWorld }]}
    >
      {all.map(function (b) {
        return <Card key={b.code} building={b} />;
      })}
    </Screen>
  );
}
