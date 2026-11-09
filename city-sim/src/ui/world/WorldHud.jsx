/**
 * What goes over the world when no screen is up, along the bottom where a
 * thumb is: the bar of buttons - whatever holds them (bridge.js): the
 * building tools, or the action going on - and over it, on a card as wide,
 * a line of what to do. As wide as what is along the top on a phone; in
 * the middle on a desktop, where the top has the width of the screen.
 *
 * While a building is looked at - tapped, with nothing else going on - the
 * bar has only what can be done to it (Replace), the tools back once it is
 * put away with a tap anywhere else; and the card over it says what it is
 * and what it is worth: how far along it is going up, or the money it
 * makes a tick, who lives or works in it and what it goes without - kept
 * up to date as the city goes on, and nothing of it written over the world
 * (isometrica client/worth describe).
 */
import { useEffect, useState } from "react";
import Events from "events";
import Data from "isometrica/data/buildings";
import BuildingClassCode from "isometrica/data/classcode";
import Replacement from "isometrica/core/replacement";
import { describe } from "isometrica/client/worth";
import Numeral from "numeral";
import { displayName } from "../catalogue/buildings";
import { BarButton, Container, Icon, cx } from "../kit";
import { getClient, goReplace } from "../session";
import { useGame } from "../store";

//what a button says under it, when what puts it up does not say - the
//toggles of what is being done (isometrica client/buildman, terrainman),
//by the name of their icon, whichever way a road goes
var LABELS = {
  asphalt: "Asphalt",
  gravel: "Gravel",
  cobble: "Cobbles",
  clear: "Clear",
  raise: "Raise",
  lower: "Lower",
};

function labelOf(b) {
  return b.label || LABELS[b.icon.split("-")[0]] || "";
}

/**
 * The line of what to do: by the icon of the toggle that is on, if one is -
 * what a road is laid in, say - or the sign for a hint.
 */
function Hint({ text, on }) {
  return (
    <div className="card flex items-center gap-3 p-2.5 pr-4">
      <span className={cx("tile", on ? "tile-gold" : "tile-home")}>
        <Icon
          name={on ? on.icon : "info"}
          size={22}
          strokeWidth={on ? undefined : 1.75}
        />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="label">{on ? labelOf(on) : "What to do"}</span>
        <span className="leading-snug font-extrabold text-balance">{text}</span>
      </div>
    </div>
  );
}

/**
 * What the building looked at is worth (isometrica client/worth
 * describe), read again every tick while it is looked at - or null, for
 * none, or one gone.
 *
 * @param inspected {{tile: number, code: number}|null} (store)
 */
function useDescribed(inspected) {
  var [seen, setSeen] = useState(null);

  useEffect(
    function () {
      var client = getClient();

      if (!inspected || !client) {
        setSeen(null);
        return;
      }

      //on the world's tick, as the words over the world are read again
      //(isometrica client/serviceman) - the same figures at the same time
      var core = client.core;

      function read() {
        var b = client.core.buildingService.get(inspected.tile),
          next = b !== null ? describe(b.getCity(), b) : null;

        setSeen(function (was) {
          return JSON.stringify(was) === JSON.stringify(next) ? was : next;
        });
      }

      var ticked = Events.on(core, core.events.tick, read);

      read();

      return function () {
        Events.off(core, core.events.tick, ticked);
      };
    },
    [inspected],
  );

  return seen;
}

//what a tick of it comes to: +$100, -$40
function perTick(amount) {
  return (
    (amount < 0 ? "-" : "+") + "$" + Numeral(Math.abs(amount)).format("0,0")
  );
}

//a figure of the card, what it is of in front of it
function Figure({ label, icon, className, children }) {
  return (
    <span className={cx("pill bg-inset px-2 py-1 text-xs", className)}>
      {icon && <Icon name={icon} size={14} strokeWidth={2} />}
      {label && <span className="font-semibold text-muted">{label}</span>}
      {children}
    </span>
  );
}

/**
 * The building looked at: what it is, and what it is worth - going up, how
 * far along; standing, what it makes a tick, who lives or works in it and
 * what it goes without.
 */
function Focus({ inspected, seen }) {
  var data = Data[Replacement.kindOf(inspected.code)],
    going = seen.progress !== null;

  return (
    <div className="card flex items-center gap-3 p-2.5 pr-3">
      <span className={cx("tile", going ? "tile-gold" : "tile-home")}>
        <Icon
          name={
            going
              ? "build"
              : seen.classCode === BuildingClassCode.house
                ? "home"
                : "city"
          }
          size={22}
        />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="label">{going ? "Going up" : "Building"}</span>
        <span className="truncate leading-snug font-extrabold">
          {data ? displayName(data) : seen.name}
        </span>
      </div>
      <div className="flex max-w-[60%] flex-wrap justify-end gap-1.5">
        {going ? (
          <Figure icon="clock">{Math.floor(seen.progress * 100) + "%"}</Figure>
        ) : (
          <>
            <Figure
              icon={seen.income < 0 ? "trend-down" : "trend-up"}
              className={seen.income < 0 ? "text-bad" : "text-good"}
            >
              <span title="A tick">{perTick(seen.income)}</span>
            </Figure>
            {seen.capacity > 0 && (
              <Figure icon="people">
                {seen.residents + "/" + seen.capacity}
              </Figure>
            )}
            {seen.jobs > 0 && (
              <Figure label="Jobs">{seen.workers + "/" + seen.jobs}</Figure>
            )}
            {seen.wants && (
              <Figure icon="alert" className="text-bad">
                {seen.wants.charAt(0).toUpperCase() + seen.wants.slice(1)}
              </Figure>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * What can be done to the building looked at, in the bar in the place of
 * its tools: put something else up in its place.
 */
function focusButtons(inspected) {
  return [
    {
      icon: "replace",
      label: "Replace",
      action: function () {
        goReplace(inspected.tile);
      },
    },
  ];
}

export default function WorldHud() {
  var hint = useGame(function (s) {
      return s.hint;
    }),
    buttons = useGame(function (s) {
      return s.buttons;
    }),
    //a building looked at, while nothing else is going on
    inspected = useGame(function (s) {
      return s.busy ? null : s.inspected;
    }),
    seen = useDescribed(inspected),
    shown = inspected ? focusButtons(inspected) : buttons.filter(Boolean),
    on = shown.find(function (b) {
      return b.on;
    });

  return (
    <Container className="flex flex-1 flex-col justify-end pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
      <div className="mx-auto flex w-full flex-col gap-2 sm:max-w-xl">
        {hint && <Hint text={hint} on={on} />}
        {inspected && seen && <Focus inspected={inspected} seen={seen} />}
        {shown.length > 0 && (
          <div className="card flex w-full justify-center px-1 pt-2 pb-2.5">
            {shown.map(function (b) {
              return (
                <BarButton
                  key={b.icon + labelOf(b)}
                  icon={b.icon}
                  label={labelOf(b)}
                  on={b.on}
                  go={b.go}
                  disabled={b.disabled}
                  onClick={b.action}
                />
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
