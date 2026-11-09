/**
 * The catalogue: everything there is to build (buildings.js), a card each -
 * its picture, what it costs, who lives and works in it, what it needs and
 * what it gives. A card picked is built: back in the world, its selection
 * up to be dragged out. Before there is a city, the same - the first of
 * whatever is picked founds it (isometrica client/buildman).
 *
 * Or, replacing (/replace/<tile>), only what can go up in the place of the
 * building on that tile - whatever covers its ground, turned one way or
 * another (isometrica core/replacement) - each at what it would come to,
 * clearing the building away included; the kind it is among them, for
 * another look of it. A card picked goes up there: back in the world, the
 * building comes down as the bulldozers get to it, and the one picked goes
 * up on its ground once they are done (isometrica client/buildman replace).
 */
import { useMemo } from "react";
import { useParams } from "react-router";
import Data from "isometrica/data/buildings";
import CoreConfig from "isometrica/core/config";
import Replacement from "isometrica/core/replacement";
import Rotation from "isometrica/core/rotation";
import { Screen } from "../kit";
import { build, getClient, goWorld, replace } from "../session";
import { useGame } from "../store";
import { buildings, displayName, formatMoney } from "./buildings";
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

/**
 * A building of the catalogue, picked by onPick - at price, rather than
 * what it costs to build, when that is told; and marked as the kind of
 * building that stands there now, replacing (here).
 */
function Card({ building, onPick, price, clearing, here }) {
  var s = building.stats,
    cost = price || s.cost;

  return (
    <button
      type="button"
      onClick={function () {
        onPick(building.code);
      }}
      className="flex cursor-pointer flex-col gap-2.5 rounded-[3px] bg-inset/60 p-2 text-left transition hover:-translate-y-0.5 hover:bg-inset focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
    >
      <Preview code={building.code} />
      <div className="flex flex-col gap-2 px-1 pb-1">
        <h3 className="leading-tight font-extrabold">{building.displayName}</h3>
        {here && (
          <span className="pill self-start bg-card px-2 py-1 text-xs text-muted">
            Here now - another look
          </span>
        )}
        <div
          className="truncate font-black text-good tabular-nums"
          title={cost}
        >
          {cost}
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
          {clearing && (
            <>
              <dt className="text-muted">Clearing</dt>
              <dd className="truncate">{clearing}</dd>
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

var GRID =
  "grid grid-cols-2 content-start gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4";

/**
 * What can go up in the place of the building on tile: {building, lot,
 * clearing, shown} - the building, the ground it stands on as it lies, what
 * clearing it away costs, and the catalogue's buildings that cover that
 * ground - or null, with nothing standing there to replace.
 */
function lotOf(tile) {
  var client = getClient(),
    building = client ? client.core.buildingService.get(tile) : null;

  if (building === null || !Replacement.replaceable(building)) return null;

  var sizeX = Rotation.sizeX(building.data, building.rotation),
    sizeY = Rotation.sizeY(building.data, building.rotation);

  return {
    building: building,
    clearing: sizeX * sizeY * CoreConfig.clearTileCost,
    shown: buildings().filter(function (b) {
      return Replacement.fits(b.code, sizeX, sizeY);
    }),
  };
}

/**
 * What can go up in the place of the building on the tile in the address.
 */
function Replace() {
  var tile = parseInt(useParams().tile, 10),
    lot = useMemo(
      function () {
        return lotOf(tile);
      },
      [tile],
    );

  if (lot === null)
    return (
      <Screen title="Replace" onClose={goWorld} className="p-5">
        <p className="font-semibold text-muted">
          Nothing stands there to replace any more.
        </p>
      </Screen>
    );

  var standing = Replacement.kindOf(lot.building.buildingCode),
    name = Data[standing] ? displayName(Data[standing]) : "";

  return (
    <Screen
      title="Replace"
      aside={name + " - " + lot.shown.length + " to choose from"}
      onClose={goWorld}
      className={GRID}
    >
      {lot.shown.map(function (b) {
        var cost = (Data[b.code].constructionCost || {}).money || 0;

        return (
          <Card
            key={b.code}
            building={b}
            price={formatMoney(cost + lot.clearing)}
            clearing={formatMoney(lot.clearing)}
            here={+b.code === standing}
            onPick={function (code) {
              replace(lot.building.tile, code);
            }}
          />
        );
      })}
    </Screen>
  );
}

export default function Catalogue({ replacing }) {
  var hasCity = useGame(function (s) {
      return s.hasCity;
    }),
    shown = useMemo(buildings, []);

  if (replacing) return <Replace />;

  return (
    <Screen
      title={hasCity ? "Build" : "Found a city"}
      aside={
        hasCity
          ? shown.length + " to choose from"
          : "with what goes up first - " + shown.length + " to choose from"
      }
      onClose={goWorld}
      className={GRID}
    >
      {shown.map(function (b) {
        return <Card key={b.code} building={b} onPick={build} />;
      })}
    </Screen>
  );
}
