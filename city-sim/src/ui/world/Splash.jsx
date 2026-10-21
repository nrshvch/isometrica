/**
 * What the game opens on while the world loads: its name, which release it
 * is - or "dev" and the commit (vite.config.js) - and who made it, on the
 * night's blue, lighter in the middle - a circle as wide as the window is
 * high, whatever its shape.
 */
export default function Splash() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_60svh_at_center,#363b6c_0%,#1b2340_100%)] text-center text-paper">
      <div className="flex flex-col items-center">
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
