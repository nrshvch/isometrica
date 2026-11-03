/**
 * The player welcomed back after a while away, on a card over the world: how
 * long they were gone, how long the city went on without them - up to a day
 * of its own (isometrica core/logic catchUp) - and what it made meanwhile,
 * under the button that sees it floated up over the city
 * (session closeWelcome).
 */
import Numeral from "numeral";
import { Container, Icon, cx } from "../kit";
import { closeWelcome } from "../session";

var MINUTE = 60000,
  HOUR = 60 * MINUTE,
  DAY = 24 * HOUR;

//how long, in the biggest of days, hours and minutes it makes one of
function duration(ms) {
  var units = [
      [DAY, "day"],
      [HOUR, "hour"],
      [MINUTE, "minute"],
    ],
    i,
    n;

  for (i = 0; i < units.length; i++) {
    n = Math.floor(ms / units[i][0]);

    if (n >= 1 || i === units.length - 1) {
      n = Math.max(1, n);

      return n === 1
        ? (units[i][1] === "hour" ? "an " : "a ") + units[i][1]
        : n + " " + units[i][1] + "s";
    }
  }
}

function money(amount) {
  return "$" + Numeral(Math.abs(amount)).format("0,0");
}

export default function Welcome({ welcome }) {
  var earned = welcome.money >= 1,
    spent = welcome.money <= -1;

  return (
    <Container className="flex flex-1 items-center justify-center pb-24">
      <div
        role="dialog"
        aria-labelledby="welcome"
        className="card pointer-events-auto w-full max-w-md p-4 sm:p-5"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="tile tile-gold">
            <Icon name="clock" size={24} />
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="label">Welcome back</span>
            <h2 id="welcome" className="text-lg leading-snug font-black">
              You were away for {duration(welcome.away)}
            </h2>
          </div>
        </div>
        <p className="leading-snug text-balance">
          {welcome.name || "Your city"} kept going without you:{" "}
          {duration(welcome.went)} went by there
          {earned ? (
            <>
              , and it earned{" "}
              <b className="text-good">{money(welcome.money)}</b>.
            </>
          ) : spent ? (
            <>
              , and it spent <b className="text-bad">{money(welcome.money)}</b>{" "}
              more than it took in.
            </>
          ) : (
            "."
          )}
        </p>
        {welcome.capped && (
          <p className="mt-2 text-sm leading-snug text-muted">
            A city goes on for up to a day of its own while you are away.
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            autoFocus
            className="btn min-w-36 flex-col gap-0 py-2"
            onClick={closeWelcome}
          >
            <span className="text-lg leading-tight">OK</span>
            {(earned || spent) && (
              <span
                className={cx(
                  "text-[13px] leading-tight tabular-nums",
                  earned ? "text-good" : "text-bad",
                )}
              >
                {(earned ? "+" : "-") + money(welcome.money)}
              </span>
            )}
          </button>
        </div>
      </div>
    </Container>
  );
}
