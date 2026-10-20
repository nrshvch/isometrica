/**
 * The picture of a building as it is painted - every one of them is put
 * together out of parts (isometrica client/compoundbuilding preview) - on
 * white, square, filled out as far as it goes.
 */
import { useEffect, useState } from "react";
import Data from "isometrica/data/buildings";
import CompoundBuilding from "isometrica/client/compoundbuilding";
import { getClient } from "../session";

export default function Preview({ code }) {
  var [url, setUrl] = useState(null);

  useEffect(
    function () {
      var data = Data[code],
        client = getClient(),
        sprites = client && client.sprites,
        live = true;

      if (!data || !data.compound || !sprites || !sprites.generator) return;

      CompoundBuilding.preview(sprites, data.compound).then(
        function (u) {
          if (live) setUrl(u);
        },
        function (e) {
          console.warn("No picture of " + data.name + ": " + e.message);
        },
      );

      return function () {
        live = false;
      };
    },
    [code],
  );

  return (
    <div className="ui-block-inset relative aspect-square bg-white">
      {url && (
        <div
          className="pixelated absolute inset-[4%] bg-contain bg-center bg-no-repeat"
          style={{ backgroundImage: "url('" + url + "')" }}
        />
      )}
    </div>
  );
}
