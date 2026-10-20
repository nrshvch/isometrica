/**
 * What the game opens on while the world loads: its logo and its name,
 * which release it is - or "dev" and the commit (vite.config.js) - and who
 * made it.
 */
export default function Splash() {
  return (
    <div className="ui-ground fixed inset-0 z-50 flex items-center justify-center text-center text-[16px]">
      <div className="flex flex-col items-center">
        <img
          src="/logo.png"
          alt=""
          className="pixelated mb-4 size-32 drop-shadow-[3px_4px_0_rgba(0,0,0,0.35)]"
        />
        <h1 className="outlined-thick mb-3 text-[32px] font-bold">Peepsland</h1>
        <div className="outlined mt-1">{__VERSION__}</div>
        <div className="outlined mt-2">by Denis Narushevich</div>
      </div>
    </div>
  );
}
