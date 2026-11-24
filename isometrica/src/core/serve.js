import Logic from "./logic";
import Server, { STEP } from "./server";

//a Storage with nothing in it, that keeps nothing
var NOWHERE = {
  length: 0,
  getItem: function () {
    return null;
  },
  setItem: function () {},
  removeItem: function () {},
  key: function () {
    return null;
  },
};

/**
 * The world on a worker: a server (core/server) on a world of its own,
 * opened the way the page opened its copy, moved on by real time and told
 * what the player does; its frames, and its saves, posted to the page
 * (client/host OnWorker). Messages in: open {options, opened, view}, command
 * {id, text}, pause, resume, view {view}, check {id}, run {ms} (a tool's
 * own time, with timer off). Out: frame {bytes} (transferred), save {text,
 * name}, check {id, version, save}. See
 * isometrica/.claude/skills/buildings/server.md.
 *
 * @param post {function(Object, Array=)} postMessage
 * @param [timer] {boolean} whether it moves on by the real clock (true), or
 *        only as run says
 * @returns {function(Object)} what is given every message
 */
export default function serve(post, timer) {
  var world = null,
    server = null,
    last = 0,
    interval = null;

  function flush() {
    if (server === null || server.flush() === null) return;

    var bytes = server.writer.copy();

    post({ type: "frame", bytes: bytes }, [bytes]);
  }

  function step() {
    var now = performance.now(),
      ms = now - last;

    last = now;
    server.run(ms);
    flush();
  }

  function open(m) {
    var opened = m.opened,
      now = null;

    world = new Logic(
      Object.assign({}, m.options, {
        //nothing kept here: saves go to the page (#saver)
        storage: NOWHERE,
        api: null,
        //as it was when the page opened its copy, while this one is opened
        now: function () {
          return now !== null ? now : Date.now();
        },
      }),
    );
    world.driveBy();
    world.start();
    world.persistence.saver = function (data) {
      post({
        type: "save",
        text: JSON.stringify(data),
        name: data.city ? data.city.name : "",
      });
    };
    if (m.view) world.persistence.setView(m.view);

    if (opened !== null) {
      now = opened.now;
      world.persistence.put(opened);
      now = null;
    }

    server = new Server(world);
    flush();

    last = performance.now();
    if (timer !== false) interval = setInterval(step, STEP);
  }

  return function receive(m) {
    switch (m.type) {
      case "open":
        open(m);
        break;
      case "command":
        try {
          server.receive(m.text, m.id);
        } catch (e) {
          console.error("A command went wrong:", e);
        }
        flush();
        break;
      case "run":
        server.run(m.ms);
        flush();
        break;
      case "pause":
        server.pause();
        flush();
        break;
      case "resume":
        last = performance.now();
        server.resume();
        flush();
        break;
      case "view":
        world.persistence.setView(m.view);
        break;
      case "check":
        flush();
        var data = world.persistence.snapshot();

        if (data !== null) delete data.savedAt;
        post({
          type: "check",
          id: m.id,
          version: server.version,
          save: JSON.stringify(data),
        });
        break;
      case "close":
        if (interval !== null) clearInterval(interval);
        interval = null;
        world.pause();
        world.persistence.halt();
        break;
    }
  };
}
