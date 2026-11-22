/**
 * The climate bench's page (scene.js): every zone of the climate on one
 * island, the way the game draws it - where each gives way to the next, the
 * water freezing over, the trees and the stones of each - warmer or colder,
 * turned round, from above, nearer or further.
 */
import { useEffect, useRef, useState } from "react";
import { open } from "../bench/world.js";
import { Scene, W, H } from "./scene.js";
import { Button, Header, Select } from "../ui/kit.jsx";

//how much warmer or colder than it starts, °C
var WARMTHS = [-6, -4, -2, 0, 2, 4, 6].map(function (t) {
  return { value: t, label: (t > 0 ? "+" : "") + t + "°" };
});

//how near the camera is (engine CameraComponent zoom): the whole island,
//and nearer
var ZOOMS = [0.25, 0.35, 0.5, 0.667, 1, 1.5, 2];

function Section({ title, children }) {
  return (
    <>
      <h2 className="mt-3 mb-1 font-bold text-accent">{title}</h2>
      {children}
    </>
  );
}

function Note({ children }) {
  return <p className="mt-0.5 mb-1.5 leading-[1.45] text-muted">{children}</p>;
}

//the nearest of ZOOMS for the whole island to be seen in el
function fitting(el) {
  //the island seen from the side: its width and height, pixels at zoom 1
  var w = (W + H) * 32,
    h = (W + H) * 16,
    fit = Math.min(el.clientWidth / w, el.clientHeight / h);

  return ZOOMS.reduce(function (best, z) {
    return z <= fit && z > best ? z : best;
  }, ZOOMS[0]);
}

export default function Climate() {
  var el = useRef(null),
    bench = useRef(null),
    [ready, setReady] = useState(false),
    [failed, setFailed] = useState(""),
    [warmth, setWarmth] = useState(0),
    [zoom, setZoom] = useState(ZOOMS[0]),
    [top, setTop] = useState(false),
    [zones, setZones] = useState([]);

  //the world, up once
  useEffect(function () {
    open(el.current).then(
      function (world) {
        //at the game's own pace: the water moving
        world.speed = 1;
        bench.current = new Scene(world);
        window.bench.scene = bench.current;

        var z = fitting(el.current);

        world.client.camera.cameraScript.zoom(z);
        setZoom(z);
        setZones(bench.current.zones());
        setReady(true);
      },
      function (e) {
        console.error(e);
        setFailed(String(e && e.message ? e.message : e));
      },
    );
  }, []);

  function scene() {
    return bench.current;
  }

  function zoomTo(z) {
    scene().world.client.camera.cameraScript.zoom(z);
    setZoom(z);
  }

  var at = ZOOMS.indexOf(zoom);

  return (
    <div className="flex h-screen flex-col text-xs">
      <Header page="climate" className="gap-1.5 py-1.5">
        <Select
          title="warmer or colder"
          options={WARMTHS}
          value={warmth}
          onChange={function (e) {
            var t = +e.target.value;

            setWarmth(t);
            if (!scene()) return;
            scene().warm(t);
            setZones(scene().zones());
          }}
        />
        <Button
          className="px-1.5 py-0.5"
          title="further"
          disabled={!ready || at <= 0}
          onClick={function () {
            zoomTo(ZOOMS[at - 1]);
          }}
        >
          −
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="nearer"
          disabled={!ready || at >= ZOOMS.length - 1}
          onClick={function () {
            zoomTo(ZOOMS[at + 1]);
          }}
        >
          +
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="the whole island"
          disabled={!ready}
          onClick={function () {
            scene().world.look(0, 0);
            zoomTo(fitting(el.current));
          }}
        >
          all
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn left"
          disabled={!ready || top}
          onClick={function () {
            scene().world.turn(-1);
          }}
        >
          ⟲
        </Button>
        <Button
          className="px-1.5 py-0.5"
          title="turn the camera a quarter turn right"
          disabled={!ready || top}
          onClick={function () {
            scene().world.turn(1);
          }}
        >
          ⟳
        </Button>
        <Button
          className="px-1.5 py-0.5"
          on={top}
          disabled={!ready}
          onClick={function () {
            scene().world.top(!top);
            setTop(!top);
          }}
        >
          from above
        </Button>
      </Header>

      <div className="flex min-h-0 flex-1 max-[700px]:flex-col">
        <div className="relative min-h-0 min-w-0 flex-1 bg-black">
          <div ref={el} className="absolute inset-0" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center text-muted">
              {failed ? "could not start: " + failed : "starting…"}
            </div>
          )}
        </div>

        <aside className="w-80 flex-none overflow-y-auto border-l border-line px-2.5 py-2 max-[700px]:h-[45%] max-[700px]:w-auto max-[700px]:border-t max-[700px]:border-l-0">
          <Note>
            Every zone of the climate on one island, drawn the way the game
            draws it: hot at one end, cold at the other, what the world spreads
            over thousands of tiles pressed into a few dozen. Where one zone
            gives way to the next their tiles are mixed in patches, the ground
            of the one spilling over the edges of the other.
          </Note>
          <Note>
            A river winds through every zone and the sea is all round, so each
            has its shore - and out in the cold the water freezes over, the ice
            closing over open water from its edges. Hills stand in every zone
            for its ground on the slopes; the trees and the stones are the ones
            the world puts there by itself.
          </Note>

          <Section title="Along the island">
            {zones.map(function (z) {
              return (
                <div key={z.name}>
                  {z.name}: from {z.from} tiles in
                </div>
              );
            })}
            <Note>
              Going on into the cold, the pines die off first, then the firs,
              then only dead trunks stand in the snow, and at the far end there
              is nothing at all. Warmer or colder moves every zone along it, the
              way warming the world moves them out from its middle.
            </Note>
          </Section>
        </aside>
      </div>
    </div>
  );
}
