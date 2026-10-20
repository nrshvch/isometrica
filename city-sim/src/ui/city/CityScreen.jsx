/**
 * The city screen (a click on the money): the city's budget, its people and
 * its services, as they are tick by tick - and at the bottom, the city as it
 * stands handed over as the one every new player starts on (export.js).
 * Its tabs are in the address: /<id>/city/info, /<id>/city/map.
 */
import { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router";
import { Screen, cx } from "../kit";
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

function Section({ heading, children }) {
  return (
    <div className="mb-4">
      {heading && (
        <div className="mb-1 border-b border-black/20 font-bold uppercase">
          {heading}
        </div>
      )}
      {children}
    </div>
  );
}

//a line of it: what, and how much - a sub one what the line above is made of
function Stat({ label, sub, tone, children }) {
  return (
    <div className={cx("flex justify-between gap-4", sub && "pl-6 text-[90%]")}>
      <span className="opacity-80">{label}</span>
      <span
        className={cx(
          "text-right",
          !sub && "font-bold",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense",
        )}
      >
        {children}
      </span>
    </div>
  );
}

function Info({ city }) {
  var s = useStats(city);

  return (
    <div className="mx-auto max-w-[640px] px-[4%] py-[2%] leading-[1.6]">
      <Section>
        <Stat label="Name">{s.name}</Stat>
        <Stat label="Location">{s.x + ", " + s.y}</Stat>
      </Section>

      <Section heading="Money">
        <Stat label="Balance">{s.balance}</Stat>
        <Stat label="Net" tone={s.netClass}>
          {s.net}/tick
        </Stat>
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

      <Section heading="People">
        <Stat label="Population">{s.population} peeps</Stat>
        <Stat label="Homes">{s.slots} peeps slots</Stat>
        <Stat label="Jobs">{s.filled + " of " + s.jobs + " filled"}</Stat>
        <Stat label="Available jobs">{s.available}</Stat>
        <Stat label="Unemployment">{s.unemployment}</Stat>
      </Section>

      <Section heading="Services">
        <Stat label="Water towers">{s.towers}</Stat>
        <Stat label="Roads">{s.roads} tiles off the town hall</Stat>
        <Stat label="Not served">{s.unserved}</Stat>
      </Section>

      <Section heading="Hand over">
        <div className="flex flex-col gap-1.5">
          <span className="opacity-80">
            The city every new player starts on, the delivery game's too - to be
            saved over isometrica/src/data/initialcity.js
          </span>
          <button
            type="button"
            onClick={exportCity}
            className="ui-button self-start px-2.5 py-1.5"
          >
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
    <div className="p-[2%]">
      <div className="ui-block-inset aspect-square bg-white" />
      <div className="mt-[2%] flex flex-wrap gap-[2%]">
        {["Crime", "Ecology", "Wealth", "Terrain", "Names"].map(function (m) {
          return (
            <button
              key={m}
              type="button"
              onClick={function () {
                setOn(Object.assign({}, on, { [m]: !on[m] }));
              }}
              className={cx(
                "ui-button mb-[2%] p-[2%]",
                on[m] && "ui-button-on",
              )}
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
      className="flex flex-col"
      buttons={[{ icon: "cross-icon", text: "Close", onClick: goWorld }]}
    >
      <div className="flex h-12 items-stretch gap-2 px-1 py-[0.6rem]">
        {TABS.map(function (t) {
          return (
            <NavLink
              key={t}
              to={"/" + params.city + "/city/" + t}
              replace
              className={cx(
                "ui-shadow flex items-center px-4 capitalize",
                t === tab ? "ui-button" : "ui-block",
              )}
            >
              {t}
            </NavLink>
          );
        })}
      </div>
      <div className="ui-block flex-1">
        {city ? tab === "map" ? <MapTab /> : <Info city={city} /> : null}
      </div>
    </Screen>
  );
}
