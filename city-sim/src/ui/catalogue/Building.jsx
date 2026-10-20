/**
 * One building of the catalogue, by its code in the address: its picture
 * and its name, back to the catalogue or built.
 */
import { useParams } from "react-router";
import Data from "isometrica/data/buildings";
import { Icon, Screen } from "../kit";
import { build, goCatalogue } from "../session";
import { displayName } from "./buildings";
import Preview from "./Preview";

export default function Building() {
  var code = useParams().code,
    data = Data[code];

  return (
    <Screen
      title={data ? displayName(data) : "No such building"}
      onClose={goCatalogue}
      className="p-5"
    >
      {data && (
        <div className="flex flex-wrap gap-6">
          <div className="w-full max-w-xs">
            <Preview code={code} />
          </div>
          <div className="flex min-w-60 flex-1 flex-col gap-4">
            <p className="font-semibold text-muted">
              {"This is a " + data.name + "! Deal with that!"}
            </p>
            <div className="mt-auto flex gap-2">
              <button type="button" className="btn" onClick={goCatalogue}>
                <Icon name="back" size={20} strokeWidth={2} />
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={function () {
                  build(code);
                }}
              >
                <Icon name="build" size={20} strokeWidth={2} />
                Build it
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  );
}
