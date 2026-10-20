/**
 * What the game's screens are built of: the world and what goes over it as
 * layers (LayeredLayout), the width they keep to (Container), its icons,
 * its buttons, and the screens' windows with their buttons along the
 * bottom.
 *
 * Over the world nothing takes a click by default - the layer over it is
 * pointer-events-none, so a tap goes through to the world's canvas - and
 * whatever is to be clicked says so itself, pointer-events-auto: a button,
 * a screen that covers the world.
 */
import kit, { SHADE, SIZE } from "isometrica/shared/icons/index";
import names from "./icons";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * The background and what goes over it, one on the other, both the whole
 * width: the background as tall as what is over it (at least the screen),
 * so a screen taller than the window scrolls the page the way any page
 * does. What goes over it is positioned, so that it is drawn over a
 * background kept in sight as the page scrolls (sticky, so positioned too).
 */
export function LayeredLayout({
  className,
  background,
  children,
  wrapperProps: { className: wrapperClassName, ...wrapperProps } = {},
  ...props
}) {
  return (
    <div className={cx("flex", className)} {...props}>
      <div className="mr-[-100%] min-h-full w-full">{background}</div>
      <div
        className={cx("relative min-h-full w-full", wrapperClassName)}
        {...wrapperProps}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * As wide as what goes over the world gets: the whole of a phone, the
 * middle of a desktop's screen - the world itself going on either side.
 */
export function Container({ className, children }) {
  return (
    <div className={cx("mx-auto w-full max-w-5xl px-3", className)}>
      {children}
    </div>
  );
}

/**
 * One of the kit's icons (isometrica shared/icons) - by its own name,
 * "road", or by the one a button is given, "road-icon" (icons.js). One
 * colour, the text's, and as big as it is made.
 */
export function Icon({ name, className, ...props }) {
  var icon = kit[names[name] || name];

  if (icon === undefined) return null;

  return (
    <svg
      viewBox={"0 0 " + SIZE + " " + SIZE}
      fill="currentColor"
      shapeRendering="crispEdges"
      aria-hidden="true"
      className={cx("shrink-0", className)}
      {...props}
    >
      {icon.solid && <path d={icon.solid} />}
      {icon.shade && <path d={icon.shade} opacity={SHADE} />}
    </svg>
  );
}

//leaving is red, confirming green, the rest the game's teal
var TONES = {
  close: "ui-button-danger",
  "cross-icon": "ui-button-danger",
  check: "ui-button-ok",
  "tick-icon": "ui-button-ok",
};

/**
 * A square button with an icon, over the world: on for a toggle switched
 * on - what a road is laid in, say - sunk in and ringed in white.
 */
export function IconButton({ icon, on, className, iconClassName, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "ui-button ui-shadow pointer-events-auto grid shrink-0 place-items-center rounded-lg border-2 text-white transition-transform active:translate-y-px",
        TONES[icon],
        on && "ui-button-on ring-2 ring-white ring-offset-1 ring-offset-ink",
        className,
      )}
      {...props}
    >
      <Icon name={icon} className={cx("size-3/5", iconClassName)} />
    </button>
  );
}

/**
 * A screen over the world: a window in the middle of the page, on the game's
 * patterned ground, with its buttons along the bottom, kept in sight as the
 * page scrolls. The world behind it is dimmed by the game screen
 * (GameScreen).
 */
export function Screen({ className, buttons, children }) {
  return (
    <Container className="flex flex-1 flex-col pt-2 pb-3">
      <div className="ui-ground ui-shadow flex flex-1 flex-col overflow-clip rounded-xl border-2 border-block-dark">
        <div className={cx("flex-1", className)}>{children}</div>
        {buttons && <WindowButtons buttons={buttons} />}
      </div>
    </Container>
  );
}

/**
 * The buttons along the bottom of a screen, sharing its width: {icon, text,
 * onClick} each.
 */
export function WindowButtons({ buttons }) {
  return (
    <div className="sticky bottom-0 flex h-14">
      {buttons.map(function (b) {
        return (
          <button
            key={b.text}
            type="button"
            onClick={b.onClick}
            className={cx(
              "ui-button flex flex-1 items-center justify-center gap-2 overflow-hidden whitespace-nowrap",
              TONES[b.icon],
            )}
          >
            <Icon name={b.icon} className="size-6" />
            <span className="text-[11pt] font-bold">{b.text}</span>
          </button>
        );
      })}
    </div>
  );
}
