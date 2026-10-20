/**
 * The lighting bench's page: the town drawn over the whole window, a frame
 * at a time (bench.js), and over it the panel that says how - the way of
 * lighting it, what of it to show, how big a town, what hour - and how long
 * it takes. The day runs on by itself, unless told not to.
 */
import { useEffect, useRef, useState } from "react";
import { Field, Select, cx } from "../ui/kit.jsx";
import { render, resize } from "./bench.js";

var MODES = [
    { value: "lit", label: "baked sun (today)" },
    { value: "seq", label: "deferred, two loops" },
    { value: "int", label: "deferred, one loop, two canvases" },
    { value: "faces", label: "three faces, three loops" },
    { value: "faces1", label: "three faces, one loop" },
  ],
  SHOWS = [
    { value: "frame", label: "frame" },
    { value: "map", label: "map (faces: what looks up)" },
    { value: "light", label: "light (faces: what looks -y)" },
  ],
  SIZES = [12, 24, 40, 64].map(function (n) {
    return { value: n, label: n + " × " + n };
  });

function Check({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-1.5">
      <input
        type="checkbox"
        className="accent-act"
        checked={checked}
        onChange={function (e) {
          onChange(e.target.checked);
        }}
      />
      {label}
    </label>
  );
}

export default function Lighting() {
  var canvas = useRef(null),
    [mode, setMode] = useState("seq"),
    [show, setShow] = useState("frame"),
    [size, setSize] = useState(24),
    [time, setTime] = useState(9),
    [animate, setAnimate] = useState(true),
    [pan, setPan] = useState(true),
    [stats, setStats] = useState(null),
    //the hour, as the loop runs it on
    hour = useRef(time),
    //what the frames are drawn by, read by the loop as it is now
    wanted = useRef(null);

  wanted.current = {
    mode: mode,
    show: show,
    size: size,
    animate: animate,
    pan: pan,
  };

  //as big as the window
  useEffect(function () {
    function resized() {
      resize(canvas.current, window.innerWidth, window.innerHeight);
    }

    window.addEventListener("resize", resized);
    resized();

    return function () {
      window.removeEventListener("resize", resized);
    };
  }, []);

  //a frame at a time, the hour running on by the time between them
  useEffect(function () {
    var ask = requestAnimationFrame(tick),
      last = 0;

    function tick(now) {
      var s = wanted.current,
        dt = last ? now - last : 0;

      last = now;

      if (s.animate) {
        hour.current = (hour.current + dt / 1000) % 24;
        setTime(hour.current);
      }

      setStats(render(now, Object.assign({ time: hour.current }, s)));
      ask = requestAnimationFrame(tick);
    }

    return function () {
      cancelAnimationFrame(ask);
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden text-xs">
      <canvas ref={canvas} className="block [image-rendering:pixelated]" />
      <div className="fixed top-2 left-2 flex flex-col gap-1.5 bg-black/70 px-2.5 py-2">
        <a className="font-bold text-accent hover:underline" href="./">
          isometrica <span className="font-normal text-text">/ lighting</span>
        </a>
        <Field label="mode">
          <Select
            options={MODES}
            value={mode}
            onChange={function (e) {
              setMode(e.target.value);
            }}
          />
        </Field>
        <Field label="show">
          <Select
            options={SHOWS}
            value={show}
            onChange={function (e) {
              setShow(e.target.value);
            }}
          />
        </Field>
        <Field label="tiles">
          <Select
            options={SIZES}
            value={size}
            onChange={function (e) {
              setSize(+e.target.value);
            }}
          />
        </Field>
        <Field label="time">
          <input
            type="range"
            min="0"
            max="24"
            step="0.05"
            className="accent-act"
            value={time}
            onChange={function (e) {
              hour.current = +e.target.value;
              setTime(hour.current);
            }}
          />
        </Field>
        <Check label="run the day" checked={animate} onChange={setAnimate} />
        <Check label="pan the camera" checked={pan} onChange={setPan} />
        <div
          className={cx("whitespace-pre text-[#9fe39f]", !stats && "invisible")}
        >
          {stats &&
            "sprites  " +
              stats.draws +
              " draws\n" +
              "frame    " +
              stats.frame.toFixed(2) +
              " ms (" +
              (1000 / Math.max(1, stats.frame)).toFixed(0) +
              " fps)\n" +
              "js       " +
              stats.js.toFixed(2) +
              " ms\n" +
              "time     " +
              time.toFixed(1) +
              " h"}
        </div>
      </div>
    </div>
  );
}
