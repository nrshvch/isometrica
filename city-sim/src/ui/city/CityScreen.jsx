/**
 * The city screen (a click on the money): the city's budget, its people and
 * its services, as they are tick by tick.
 */
import { useEffect, useState } from "react";
import { Screen, cx } from "../kit";
import { getClient, goWorld } from "../session";
import { stats } from "./stats";

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
          <Stat label="Water towers" sub>
            {s.waterUpkeep}
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
    </div>
  );
}

export default function CityScreen() {
  var city = getClient().core.cities.getCity(0);

  return (
    <Screen title={city ? city.name() : "The city"} onClose={goWorld}>
      {city && <Info city={city} />}
    </Screen>
  );
}
