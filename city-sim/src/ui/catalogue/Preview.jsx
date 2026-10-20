/**
 * The picture of a building as it is painted - every one of them is put
 * together out of parts (isometrica client/compoundbuilding preview) - in a
 * square of sky, the card's, filled out as far as it goes.
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
    <div className="relative aspect-square overflow-hidden rounded-[2px] bg-[radial-gradient(circle_at_50%_60%,var(--card)_0%,var(--inset)_80%)]">
      {url ? (
        <div
          className="pixelated absolute inset-[6%] bg-contain bg-center bg-no-repeat drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]"
          style={{ backgroundImage: "url('" + url + "')" }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-card/40" />
      )}
    </div>
  );
}
