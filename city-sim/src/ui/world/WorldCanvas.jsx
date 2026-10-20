/**
 * Where the world is drawn: a box the engine puts its canvas in once the
 * game is up (session.js attach) - the one thing over which a tap is the
 * world's, and a drag or a pinch moves the camera rather than the page.
 * Whatever is laid over the world while it turns goes in here too
 * (isometrica client/turner).
 */
import { useEffect, useRef } from "react";
import { setContainer } from "../session";

export default function WorldCanvas() {
  var box = useRef(null);

  useEffect(function () {
    setContainer(box.current);

    return function () {
      setContainer(null);
    };
  }, []);

  return (
    <div
      ref={box}
      className="pointer-events-auto relative size-full touch-none overflow-hidden"
    />
  );
}
