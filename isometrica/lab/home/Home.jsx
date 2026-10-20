/**
 * The lab's front page: what is in it, a page at a time.
 */
import { PAGES } from "../ui/pages.js";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1.5 text-base font-bold">isometrica lab</h1>
      <p className="mb-5 leading-relaxed text-muted">
        What the world's generators make, to look at and listen to without a
        game: everything here is painted or played in the page itself, from the
        same code the games use - nothing is a file made beforehand.
      </p>
      {PAGES.map(function (p) {
        return (
          <a
            key={p.id}
            href={"./" + p.id + ".html"}
            className="mb-2.5 block border border-line bg-panel px-3.5 py-3 text-text no-underline hover:border-accent"
          >
            <b className="text-sm text-accent">{p.name}</b>
            <span className="mt-1 block leading-normal text-muted">
              {p.about}
            </span>
          </a>
        );
      })}
    </main>
  );
}
