/**
 * Writes out every sound src/shared/gen/sounds.js makes - the same sounds
 * the game makes for itself - as .wav files to listen to, and to try a
 * change to a sound on before the game gets it.
 *
 * Each is <sound>-<way>.wav - thunder-0.wav, siren-2.wav - 16-bit stereo, at
 * the generator's rate unless another is given. Those that loop go round
 * without a seam: a player set to loop plays them as the game would.
 *
 * Usage:
 *   node tools/gensounds.js [outDir] [rate] [name...]
 *
 * outDir is assets/previews/sounds unless given; name, "thunder/2" or just
 * "thunder", writes only those.
 */

var fs = require("fs");
var path = require("path");
var sounds = require("../src/shared/gen/sounds.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/sounds");

/**
 * A sound as a .wav file: 16-bit PCM, the channels interleaved.
 */
function wav(sound) {
  var ch = sound.channels,
    n = ch[0].length,
    channels = ch.length,
    bytes = n * channels * 2,
    buf = Buffer.alloc(44 + bytes),
    o = 44;

  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sound.rate, 24);
  buf.writeUInt32LE(sound.rate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(bytes, 40);

  for (var i = 0; i < n; i++)
    for (var c = 0; c < channels; c++) {
      var x = Math.max(-1, Math.min(1, ch[c][i]));

      buf.writeInt16LE(Math.round(x * 32767), o);
      o += 2;
    }

  return buf;
}

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    rate = +process.argv[3] || sounds.RATE,
    only = process.argv.slice(4),
    wanted = sounds.list().filter(function (s) {
      return (
        only.length === 0 ||
        only.indexOf(s.name) !== -1 ||
        only.indexOf(s.sound) !== -1
      );
    });

  fs.mkdirSync(out, { recursive: true });

  wanted.forEach(function (s) {
    var started = Date.now(),
      sound = sounds.generate(s.name, rate),
      file = path.join(out, s.sound + "-" + s.way + ".wav");

    fs.writeFileSync(file, wav(sound));

    console.log(
      s.name.padEnd(10) +
        (s.label + (s.loop ? ", loops" : "")).padEnd(24) +
        (sound.channels[0].length / rate).toFixed(1) +
        " s, made in " +
        (Date.now() - started) +
        " ms",
    );
  });

  console.log(
    "Wrote " +
      wanted.length +
      " sounds to " +
      path.relative(process.cwd(), out),
  );
}

main();
