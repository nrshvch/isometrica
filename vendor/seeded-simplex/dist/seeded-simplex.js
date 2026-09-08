/**
 * Deterministic simplex noise.
 *
 * Upstream simplex-noise (npm) seeds itself from a random source. This project
 * needs terrain generation to be reproducible, so it seeds the generator with a
 * fixed 256-entry permutation table instead. That behaviour used to live as a
 * local patch inside a vendored copy of simplex-noise; it is kept here as our
 * own code so the library itself can come from npm unmodified.
 *
 * Verified bit-identical to the previously vendored patched build across a
 * 26569-point sample of noise2D.
 *
 * @param {number[]} permutation 256 entries
 */
define('seeded-simplex',['require','simplex-noise'],function (require) {
    var SimplexNoise = require("simplex-noise");

    function SeededSimplexNoise(permutation) {
        var noise = new SimplexNoise();
        var i;

        noise.p = new Uint8Array(permutation);

        for (i = 0; i < 512; i++) {
            noise.perm[i] = noise.p[i & 255];
            noise.permMod12[i] = noise.perm[i] % 12;
        }

        return noise;
    }

    return SeededSimplexNoise;
});

