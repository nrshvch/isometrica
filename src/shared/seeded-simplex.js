import SimplexNoise from "simplex-noise";

/**
 * Deterministic simplex noise.
 *
 * Upstream simplex-noise (npm) seeds itself from a random source. This project
 * needs terrain generation to be reproducible, so it seeds the generator with a
 * fixed 256-entry permutation table instead.
 *
 * @param {number[]} permutation 256 entries
 */
export default function SeededSimplexNoise(permutation) {
    var noise = new SimplexNoise();

    noise.p = new Uint8Array(permutation);

    for (var i = 0; i < 512; i++) {
        noise.perm[i] = noise.p[i & 255];
        noise.permMod12[i] = noise.perm[i] % 12;
    }

    return noise;
}
