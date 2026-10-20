/**
 * What goes over the world when no screen is up: a line of what to do, in
 * the upper half, and the buttons along the bottom - five slots, a fifth of
 * the width each - whatever holds them (bridge.js): the building tools, or
 * the action going on.
 */
import { Icon, cx } from "../kit";
import { useGame } from "../store";

export default function WorldHud() {
  var hint = useGame(function (s) {
      return s.hint;
    }),
    buttons = useGame(function (s) {
      return s.buttons;
    }),
    slots = [0, 1, 2, 3, 4];

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        {hint && <div className="outlined-thick text-[12pt]">{hint}</div>}
      </div>
      <div className="flex-1" />
      <div className="flex h-[10svh]">
        {slots.map(function (i) {
          var b = buttons[i];

          return (
            <div key={i} className="flex w-1/5 items-center justify-center">
              {b && (
                <button
                  type="button"
                  onClick={b.action}
                  className={cx(
                    "pointer-events-auto aspect-square h-4/5 cursor-pointer",
                    b.on && "toggled",
                  )}
                >
                  <Icon name={b.icon} className="size-full" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
