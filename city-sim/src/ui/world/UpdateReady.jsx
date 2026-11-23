/**
 * A new release of the game ready (ui/updates.js), said over the world's
 * buttons: the page reloaded on it - the city written out on the way, as
 * when the tab is closed - or put away for now.
 */
import { Icon } from "../kit";
import { putUpdateAway, reloadForUpdate } from "../updates";

export default function UpdateReady() {
  return (
    <div className="card pointer-events-auto flex items-center gap-3 p-2.5">
      <span className="tile tile-green">
        <Icon name="rotate" size={22} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="label">New version</span>
        <span className="leading-snug font-extrabold text-balance">
          Peepsland has been updated
        </span>
      </div>
      <button
        type="button"
        className="btn btn-primary shrink-0"
        onClick={reloadForUpdate}
      >
        Reload
      </button>
      <button
        type="button"
        aria-label="Not now"
        title="Not now"
        className="grid size-9 shrink-0 cursor-pointer place-items-center text-muted hover:text-ink"
        onClick={putUpdateAway}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
