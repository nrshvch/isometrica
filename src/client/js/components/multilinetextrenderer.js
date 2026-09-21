import engine from "engine/main";
import * as glMatrix from "gl-matrix";

var position = new Float32Array(3);

/**
 * A TextRenderer that takes several lines. They are stacked upwards from the
 * spot it stands on, the last line lowest, and the spacing and the gap under
 * them are in screen pixels - so they stay apart at any zoom, and anything
 * already written over the same spot (say a "no water") stays readable below.
 */
function MultilineTextRenderer() {
    engine.TextRenderer.call(this);

    this.lines = [];
}

var p = MultilineTextRenderer.prototype = Object.create(engine.TextRenderer.prototype);

p.constructor = MultilineTextRenderer;

//screen pixels from one baseline to the next
p.lineHeight = 18;
//screen pixels between the spot and the bottom of the last line
p.offsetY = 12;

p.render = function (layer, viewportRenderer) {
    glMatrix.vec3.transformMat4(position, this.gameObject.transform.getPosition(position), viewportRenderer.M);

    var lines = this.lines,
        x = position[0],
        y = position[1] - this.offsetY,
        i, line, text, lineY;

    layer.font = this.style;
    layer.textAlign = this.align;
    layer.textBaseline = "bottom";
    layer.lineJoin = "round";
    layer.lineWidth = this.lineWidth || 4;
    layer.strokeStyle = this.strokeStyle;

    for (i = 0; i < lines.length; i++) {
        line = lines[i];
        text = typeof line === "string" ? line : line.text;
        lineY = y - (lines.length - 1 - i) * this.lineHeight;

        if (this.strokeStyle)
            layer.strokeText(text, x, lineY);

        layer.fillStyle = typeof line === "string" ? this.color : line.color;
        layer.fillText(text, x, lineY);
    }
};

export default MultilineTextRenderer;
