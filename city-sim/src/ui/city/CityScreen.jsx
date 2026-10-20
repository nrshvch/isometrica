/**
 * The city screen (a click on the money): the city's budget, its people and
 * its services, as they are tick by tick - and at the bottom, the city as it
 * stands handed over as the one every new player starts on (export.js).
 * Its tabs are in the address: /<id>/city/info, /<id>/city/map.
 */
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { Icon, Screen, cx } from "../kit";
import { getClient, getCore, goWorld } from "../session";
import { download, initialCityFile } from "./export";
import { stats } from "./stats";

var TABS = ["info", "map"];

//the city's stats, worked out again every time it updates
function useStats(city) {
  var [now, setNow] = useState(function () {
    return stats(city);
  });

  useEffect(
    function () {
      var token = city.update().on(function () {
        setNow(stats(city));
      });

      return function () {
        city.update().off(token);
      };
    },
    [city],
  );

  return now;
}

/**
 * Downloads the city as it stands as data/initialcity.js.
 */
function exportCity() {
  var save = getCore().persistence.snapshot();

  if (save !== null) download("initialcity.js", initialCityFile(save));
}

function Section({ heading, className, children }) {
  return (
    <section className={cx("rounded-[3px] bg-inset/60 p-4", className)}>
      <h3 className="label mb-2">{heading}</h3>
      {children}
    </section>
  );
}

//a line of it: what, and how much - a sub one what the line above is made of
function Stat({ label, sub, tone, children }) {
  return (
    <div
      className={cx(
        "flex justify-between gap-4 py-0.5",
        sub ? "pl-4 text-sm font-semibold text-muted" : "font-bold",
      )}
    >
      <span>{label}</span>
      <span
        className={cx(
          "text-right tabular-nums",
          !sub && "font-extrabold",
          tone === "income" && "text-good",
          tone === "expense" && "text-bad",
        )}
      >
        {children}
      </span>
    </div>
  );
}

//one of the figures the city is told by at a glance
function Tile({ label, tone, children }) {
  return (
    <div className="rounded-[3px] bg-inset/60 p-4">
      <div className="label">{label}</div>
      <div
        className={cx(
          "figure mt-1.5 truncate",
          tone === "income" && "text-good",
          tone === "expense" && "text-bad",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function Info({ city }) {
  var s = useStats(city);

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label="Balance">{s.balance}</Tile>
        <Tile label="Net a tick" tone={s.netClass}>
          {s.net}
        </Tile>
        <Tile label="Population">{s.population}</Tile>
        <Tile label="Out of work">{s.unemployment.split(" ")[0]}</Tile>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Section heading="Money">
          <Stat label="Income" tone="income">
            {s.income}/tick
          </Stat>
          <Stat label="Houses" sub>
            {s.taxes}
          </Stat>
          <Stat label="Commerce" sub>
            {s.commerce}
          </Stat>
          <Stat label="Upkeep" tone="expense">
            {s.upkeep}/tick
          </Stat>
          <Stat label="Roads" sub>
            {s.roadsUpkeep}
          </Stat>
          <Stat label="Water towers" sub>
            {s.waterUpkeep}
          </Stat>
          <Stat label="Land" sub>
            {s.landUpkeep}
          </Stat>
          <Stat label="Town hall" sub>
            {s.cityHallUpkeep}
          </Stat>
          {s.otherUpkeep && (
            <Stat label="Other" sub>
              {s.otherUpkeep}
            </Stat>
          )}
        </Section>

        <div className="flex flex-col gap-3">
          <Section heading="People">
            <Stat label="Population">{s.population} peeps</Stat>
            <Stat label="Homes">{s.slots} peeps</Stat>
            <Stat label="Jobs">{s.filled + " of " + s.jobs + " filled"}</Stat>
            <Stat label="Available jobs">{s.available}</Stat>
            <Stat label="Unemployment">{s.unemployment}</Stat>
          </Section>

          <Section heading="Services">
            <Stat label="Water towers">{s.towers}</Stat>
            <Stat label="Roads">{s.roads} tiles off the town hall</Stat>
            <Stat label="Not served">{s.unserved}</Stat>
          </Section>
        </div>
      </div>

      <Section heading="Hand over">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-lg text-sm font-semibold text-muted">
            {s.name +
              " as the city every new player starts on, the delivery game's" +
              " too - to be saved over isometrica/src/data/initialcity.js"}
          </p>
          <button type="button" onClick={exportCity} className="btn">
            <Icon name="download" size={20} strokeWidth={2} />
            Download as the initial city
          </button>
        </div>
      </Section>
    </div>
  );
}

//what the map will show, one day
function MapTab() {
  var [on, setOn] = useState({ Ecology: true });

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="grid aspect-[2/1] place-items-center rounded-[3px] bg-inset/60 font-bold text-muted">
        The map is still being drawn
      </div>
      <div className="flex flex-wrap gap-2">
        {["Crime", "Ecology", "Wealth", "Terrain", "Names"].map(function (m) {
          return (
            <button
              key={m}
              type="button"
              aria-pressed={!!on[m]}
              onClick={function () {
                setOn(Object.assign({}, on, { [m]: !on[m] }));
              }}
              className={cx("btn py-1.5", on[m] && "btn-primary")}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CityScreen() {
  var params = useParams(),
    tab = params.tab,
    city = getClient().core.cities.getCity(0);

  if (TABS.indexOf(tab) === -1) tab = "info";

  return (
    <Screen
      title={city ? city.name() : "The city"}
      aside={
        <nav className="flex rounded-[3px] bg-inset p-1">
          {TABS.map(function (t) {
            return (
              <NavLink
                key={t}
                to={"/" + params.city + "/city/" + t}
                replace
                className={cx(
                  "rounded-[2px] px-3 py-1 font-extrabold capitalize",
                  t === tab
                    ? "bg-card text-ink shadow"
                    : "text-muted hover:text-ink",
                )}
              >
                {t}
              </NavLink>
            );
          })}
        </nav>
      }
      onClose={goWorld}
    >
      {city ? tab === "map" ? <MapTab /> : <Info city={city} /> : null}
    </Screen>
  );
}
