/**
 * What the lab's pages are built of: the bar at the top of a page, buttons,
 * the fields, a line of what is going on.
 */
import { PAGES } from "./pages.js";

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * The bar at the top of a page: where it is in the lab, whatever the page
 * puts in it, and the other pages.
 */
export function Header({ page, className, children }) {
  return (
    <header
      className={cx(
        "flex flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2 text-xs",
        className,
      )}
    >
      <h1 className="mr-2 text-[13px] font-bold">
        <a className="text-accent hover:underline" href="./">
          isometrica
        </a>{" "}
        / {page}
      </h1>
      {children}
      <nav className="ml-auto flex flex-wrap gap-x-3 gap-y-1 max-md:hidden">
        {PAGES.map(function (p) {
          return (
            <a
              key={p.id}
              href={"./" + p.id + ".html"}
              className={
                p.id === page ? "text-text" : "text-dim hover:text-accent"
              }
            >
              {p.id}
            </a>
          );
        })}
      </nav>
    </header>
  );
}

//a page of text, its title and what it is, and what there is on it
export function Article({ page, wide, title, about, children }) {
  return (
    <div className="min-h-screen">
      <Header page={page} />
      <main
        className={cx("mx-auto px-4 py-4", wide ? "max-w-6xl" : "max-w-3xl")}
      >
        <h2 className="mb-1 text-[15px] font-bold">{title}</h2>
        {about && <p className="mb-4 leading-normal text-muted">{about}</p>}
        {children}
      </main>
    </div>
  );
}

export function Button({ on, className, ...props }) {
  return (
    <button
      type="button"
      className={cx(
        "cursor-pointer border px-2.5 py-1 text-[#eee] disabled:cursor-wait disabled:opacity-50",
        on
          ? "border-on-edge bg-on"
          : "border-act-edge bg-act hover:brightness-110",
        className,
      )}
      {...props}
    />
  );
}

/**
 * One of a few, as buttons in a row: the one chosen is on.
 */
export function Choice({ values, value, onChange, className }) {
  return (
    <span className={cx("inline-flex flex-wrap gap-1.5", className)}>
      {values.map(function (v) {
        var key = typeof v === "object" ? v.value : v,
          label = typeof v === "object" ? v.label : v;

        return (
          <Button
            key={key}
            on={key === value}
            onClick={function () {
              onChange(key);
            }}
          >
            {label}
          </Button>
        );
      })}
    </span>
  );
}

var FIELD =
  "border border-edge bg-ink px-1.5 py-0.5 text-[#eee] outline-none focus:border-accent";

/**
 * A select of options, each a value or { value, label }.
 */
export function Select({ options, className, ...props }) {
  return (
    <select className={cx(FIELD, className)} {...props}>
      {options.map(function (o) {
        var value = typeof o === "object" ? o.value : o;

        return (
          <option key={value} value={value}>
            {typeof o === "object" ? o.label : o}
          </option>
        );
      })}
    </select>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx(FIELD, className)} {...props} />;
}

export function TextArea({ className, ...props }) {
  return <textarea className={cx(FIELD, className)} {...props} />;
}

//a field with what it is in front of it
export function Field({ label, className, children }) {
  return (
    <label
      className={cx("inline-flex items-center gap-1.5 text-muted", className)}
    >
      {label}
      {children}
    </label>
  );
}

//a line of what is going on
export function Status({ className, children }) {
  return (
    <div className={cx("min-h-[1.5em] leading-normal text-dim", className)}>
      {children}
    </div>
  );
}
