/**
 * What the game's screens are built of: the world and what goes over it as
 * layers (LayeredLayout), the width they keep to (Container), its icons,
 * the HUD's buttons and the bar's, and the screens - a card over the world,
 * dimmed behind it.
 *
 * Over the world nothing takes a click by default - the layer over it is
 * pointer-events-none, so a tap goes through to the world's canvas - and
 * whatever is to be clicked says so itself, pointer-events-auto: a button,
 * a screen that covers the world.
 */
import ICONS from "./icons/index";

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
    <div className={cx("mx-auto w-full max-w-5xl px-2.5 sm:px-4", className)}>
      {children}
    </div>
  );
}

/**
 * One of the game's icons (ui/icons, by tools/genicons.js), by name: one
 * colour, the text's, size high - and as much wider as it is drawn, a road
 * a third. Its lines as wide as it is drawn with, or strokeWidth on a grid
 * 24 high, as the others' are - bolder on a tile, say.
 */
export function Icon({ name, size = 24, strokeWidth, className, ...props }) {
  var icon = ICONS[name];

  if (icon === undefined) return null;

  return (
    <svg
      viewBox={"0 0 " + icon.w + " " + icon.h}
      width={(size * icon.w) / icon.h}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={
        strokeWidth === undefined ? icon.stroke : (strokeWidth * icon.h) / 24
      }
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      className={cx("shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: icon.body }}
      {...props}
    />
  );
}

/**
 * A button of the HUD's own, on a card of its own: an icon, gold while it
 * is on - the view from above, the menu open.
 */
export function HudButton({ icon, label, on, className, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={on}
      className={cx("card hud-button", on && "on", className)}
      {...props}
    >
      <Icon name={icon} size={22} />
    </button>
  );
}

/**
 * A button of the bar along the bottom: its icon over its word - picked
 * (on), or the one that goes ahead (go).
 */
export function BarButton({ icon, label, on, go, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={on}
      className={cx("bar-button", on && "on", go && "go", className)}
      {...props}
    >
      <span className="well">
        <Icon name={icon} size={22} />
      </span>
      {label}
    </button>
  );
}

/**
 * A screen over the world: a card in the middle of the page, its title, a
 * way out in its corner, and what it holds - the page scrolling as it does
 * when that is taller than the window. The world behind it is dimmed by
 * the game screen (GameScreen).
 */
export function Screen({ title, aside, onClose, className, children }) {
  return (
    <Container className="flex flex-1 flex-col pt-2 pb-6">
      <section className="card flex flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b-[1.5px] border-inset px-4 py-3 sm:px-5">
          <h2 className="text-xl font-black">{title}</h2>
          {aside && <div className="text-sm text-muted">{aside}</div>}
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="-mr-1.5 ml-auto grid size-10 cursor-pointer place-items-center rounded-[3px] hover:bg-inset"
            >
              <Icon name="close" size={22} />
            </button>
          )}
        </header>
        <div className={cx("flex-1", className)}>{children}</div>
      </section>
    </Container>
  );
}
