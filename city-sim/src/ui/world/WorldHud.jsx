/**
 * What goes over the world when no screen is up: a line of what to do, in
 * the upper half, and the buttons along the bottom - five slots, a fifth of
 * the width each - whatever holds them (bridge.js): the building tools, or
 * the action going on.
 */
import names from "../icons";
import { Container, FloatButton } from "../kit";
import { useGame } from "../store";

//what a button says under it, when what puts it up does not say - the
//toggles of what is being done (isometrica client/buildman, terrainman),
//by the kit's name of their icon
var LABELS = {
  close: "Cancel",
  check: "Done",
  rotate: "Turn",
  dice: "Another",
  road: "Asphalt",
  gravel: "Gravel",
  cobble: "Cobbles",
  bulldozer: "Clear",
  raise: "Raise",
  lower: "Lower",
};

function labelOf(b) {
  if (b.label) return b.label;

  var name = names[b.icon] || b.icon;

  return LABELS[name] || LABELS[name.split("-")[0]] || "";
}

export default function WorldHud() {
  var hint = useGame(function (s) {
      return s.hint;
    }),
    buttons = useGame(function (s) {
      return s.buttons;
    }),
    slots = [0, 1, 2, 3, 4];

  return (
    <Container className="flex flex-1 flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        {hint && (
          <div className="text-float max-w-xl text-lg leading-snug font-semibold text-balance">
            {hint}
          </div>
        )}
      </div>
      <div className="flex-1" />
      <div className="mx-auto grid w-full max-w-2xl grid-cols-5 place-items-center">
        {slots.map(function (i) {
          var b = buttons[i];

          return b ? (
            <FloatButton
              key={i}
              icon={b.icon}
              on={b.on}
              label={labelOf(b)}
              aria-pressed={b.on}
              onClick={b.action}
            />
          ) : (
            <div key={i} />
          );
        })}
      </div>
    </Container>
  );
}
