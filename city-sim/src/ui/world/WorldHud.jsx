/**
 * What goes over the world when no screen is up: a line of what to do, in
 * the upper half, and the buttons along the bottom - five slots, a fifth of
 * the width each - whatever holds them (bridge.js): the building tools, or
 * the action going on.
 */
import names from "../icons";
import { Container, IconButton } from "../kit";
import { useGame } from "../store";

//what each button does, said for whoever cannot see the icon - by the
//kit's name of it
var TITLES = {
  close: "Leave",
  check: "Done",
  house: "Build",
  road: "Asphalt road",
  gravel: "Gravel road",
  cobble: "Cobbled road",
  bulldozer: "Shape the ground",
  land: "Buy land",
  rotate: "Turn round",
  dice: "Another one",
  raise: "Raise the ground",
  lower: "Lower the ground",
};

function titleOf(icon) {
  var name = names[icon] || icon;

  return TITLES[name] || TITLES[name.split("-")[0]] || name;
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
      <div className="flex flex-1 items-center justify-center text-center">
        {hint && (
          <div className="ui-float outlined px-4 py-2 text-[12pt] font-bold">
            {hint}
          </div>
        )}
      </div>
      <div className="flex-1" />
      <div className="grid grid-cols-5 place-items-center">
        {slots.map(function (i) {
          var b = buttons[i];

          return b ? (
            <IconButton
              key={i}
              icon={b.icon}
              on={b.on}
              title={titleOf(b.icon)}
              aria-label={titleOf(b.icon)}
              aria-pressed={b.on}
              onClick={b.action}
              className="size-14 sm:size-16"
            />
          ) : (
            <div key={i} className="size-14 sm:size-16" />
          );
        })}
      </div>
    </Container>
  );
}
