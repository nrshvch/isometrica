/**
 * How many times anything standing in the world has been given a new look
 * since the page came up - a tile shaped or taken away, a tree planted or
 * gone, a building or a road drawn again or let go of (each calls changed)
 * - for what keeps the world ready to be seen from its other sides to know
 * when there is anything new to look at (client/preloader). The cars, which
 * come and go all the while, are not counted.
 */
var looks = { changes: 0 };

export function changed() {
  looks.changes++;
}

export default looks;
