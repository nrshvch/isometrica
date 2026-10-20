/**
 * What the game opens on while the world loads: its name, which release it
 * is - or "dev" and the commit (vite.config.js) - and who made it.
 */
export default function Splash() {
  return (
    <div className="ui-ground fixed inset-0 z-50 flex items-center justify-center text-center text-[16px]">
      <div>
        <h1 className="outlined-thick mb-3 text-[32px] font-bold">Peepsland</h1>
        <div className="outlined mt-3">{__VERSION__}</div>
        <div className="outlined mt-3">by Denis Narushevich</div>
      </div>
    </div>
  );
}
