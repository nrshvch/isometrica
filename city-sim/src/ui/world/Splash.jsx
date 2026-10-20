/**
 * What the game opens on while the world loads: its logo and its name,
 * which release it is - or "dev" and the commit (vite.config.js) - and who
 * made it.
 */
export default function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#363b6c_0%,#1b2340_70%)] text-center text-paper">
      <div className="flex flex-col items-center">
        <img
          src="/logo.png"
          alt=""
          className="pixelated mb-5 size-32 drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
        />
        <h1 className="text-5xl font-black tracking-tight">Peepsland</h1>
        <div className="mt-3 text-sm font-bold text-[#a9aed6]">
          {__VERSION__}
        </div>
        <div className="mt-1 text-sm font-bold text-[#a9aed6]">
          by Denis Narushevich
        </div>
      </div>
    </div>
  );
}
