/**
 * The music lab: plays the music the generator makes (src/shared/gen/
 * music.js) the way a game would (player.js) - pick a place, a time and a
 * weather, and change them while it plays.
 */
import { useEffect, useRef, useState } from "react";
import * as Music from "../../src/shared/gen/music.js";
import { wake } from "../../src/client/audio/wake.js";
import { Article, Button, Choice, Status } from "../ui/kit.jsx";
import { createPlayer } from "./player.js";

function Row({ label, children }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
      <span className="w-[70px] text-dim">{label}</span>
      {children}
    </div>
  );
}

//what the player says it is doing
function Told({ told }) {
  if (told === null) return null;

  if (told.making)
    return "making " + told.making + ": " + Music.WEATHERS.join(", ") + "...";

  var info = told.info;

  return (
    <>
      <b>{told.key}</b>
      {" - " +
        info.bpm +
        " bpm, " +
        info.bars +
        " bars, " +
        info.lead +
        ", " +
        info.seconds.toFixed(0) +
        " s a loop"}
      <br />
      {"made in " +
        told.seconds.toFixed(1) +
        " s (" +
        told.pieces
          .map(function (p) {
            return p[0] + " " + p[1].toFixed(1) + " s";
          })
          .join(", ") +
        ")"}
    </>
  );
}

export default function MusicPage() {
  var [want, setWant] = useState({
      place: "town",
      time: "day",
      weather: "clear",
    }),
    [on, setOn] = useState(false),
    [told, setTold] = useState(null),
    player = useRef(null);

  if (player.current === null) player.current = createPlayer(setTold);

  //what is wanted, played - or let fade
  useEffect(
    function () {
      if (on) player.current.play(want);
      else {
        player.current.stop();
        setTold(null);
      }
    },
    [on, want],
  );

  function choose(field) {
    return function (v) {
      setWant(function (was) {
        return Object.assign({}, was, { [field]: v });
      });
    };
  }

  return (
    <Article
      page="music"
      title="Music lab"
      about="Every piece src/shared/gen/music.js makes, played the way a game would: all three weathers of a place and time at once, from the same moment, the weather picking which is heard - change it while it plays and the music fades over without losing the beat. A new place or time fades over to its own piece."
    >
      <Row label="place">
        <Choice
          values={Music.PLACES}
          value={want.place}
          onChange={choose("place")}
        />
      </Row>
      <Row label="time">
        <Choice
          values={Music.TIMES}
          value={want.time}
          onChange={choose("time")}
        />
      </Row>
      <Row label="weather">
        <Choice
          values={Music.WEATHERS}
          value={want.weather}
          onChange={choose("weather")}
        />
      </Row>
      <Row>
        <Button
          on={on}
          className="px-3 py-1.5"
          onClick={function () {
            //woken now, in the click: a phone plays nothing from a context
            //woken once the music is made
            if (!on) wake();
            setOn(!on);
          }}
        >
          {on ? "stop" : "play"}
        </Button>
      </Row>
      <Status className="mt-3.5 min-h-[3em] text-muted">
        <Told told={told} />
      </Status>
    </Article>
  );
}
