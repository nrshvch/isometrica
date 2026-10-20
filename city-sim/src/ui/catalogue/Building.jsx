/**
 * One building of the catalogue, by its code in the address: its picture
 * and its name, back to the catalogue or built.
 */
import { useParams } from "react-router";
import Data from "isometrica/data/buildings";
import { Screen } from "../kit";
import { build, goCatalogue } from "../session";
import { displayName } from "./buildings";
import Preview from "./Preview";

export default function Building() {
  var code = useParams().code,
    data = Data[code];

  if (!data)
    return (
      <Screen
        buttons={[{ icon: "back-icon", text: "Return", onClick: goCatalogue }]}
      />
    );

  return (
    <Screen
      className="p-3"
      buttons={[
        { icon: "back-icon", text: "Return", onClick: goCatalogue },
        {
          icon: "bulldozer-icon",
          text: "Build",
          onClick: function () {
            build(code);
          },
        },
      ]}
    >
      <div className="ui-block flex flex-wrap gap-[4%] p-[2%]">
        <div className="w-2/5">
          <Preview code={code} />
        </div>
        <div className="flex-1 leading-[1.4]">
          Name:
          <div>{displayName(data)}</div>
        </div>
        <div className="mt-[2%] w-full">
          {"This is a " + data.name + "! Deal with that!"}
        </div>
      </div>
    </Screen>
  );
}
