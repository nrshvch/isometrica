/**
 * Writes every piece of music out as <place>-<time>-<weather>.wav.
 *
 * Usage: node tools/genmusic.js [outDir] [rate] [name...]
 * outDir assets/previews/music unless given; name "town/night/rain", "town".
 * See isometrica/.claude/skills/sound/SKILL.md (Testing).
 */

var fs = require("fs");
var path = require("path");
var music = require("../src/shared/gen/music.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/music");

//16-bit PCM, the channels interleaved
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
    rate = +process.argv[3] || music.RATE,
    only = process.argv.slice(4),
    wanted = music.list().filter(function (m) {
      return (
        only.length === 0 ||
        only.some(function (o) {
          return m.name === o || m.name.indexOf(o + "/") === 0;
        })
      );
    });

  fs.mkdirSync(out, { recursive: true });

  wanted.forEach(function (m) {
    var started = Date.now(),
      piece = music.generate(m.name, rate),
      file = path.join(out, m.name.replace(/\//g, "-") + ".wav");

    fs.writeFileSync(file, wav(piece));

    console.log(
      m.name.padEnd(20) +
        (m.bpm + " bpm, " + m.bars + " bars, " + m.lead).padEnd(30) +
        m.seconds.toFixed(0) +
        " s, made in " +
        ((Date.now() - started) / 1000).toFixed(1) +
        " s",
    );
  });

  console.log(
    "Wrote " +
      wanted.length +
      " pieces to " +
      path.relative(process.cwd(), out),
  );
}

main();
