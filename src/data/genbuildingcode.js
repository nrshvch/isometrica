/**
 * Building codes for the blocks of flats that tools/genbuildings.js paints.
 *
 * A generated block's code comes from what the block is - its layout, how many
 * storeys it has and what it is painted in - and not from where it happens to
 * sit in genbuildings.js. Run the generator again with another layout or
 * another palette and every block that was there before keeps its code, so the
 * cities already built out of them keep loading.
 *
 * @exports genBuildingCode
 */

//the handmade codes in data/buildingcode stop well below this
var BASE = 100;

//a layout is worth 100, a storey 10 and a palette 1: room for nine storeys and
//ten palettes of each layout before one layout runs into the next
var LAYOUTS = ["tower", "toweryard", "wall", "wallyard"],
    PALETTES = ["panel", "sand", "slate"];

var NAME = /^apartments-([a-z]+?)(\d+)-([a-z]+)$/;

/**
 * What a generated block is called in genbuildings.js, taken apart: the code
 * it is built under, and the pieces of the name that data/buildings turns into
 * what it costs and how many it houses.
 *
 * @param name {string} as data/genbuildings keys it, apartments-<layout><storeys>-<palette>
 * @returns {{code: number, layout: string, storeys: number, palette: string}}
 */
function genBuildingCode(name) {
    var parts = NAME.exec(name);

    if (!parts)
        throw new Error("generated building '" + name + "' is not named apartments-<layout><storeys>-<palette>");

    var layout = parts[1],
        storeys = parseInt(parts[2], 10),
        palette = parts[3],
        layoutAt = LAYOUTS.indexOf(layout),
        paletteAt = PALETTES.indexOf(palette);

    //a layout or a palette nobody has given a slot to would otherwise land on
    //somebody else's code and quietly take their place
    if (layoutAt < 0)
        throw new Error("generated building '" + name + "' has layout '" + layout + "', which data/genbuildingcode has no slot for");
    if (paletteAt < 0)
        throw new Error("generated building '" + name + "' has palette '" + palette + "', which data/genbuildingcode has no slot for");
    if (storeys < 1 || storeys > 9)
        throw new Error("generated building '" + name + "' has " + storeys + " storeys, which does not fit a code");

    return {
        code: BASE + layoutAt * 100 + storeys * 10 + paletteAt,
        layout: layout,
        storeys: storeys,
        palette: palette
    };
}

export default genBuildingCode;
