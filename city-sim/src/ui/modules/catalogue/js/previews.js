import Data from "isometrica/data/buildings";
import CompoundBuilding from "isometrica/client/compoundbuilding";

/**
 * Draws the picture of every building in el as it is painted - every one of
 * them is put together out of parts - and puts it on its card (see
 * client/compoundbuilding preview).
 *
 * @param el {Element} what the cards are in
 */
export default function showPreviews(el) {
  var sprites = window.vkaria && window.vkaria.sprites;

  if (!sprites || !sprites.generator) return;

  Array.prototype.forEach.call(
    el.querySelectorAll("[data-preview]"),
    function (img) {
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
