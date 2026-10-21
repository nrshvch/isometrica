/**
 * What goes over the world when no screen is up, along the bottom where a
 * thumb is: the bar of buttons - whatever holds them (bridge.js): the
 * building tools, or the action going on - and over it, on a card as wide,
 * a line of what to do. As wide as what is along the top on a phone; in
 * the middle on a desktop, where the top has the width of the screen.
 */
import { BarButton, Container, Icon, cx } from "../kit";
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

export default function WorldHud() {
  var hint = useGame(function (s) {
      return s.hint;
    }),
    buttons = useGame(function (s) {
      return s.buttons;
    }),
    shown = buttons.filter(Boolean),
    on = shown.find(function (b) {
      return b.on;
    });

  return (
    <Container className="flex flex-1 flex-col justify-end pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4">
      <div className="mx-auto flex w-full flex-col gap-2 sm:max-w-xl">
        {hint && <Hint text={hint} on={on} />}
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
