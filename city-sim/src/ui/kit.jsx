/**
 * What the game's screens are built of: the world and what goes over it as
 * layers (LayeredLayout), its icons, and the screens' windows with their
 * buttons along the bottom.
 *
 * Over the world nothing takes a click by default - the layer over it is
 * pointer-events-none, so a tap goes through to the world's canvas - and
 * whatever is to be clicked says so itself, pointer-events-auto: a button,
 * a screen that covers the world.
 */
import icons from "./icons";

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

//one of the game's icons, by name (icons.js)
export function Icon({ name, className, ...props }) {
  return (
    <img
      alt=""
      draggable={false}
      src={icons[name]}
      className={cx("pixelated", className)}
      {...props}
    />
  );
}

/**
 * A screen over the world, covering it: the patterned ground, the screen's
 * own, and its buttons along the bottom, kept in sight as it scrolls.
 */
export function Screen({ className, buttons, children }) {
  return (
    <div className="ui-ground pointer-events-auto flex flex-1 flex-col">
      <div className={cx("flex-1", className)}>{children}</div>
      {buttons && <WindowButtons buttons={buttons} />}
    </div>
  );
}

/**
 * The buttons along the bottom of a screen, sharing its width: {icon, text,
 * onClick} each.
 */
export function WindowButtons({ buttons }) {
  return (
    <div className="sticky bottom-0 flex h-16">
      {buttons.map(function (b) {
        return (
          <button
            key={b.text}
            type="button"
            onClick={b.onClick}
            className="ui-button flex flex-1 items-center justify-center gap-1 overflow-hidden whitespace-nowrap"
          >
            <Icon name={b.icon} className="h-1/2 max-w-1/4" />
            <span className="text-[10pt]">{b.text}</span>
          </button>
        );
      })}
    </div>
  );
}
