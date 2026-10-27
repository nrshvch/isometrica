/**
 * The one AudioContext the game (client/audio) and the lab play through, woken in the tap or click that asks for sound
 * - the way iPhones and iPads want it. Safari there plays nothing from a
 * context made or resumed outside a tap (one made after the sound is, a
 * moment later, stays suspended), and plays Web Audio as the ringer does:
 * not at all with the silent switch on - unless the page says it plays
 * media (navigator.audioSession, Safari 16.4 on), or, before that, has an
 * <audio> element playing (silence, looped).
 */
var context = null,
  quiet = null;

//on an iPhone or iPad - iPadOS says it is a Mac, but a Mac has no touch
function apple() {
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

//a second of silence as a WAV: 8 kHz, 8 bit, mono
function silence() {
  var n = 8000,
    bytes = new Uint8Array(44 + n),
    view = new DataView(bytes.buffer),
    text = function (at, s) {
      for (var i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i);
    };

  text(0, "RIFF");
  view.setUint32(4, 36 + n, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 8000, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true);
  text(36, "data");
  view.setUint32(40, n, true);
  bytes.fill(128, 44);

  return URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
}

/**
 * The context, made and running - call it straight from the tap or click,
 * before anything is waited for.
 */
export function wake() {
  if (navigator.audioSession) {
    try {
      navigator.audioSession.type = "playback";
    } catch (e) {
      //not to be had: as it was
    }
  } else if (apple()) {
    if (quiet === null) {
      quiet = new Audio(silence());
      quiet.loop = true;
      quiet.setAttribute("playsinline", "");
    }

    //and again after it was put to sleep (sleep)
    if (quiet.paused) quiet.play().catch(function () {});
  }

  if (context === null)
    context = new (window.AudioContext || window.webkitAudioContext)();

  //suspended when made outside a tap, interrupted by a call or the lock
  if (context.state !== "running") context.resume();

  return context;
}

/**
 * Puts it to sleep while nothing is to be heard - the sound and the music
 * both turned off: the context stopped, so that the phone's audio stops
 * with it, and the silence looped for an iPhone paused. wake, from the tap
 * that turns either back on, starts them again.
 */
export function sleep() {
  if (quiet !== null) quiet.pause();
  if (context !== null && context.state === "running") context.suspend();
}

//the context, as it is: for what plays after the tap that woke it
export function audio() {
  return context || wake();
}
