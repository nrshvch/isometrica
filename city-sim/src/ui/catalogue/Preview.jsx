/**
 * The picture of a building as it is painted - every one of them is put
 * together out of parts (isometrica client/compoundbuilding preview) - in a
 * square of evening sky, filled out as far as it goes.
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
    <div className="relative aspect-square overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_60%,#3a5878_0%,#1a2638_75%)]">
      {url ? (
        <div
          className="pixelated absolute inset-[6%] bg-contain bg-center bg-no-repeat drop-shadow-[0_6px_6px_rgba(0,0,0,0.45)]"
          style={{ backgroundImage: "url('" + url + "')" }}
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-white/5" />
      )}
    </div>
  );
}
