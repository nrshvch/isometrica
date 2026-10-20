/**
 * What the game's screens are built of: the world and what goes over it as
 * layers (LayeredLayout), the width they keep to (Container), its icons,
 * the buttons floating over the world, and the screens - glass over the
 * world, dimmed behind them.
 *
 * Over the world nothing takes a click by default - the layer over it is
 * pointer-events-none, so a tap goes through to the world's canvas - and
 * whatever is to be clicked says so itself, pointer-events-auto: a button,
 * a screen that covers the world.
 */
import kit, { SIZE } from "isometrica/shared/icons/index";
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
    <div className={cx("mx-auto w-full max-w-5xl px-3 sm:px-4", className)}>
      {children}
    </div>
  );
}

/**
 * One of isometrica's icons (shared/icons) - by its own name, "road", or by
 * the one a button is given, "road-icon" (icons.js): one colour, the
 * text's, as big as it is made.
 */
export function Icon({ name, className, ...props }) {
  var path = kit[names[name] || name];

  if (path === undefined) return null;

  return (
    <svg
      viewBox={"0 0 " + SIZE + " " + SIZE}
      fill="currentColor"
      aria-hidden="true"
      className={cx("shrink-0", className)}
      {...props}
    >
      <path d={path} />
    </svg>
  );
}

//leaving is red, confirming green; the rest white
var TONES = {
  close: "text-bad",
  "cross-icon": "text-bad",
  check: "text-good",
  "tick-icon": "text-good",
};

/**
 * An icon floating over the world, to be clicked: outlined and shadowed to
 * read on anything, bigger under the pointer, and lit gold while it is on -
 * what a road is laid in, say. Its label under it, where there is room.
 */
export function FloatButton({ icon, label, on, className, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "group pointer-events-auto flex cursor-pointer flex-col items-center gap-1 focus-visible:outline-none",
        className,
      )}
      {...props}
    >
      <Icon
        name={icon}
        className={cx(
          "size-12 transition-transform duration-150 group-hover:scale-110 group-focus-visible:scale-110 group-active:scale-95 sm:size-14",
          on
            ? "icon-glow text-gold"
            : cx("icon-float", TONES[icon] || "text-white"),
        )}
      />
      {label && (
        <span
          className={cx(
            "text-float text-[11px] leading-none font-semibold tracking-wide whitespace-nowrap uppercase max-sm:hidden",
            on ? "text-gold" : "text-white/90",
          )}
        >
          {label}
        </span>
      )}
    </button>
  );
}

/**
 * A screen over the world: glass in the middle of the page, its title, a
 * way out in its corner, and what it holds - the page scrolling as it
 * does when that is taller than the window. The world behind it is dimmed
 * by the game screen (GameScreen).
 */
export function Screen({ title, aside, onClose, className, children }) {
  return (
    <Container className="flex flex-1 flex-col pt-2 pb-6">
      <section className="glass flex flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          {aside && <div className="text-sm text-muted">{aside}</div>}
          {onClose && (
            <button
              type="button"
              aria-label="Close"
              title="Close"
              onClick={onClose}
              className="ml-auto -mr-2 cursor-pointer rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Icon name="close" className="size-6" />
            </button>
          )}
        </header>
        <div className={cx("flex-1", className)}>{children}</div>
      </section>
    </Container>
  );
}
