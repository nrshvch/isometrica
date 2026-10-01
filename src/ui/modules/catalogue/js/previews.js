import Data from "data/buildings";
import CompoundBuilding from "client/compoundbuilding";

/**
 * Draws the picture of every building in el put together out of parts -
 * which has no picture drawn by hand - as it is painted, and puts it where
 * the hand-drawn one would be (see client/compoundbuilding preview).
 *
 * @param el {Element} what the cards are in
 */
export default function showPreviews(el) {
  var sprites = window.vkaria && window.vkaria.sprites;

  if (!sprites || !sprites.generator) return;

  Array.prototype.forEach.call(
    el.querySelectorAll("[data-preview]"),
    function (img) {
      //empty on the cards of buildings drawn by hand
      var data = Data[img.getAttribute("data-preview")];

      if (!data || !data.compound) return;

      CompoundBuilding.preview(sprites, data.compound).then(
        function (url) {
          img.style.backgroundImage = "url('" + url + "')";
        },
        function (e) {
          console.warn("No picture of " + data.name + ": " + e.message);
        },
      );
    },
  );
}
