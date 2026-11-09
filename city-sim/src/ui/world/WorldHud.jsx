/**
 * What goes over the world when no screen is up, along the bottom where a
 * thumb is: the bar of buttons - whatever holds them (bridge.js): the
 * building tools, or the action going on - and over it, on a card as wide,
 * a line of what to do. As wide as what is along the top on a phone; in
 * the middle on a desktop, where the top has the width of the screen.
 *
 * And right over the bar, while a building is looked at - tapped, with
 * nothing else going on - what can be done to it, on a card of its own:
 * its name, and putting something else up in its place (Replace).
 */
import Data from "isometrica/data/buildings";
import Replacement from "isometrica/core/replacement";
import { displayName } from "../catalogue/buildings";
import { BarButton, Container, Icon, cx } from "../kit";
import { goReplace } from "../session";
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
 * What can be done to the building looked at: its name - the kind it is -
 * and its buttons, the bar's own kind, on a card over the bar.
 */
function Actions({ inspected }) {
  var data = Data[Replacement.kindOf(inspected.code)];

  return (
    <div className="card pointer-events-auto flex max-w-full min-w-0 items-center gap-3 self-center py-1.5 pr-1 pl-3.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="label">Building</span>
        <span className="truncate font-extrabold">
          {data ? displayName(data) : ""}
        </span>
      </div>
      <BarButton
        icon="replace"
        label="Replace"
        onClick={function () {
          goReplace(inspected.tile);
        }}
      />
    </div>
  );
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
    shown = buttons.filter(Boolean),
    on = shown.find(function (b) {
      return b.on;
    });

  return (
    <Container className="flex flex-1 flex-col justify-end pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
      <div className="mx-auto flex w-full flex-col gap-2 sm:max-w-xl">
        {hint && <Hint text={hint} on={on} />}
        {inspected && <Actions inspected={inspected} />}
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
